package httpapi

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"sreva.dev/sync_service/internal/continuity"
	"sreva.dev/sync_service/internal/deviceauth"
)

type fakeContinuityAPI struct {
	approvals []struct{ accountID, approverID, targetID string }
	revokes   []struct{ accountID, approverID, targetID string }
	saved     []continuity.RecoveryWrapper
	loaded    []struct{ accountID, vaultID string }
	deleted   []string
	wrapper   continuity.RecoveryWrapper
}

func (f *fakeContinuityAPI) ApproveDevice(_ context.Context, accountID, approverID, targetID string) error {
	f.approvals = append(f.approvals, struct{ accountID, approverID, targetID string }{accountID, approverID, targetID})
	return nil
}

func (f *fakeContinuityAPI) RevokeDevice(_ context.Context, accountID, approverID, targetID string) error {
	f.revokes = append(f.revokes, struct{ accountID, approverID, targetID string }{accountID, approverID, targetID})
	return nil
}

func (f *fakeContinuityAPI) SaveRecoveryWrapper(_ context.Context, accountID, approverID string, wrapper continuity.RecoveryWrapper) error {
	if wrapper.AccountID != accountID {
		return errors.New("account identity changed")
	}
	f.saved = append(f.saved, wrapper)
	return nil
}

func (f *fakeContinuityAPI) LoadRecoveryWrapper(_ context.Context, accountID, vaultID string) (continuity.RecoveryWrapper, error) {
	f.loaded = append(f.loaded, struct{ accountID, vaultID string }{accountID, vaultID})
	return f.wrapper, nil
}

func (f *fakeContinuityAPI) DeleteAccount(_ context.Context, accountID string) (continuity.DeletionReceipt, error) {
	f.deleted = append(f.deleted, accountID)
	return continuity.DeletionReceipt{ServerStateDeleted: true, FormerDeviceCopiesErased: false}, nil
}

type fakeContinuitySessions struct {
	session ContinuitySession
	err     error
}

func (f fakeContinuitySessions) Resolve(*http.Request) (ContinuitySession, error) {
	return f.session, f.err
}

type fakeContinuityAuthorizer struct {
	issued   []deviceauth.Scope
	verified []deviceauth.Request
	issueErr error
	verifyErr error
}

func (f *fakeContinuityAuthorizer) Issue(_ context.Context, scope deviceauth.Scope, _ time.Duration) (string, error) {
	f.issued = append(f.issued, scope)
	if f.issueErr != nil {
		return "", f.issueErr
	}
	return "continuity-challenge", nil
}

func (f *fakeContinuityAuthorizer) Verify(_ context.Context, request deviceauth.Request) error {
	f.verified = append(f.verified, request)
	return f.verifyErr
}

func task23Router(api *fakeContinuityAPI, auth *fakeContinuityAuthorizer) http.Handler {
	return NewRouter(nil,
		WithContinuityAPI(api),
		WithContinuitySessionResolver(fakeContinuitySessions{session: ContinuitySession{AccountID: "acct-a", DeviceID: "dev-trusted"}}),
		WithContinuityDeviceAuthorizer(auth),
	)
}

