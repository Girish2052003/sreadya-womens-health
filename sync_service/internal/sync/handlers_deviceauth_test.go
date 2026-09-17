package sync

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

	"sreva.dev/sync_service/internal/deviceauth"
)

type fakeSignedDeviceAuth struct {
	issueScope deviceauth.Scope
	issueTTL   time.Duration
	issueValue string
	issueErr   error

	verifyRequest deviceauth.Request
	verifyErr     error
}

func (f *fakeSignedDeviceAuth) Issue(_ context.Context, scope deviceauth.Scope, ttl time.Duration) (string, error) {
	f.issueScope = scope
	f.issueTTL = ttl
	if f.issueErr != nil {
		return "", f.issueErr
	}
	return f.issueValue, nil
}

func (f *fakeSignedDeviceAuth) Verify(_ context.Context, request deviceauth.Request) error {
	f.verifyRequest = request
	return f.verifyErr
}

func TestTask22ChallengePushUsesAuthenticatedSessionAndExactBodyDigest(t *testing.T) {
	authz := &fakeSignedDeviceAuth{issueValue: "challenge-push"}
	handler := NewHandler(&fakeSyncAPI{}, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}}, authz)
	bodyBytes := []byte(`{"account_id":"client-controlled","ciphertext_and_tag":"opaque"}`)
	digest := sha256.Sum256(bodyBytes)
	requestBody := `{"action":"sync.push","body_sha256":"` + hex.EncodeToString(digest[:]) + `"}`

	request := httptest.NewRequest(http.MethodPost, "/v1/sync/challenge", strings.NewReader(requestBody))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if authz.issueScope.AccountID != "acct-a" || authz.issueScope.DeviceID != "dev-a" {
		t.Fatalf("challenge trusted client identity instead of session: %+v", authz.issueScope)
	}
	if authz.issueScope.Action != "sync.push" || authz.issueScope.Method != http.MethodPost || authz.issueScope.Path != "/v1/sync/push" {
		t.Fatalf("push challenge scope=%+v", authz.issueScope)
	}
	if string(authz.issueScope.BodySHA256) != string(digest[:]) {
		t.Fatalf("push challenge digest=%x want=%x", authz.issueScope.BodySHA256, digest)
	}
	if authz.issueTTL <= 0 {
		t.Fatalf("challenge TTL=%s, want short positive server-controlled TTL", authz.issueTTL)
	}
	if !strings.Contains(response.Body.String(), `"challenge":"challenge-push"`) {
		t.Fatalf("challenge response=%s", response.Body.String())
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control=%q, want no-store", response.Header().Get("Cache-Control"))
	}
}

func TestTask22ChallengePullCanonicalizesOpaqueRequestTarget(t *testing.T) {
	authz := &fakeSignedDeviceAuth{issueValue: "challenge-pull"}
	handler := NewHandler(&fakeSyncAPI{}, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}}, authz)
	requestBody := `{"action":"sync.pull","vault_id":"vault-a","cursor":"v1.AAAAAAAAACo","limit":25}`

	request := httptest.NewRequest(http.MethodPost, "/v1/sync/challenge", strings.NewReader(requestBody))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	emptyDigest := sha256.Sum256(nil)
	if authz.issueScope.Action != "sync.pull" || authz.issueScope.Method != http.MethodGet {
		t.Fatalf("pull challenge scope=%+v", authz.issueScope)
	}
	if authz.issueScope.Path != "/v1/sync/pull?cursor=v1.AAAAAAAAACo&limit=25&vault_id=vault-a" {
		t.Fatalf("canonical pull target=%q", authz.issueScope.Path)
	}
	if string(authz.issueScope.BodySHA256) != string(emptyDigest[:]) {
		t.Fatalf("pull body digest=%x want empty-body SHA-256 %x", authz.issueScope.BodySHA256, emptyDigest)
	}
}

func TestTask22PushVerifiesExactReceivedBytesBeforeCallingSyncAPI(t *testing.T) {
	api := &fakeSyncAPI{pushAck: Ack{EventID: "evt-1", CommittedRevision: 1}}
	authz := &fakeSignedDeviceAuth{}
	handler := NewHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}}, authz)
	body := `{"account_id":"acct-a", "vault_id":"vault-a","event_id":"evt-1","object_id":"obj-1","source_device_id":"dev-a","ciphertext_and_tag":"b3BhcXVl"}`
	signature := []byte{1, 2, 3, 4}

	request := httptest.NewRequest(http.MethodPost, "/v1/sync/push", strings.NewReader(body))
	request.Header.Set("X-Sreva-Device-Challenge", "challenge-push")
	request.Header.Set("X-Sreva-Device-Signature", base64.StdEncoding.EncodeToString(signature))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	digest := sha256.Sum256([]byte(body))
	if authz.verifyRequest.AccountID != "acct-a" || authz.verifyRequest.DeviceID != "dev-a" {
		t.Fatalf("verify identity=%+v", authz.verifyRequest.Scope)
	}
	if authz.verifyRequest.Action != "sync.push" || authz.verifyRequest.Method != http.MethodPost || authz.verifyRequest.Path != "/v1/sync/push" {
		t.Fatalf("verify push scope=%+v", authz.verifyRequest.Scope)
	}
	if string(authz.verifyRequest.BodySHA256) != string(digest[:]) {
		t.Fatalf("verify digest=%x want exact received bytes %x", authz.verifyRequest.BodySHA256, digest)
	}
	if authz.verifyRequest.Challenge != "challenge-push" || string(authz.verifyRequest.Signature) != string(signature) {
		t.Fatalf("verify auth material challenge=%q signature=%x", authz.verifyRequest.Challenge, authz.verifyRequest.Signature)
	}
	if api.pushEnvelope.EventID != "evt-1" {
		t.Fatalf("sync API was not called after successful signed authorization: %+v", api.pushEnvelope)
	}
}

func TestTask22PullVerifiesSameCanonicalTargetAsChallenge(t *testing.T) {
	api := &fakeSyncAPI{pullPage: PullPage{NextCursor: "v1.next"}}
	authz := &fakeSignedDeviceAuth{}
	handler := NewHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}}, authz)
	signature := []byte{5, 6, 7, 8}
	request := httptest.NewRequest(http.MethodGet, "/v1/sync/pull?limit=25&vault_id=vault-a&cursor=v1.AAAAAAAAACo", nil)
	request.Header.Set("X-Sreva-Device-Challenge", "challenge-pull")
	request.Header.Set("X-Sreva-Device-Signature", base64.StdEncoding.EncodeToString(signature))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	emptyDigest := sha256.Sum256(nil)
	if authz.verifyRequest.Action != "sync.pull" || authz.verifyRequest.Method != http.MethodGet {
		t.Fatalf("pull verify scope=%+v", authz.verifyRequest.Scope)
	}
	if authz.verifyRequest.Path != "/v1/sync/pull?cursor=v1.AAAAAAAAACo&limit=25&vault_id=vault-a" {
		t.Fatalf("canonical pull target=%q", authz.verifyRequest.Path)
	}
	if string(authz.verifyRequest.BodySHA256) != string(emptyDigest[:]) {
		t.Fatalf("pull digest=%x want=%x", authz.verifyRequest.BodySHA256, emptyDigest)
	}
	if api.pullVault != "vault-a" || api.pullCursor != "v1.AAAAAAAAACo" || api.pullLimit != 25 {
		t.Fatalf("sync API pull args vault=%q cursor=%q limit=%d", api.pullVault, api.pullCursor, api.pullLimit)
	}
}