func TestTask23ChallengeDerivesMutationScopeFromAuthenticatedSession(t *testing.T) {
	emptyDigest := sha256.Sum256(nil)
	bodyDigest := hex.EncodeToString(emptyDigest[:])

	cases := []struct {
		name   string
		body   string
		action string
		method string
		path   string
	}{
		{"approve", `{"action":"device.approve","target_device_id":"dev-new","body_sha256":"` + bodyDigest + `"}`, "device.approve", http.MethodPost, "/v1/devices/dev-new/approve"},
		{"revoke", `{"action":"device.revoke","target_device_id":"dev-old","body_sha256":"` + bodyDigest + `"}`, "device.revoke", http.MethodPost, "/v1/devices/dev-old/revoke"},
		{"recovery", `{"action":"recovery.put","vault_id":"vault-a","body_sha256":"` + bodyDigest + `"}`, "recovery.put", http.MethodPut, "/v1/recovery/vault-a"},
		{"delete", `{"action":"account.delete","body_sha256":"` + bodyDigest + `"}`, "account.delete", http.MethodDelete, "/v1/account"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			auth := &fakeContinuityAuthorizer{}
			router := task23Router(&fakeContinuityAPI{}, auth)
			request := httptest.NewRequest(http.MethodPost, "/v1/continuity/challenge", strings.NewReader(tc.body))
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)

			if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"challenge":"continuity-challenge"`) {
				t.Fatalf("challenge response status=%d body=%s", response.Code, response.Body.String())
			}
			if len(auth.issued) != 1 {
				t.Fatalf("issued scopes=%d, want 1", len(auth.issued))
			}
			scope := auth.issued[0]
			if scope.AccountID != "acct-a" || scope.DeviceID != "dev-trusted" || scope.Action != tc.action || scope.Method != tc.method || scope.Path != tc.path {
				t.Fatalf("issued scope=%+v", scope)
			}
			if string(scope.BodySHA256) != string(emptyDigest[:]) {
				t.Fatalf("challenge body digest changed: %x", scope.BodySHA256)
			}
		})
	}
}

func TestTask23ApproveAndRevokeRequireSignedActiveDeviceRequest(t *testing.T) {
	cases := []struct {
		path   string
		action string
		check  func(*fakeContinuityAPI) int
	}{
		{"/v1/devices/dev-new/approve", "device.approve", func(api *fakeContinuityAPI) int { return len(api.approvals) }},
		{"/v1/devices/dev-old/revoke", "device.revoke", func(api *fakeContinuityAPI) int { return len(api.revokes) }},
	}

	for _, tc := range cases {
		t.Run(tc.action, func(t *testing.T) {
			api := &fakeContinuityAPI{}
			auth := &fakeContinuityAuthorizer{}
			router := task23Router(api, auth)
			request := httptest.NewRequest(http.MethodPost, tc.path, nil)
			request.Header.Set("X-Sreva-Device-Challenge", "challenge-1")
			request.Header.Set("X-Sreva-Device-Signature", base64.StdEncoding.EncodeToString([]byte{1, 2, 3}))
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)

			if response.Code != http.StatusOK {
				t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
			}
			if tc.check(api) != 1 {
				t.Fatalf("continuity API call count=%d, want 1", tc.check(api))
			}
			if len(auth.verified) != 1 {
				t.Fatalf("verified requests=%d, want 1", len(auth.verified))
			}
			verified := auth.verified[0]
			if verified.AccountID != "acct-a" || verified.DeviceID != "dev-trusted" || verified.Action != tc.action || verified.Method != http.MethodPost || verified.Path != tc.path || verified.Challenge != "challenge-1" {
				t.Fatalf("verified request=%+v", verified)
			}
			emptyDigest := sha256.Sum256(nil)
			if string(verified.BodySHA256) != string(emptyDigest[:]) {
				t.Fatalf("verified body digest=%x", verified.BodySHA256)
			}
		})
	}
}

func TestTask23InvalidDeviceSignatureBlocksMutation(t *testing.T) {
	api := &fakeContinuityAPI{}
	auth := &fakeContinuityAuthorizer{verifyErr: deviceauth.ErrInvalidSignature}
	router := task23Router(api, auth)
	request := httptest.NewRequest(http.MethodPost, "/v1/devices/dev-new/approve", nil)
	request.Header.Set("X-Sreva-Device-Challenge", "challenge-1")
	request.Header.Set("X-Sreva-Device-Signature", base64.StdEncoding.EncodeToString([]byte{1, 2, 3}))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d, want 401; body=%s", response.Code, response.Body.String())
	}
	if len(api.approvals) != 0 {
		t.Fatalf("approval executed after failed signature: %#v", api.approvals)
	}
}

func TestTask23RecoveryWrapperPutHashesExactBodyAndReadNeedsOnlyAccountSession(t *testing.T) {
	api := &fakeContinuityAPI{wrapper: continuity.RecoveryWrapper{
		AccountID: "acct-a", VaultID: "vault-a", KeyEpoch: 3, ProtocolVersion: 1,
		SuiteID: "SREVA-AES256GCM-HKDFSHA256-ED25519-V1",
		KDFSalt: []byte{1, 2, 3}, Nonce: []byte{4, 5, 6}, CiphertextAndTag: []byte{7, 8, 9}, EnvelopeDigest: []byte{10, 11, 12},
	}}
	auth := &fakeContinuityAuthorizer{}
	router := task23Router(api, auth)
	body := `{"key_epoch":3,"protocol_version":1,"suite_id":"SREVA-AES256GCM-HKDFSHA256-ED25519-V1","kdf_salt":"AQID","nonce":"BAUG","ciphertext_and_tag":"BwgJ","envelope_digest":"CgsM"}`
	request := httptest.NewRequest(http.MethodPut, "/v1/recovery/vault-a", strings.NewReader(body))
	request.Header.Set("X-Sreva-Device-Challenge", "challenge-1")
	request.Header.Set("X-Sreva-Device-Signature", base64.StdEncoding.EncodeToString([]byte{9, 8, 7}))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("put status=%d body=%s", response.Code, response.Body.String())
	}
	if len(api.saved) != 1 || api.saved[0].AccountID != "acct-a" || api.saved[0].VaultID != "vault-a" || string(api.saved[0].CiphertextAndTag) != string([]byte{7, 8, 9}) {
		t.Fatalf("saved wrapper=%+v", api.saved)
	}
	if len(auth.verified) != 1 {
		t.Fatalf("verified requests=%d, want 1", len(auth.verified))
	}
	digest := sha256.Sum256([]byte(body))
	if auth.verified[0].Action != "recovery.put" || auth.verified[0].Path != "/v1/recovery/vault-a" || string(auth.verified[0].BodySHA256) != string(digest[:]) {
		t.Fatalf("recovery verification=%+v", auth.verified[0])
	}

	get := httptest.NewRequest(http.MethodGet, "/v1/recovery/vault-a", nil)
	getResponse := httptest.NewRecorder()
	router.ServeHTTP(getResponse, get)
	if getResponse.Code != http.StatusOK || !strings.Contains(getResponse.Body.String(), `"ciphertext_and_tag":"BwgJ"`) {
		t.Fatalf("get status=%d body=%s", getResponse.Code, getResponse.Body.String())
	}
	if len(api.loaded) != 1 || api.loaded[0].accountID != "acct-a" || api.loaded[0].vaultID != "vault-a" {
		t.Fatalf("loaded wrapper scopes=%+v", api.loaded)
	}
	if len(auth.verified) != 1 {
		t.Fatalf("recovery read unexpectedly required active-device signature")
	}
}

func TestTask23DeleteAccountReturnsTruthfulServerOnlyReceipt(t *testing.T) {
	api := &fakeContinuityAPI{}
	auth := &fakeContinuityAuthorizer{}
	router := task23Router(api, auth)
	request := httptest.NewRequest(http.MethodDelete, "/v1/account", nil)
	request.Header.Set("X-Sreva-Device-Challenge", "challenge-1")
	request.Header.Set("X-Sreva-Device-Signature", base64.StdEncoding.EncodeToString([]byte{4, 5, 6}))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if len(api.deleted) != 1 || api.deleted[0] != "acct-a" {
		t.Fatalf("deleted accounts=%v", api.deleted)
	}
	body := response.Body.String()
	if !strings.Contains(body, `"server_state_deleted":true`) || !strings.Contains(body, `"former_device_copies_erased":false`) {
		t.Fatalf("deletion receipt overclaims: %s", body)
	}
	if strings.Contains(strings.ToLower(body), "remote wipe") {
		t.Fatalf("deletion receipt implies remote wipe: %s", body)
	}
}

func TestTask23ContinuityRoutesNeverCacheSensitiveResponses(t *testing.T) {
	api := &fakeContinuityAPI{wrapper: continuity.RecoveryWrapper{
		AccountID: "acct-a", VaultID: "vault-a", KeyEpoch: 1, ProtocolVersion: 1, SuiteID: "suite",
		KDFSalt: []byte{1}, Nonce: []byte{2}, CiphertextAndTag: []byte{3}, EnvelopeDigest: []byte{4},
	}}
	router := task23Router(api, &fakeContinuityAuthorizer{})
	request := httptest.NewRequest(http.MethodGet, "/v1/recovery/vault-a", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("cache-control=%q, want no-store", response.Header().Get("Cache-Control"))
	}
}