func TestTask22SignedAuthorizationFailuresNeverReachSyncAPIOrReflectSecrets(t *testing.T) {
	for _, authErr := range []error{
		deviceauth.ErrChallengeReplay,
		deviceauth.ErrChallengeExpired,
		deviceauth.ErrChallengeScope,
		deviceauth.ErrInvalidSignature,
	} {
		api := &fakeSyncAPI{}
		authz := &fakeSignedDeviceAuth{verifyErr: authErr}
		handler := NewHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}}, authz)
		secret := "SECRET-CIPHERTEXT-MUST-NOT-REFLECT"
		body := `{"account_id":"acct-a","vault_id":"vault-a","event_id":"evt-secret","object_id":"obj-1","source_device_id":"dev-a","ciphertext_and_tag":"` + base64.StdEncoding.EncodeToString([]byte(secret)) + `"}`
		request := httptest.NewRequest(http.MethodPost, "/v1/sync/push", strings.NewReader(body))
		request.Header.Set("X-Sreva-Device-Challenge", "secret-challenge")
		request.Header.Set("X-Sreva-Device-Signature", base64.StdEncoding.EncodeToString([]byte("secret-signature")))
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)

		if response.Code != http.StatusUnauthorized {
			t.Fatalf("authErr=%v status=%d body=%s", authErr, response.Code, response.Body.String())
		}
		if api.pushEnvelope.EventID != "" {
			t.Fatalf("authErr=%v reached SyncAPI with %+v", authErr, api.pushEnvelope)
		}
		for _, forbidden := range []string{secret, base64.StdEncoding.EncodeToString([]byte(secret)), "secret-challenge", "secret-signature"} {
			if strings.Contains(response.Body.String(), forbidden) {
				t.Fatalf("authErr=%v reflected sensitive value %q in %s", authErr, forbidden, response.Body.String())
			}
		}
	}
}

func TestTask22MissingOrMalformedSignedAuthHeadersAreUnauthorized(t *testing.T) {
	for _, signature := range []string{"", "not-base64!"} {
		api := &fakeSyncAPI{}
		authz := &fakeSignedDeviceAuth{}
		handler := NewHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}}, authz)
		request := httptest.NewRequest(http.MethodGet, "/v1/sync/pull?vault_id=vault-a&limit=25", nil)
		request.Header.Set("X-Sreva-Device-Challenge", "challenge-pull")
		if signature != "" {
			request.Header.Set("X-Sreva-Device-Signature", signature)
		}
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusUnauthorized {
			t.Fatalf("signature=%q status=%d body=%s", signature, response.Code, response.Body.String())
		}
		if api.pullVault != "" {
			t.Fatalf("malformed authorization reached SyncAPI: vault=%q", api.pullVault)
		}
	}
}

func TestTask22ChallengeRejectsMalformedDigestAndUnknownAction(t *testing.T) {
	for _, body := range []string{
		`{"action":"sync.push","body_sha256":"not-a-sha256"}`,
		`{"action":"unknown"}`,
	} {
		authz := &fakeSignedDeviceAuth{issueValue: "must-not-issue"}
		handler := NewHandler(&fakeSyncAPI{}, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}}, authz)
		request := httptest.NewRequest(http.MethodPost, "/v1/sync/challenge", strings.NewReader(body))
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("body=%s status=%d response=%s", body, response.Code, response.Body.String())
		}
		if authz.issueScope.Action != "" {
			t.Fatalf("malformed challenge request unexpectedly issued scope=%+v", authz.issueScope)
		}
	}
}

func TestTask22ChallengeIssueFailureIsGenericAndNoStore(t *testing.T) {
	authz := &fakeSignedDeviceAuth{issueErr: errors.New("database detail must stay private")}
	handler := NewHandler(&fakeSyncAPI{}, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}}, authz)
	digest := sha256.Sum256([]byte("opaque"))
	body := `{"action":"sync.push","body_sha256":"` + hex.EncodeToString(digest[:]) + `"}`
	request := httptest.NewRequest(http.MethodPost, "/v1/sync/challenge", strings.NewReader(body))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusInternalServerError || strings.Contains(response.Body.String(), "database detail") {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control=%q, want no-store", response.Header().Get("Cache-Control"))
	}
}
