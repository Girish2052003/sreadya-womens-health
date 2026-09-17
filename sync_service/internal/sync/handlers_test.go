package sync

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type fakeSessionResolver struct {
	session Session
	err     error
}

func (f fakeSessionResolver) Resolve(_ *http.Request) (Session, error) {
	return f.session, f.err
}

type fakeSyncAPI struct {
	pushEnvelope Envelope
	pushSession  Session
	pushAck      Ack
	pushErr      error

	pullSession Session
	pullVault   string
	pullCursor  string
	pullLimit   int
	pullPage    PullPage
	pullErr     error
}

func (f *fakeSyncAPI) Push(_ context.Context, session Session, envelope Envelope) (Ack, error) {
	f.pushSession = session
	f.pushEnvelope = envelope
	return f.pushAck, f.pushErr
}

func (f *fakeSyncAPI) Pull(_ context.Context, session Session, vaultID, cursor string, limit int) (PullPage, error) {
	f.pullSession = session
	f.pullVault = vaultID
	f.pullCursor = cursor
	f.pullLimit = limit
	return f.pullPage, f.pullErr
}

func TestPushHandlerAcceptsOpaqueEnvelopeFromBodyOnly(t *testing.T) {
	api := &fakeSyncAPI{pushAck: Ack{EventID: "evt-1", CommittedRevision: 7}}
	handler := newSignedTestHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	ciphertext := []byte("opaque-health-ciphertext")
	digest := bytes.Repeat([]byte{0x33}, 32)
	createdAt := "2026-09-17T01:42:00Z"
	body := `{"account_id":"acct-a","vault_id":"vault-a","event_id":"evt-1","object_id":"obj-1","source_device_id":"dev-a","key_epoch":1,"protocol_version":1,"suite_id":"SREVA-E2EE-V1-ED25519","schema_id":"opaque-schema-v1","base_revision":6,"operation":"upsert","kdf_salt":"` + base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x11}, 32)) + `","nonce":"` + base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x22}, 12)) + `","ciphertext_and_tag":"` + base64.StdEncoding.EncodeToString(ciphertext) + `","envelope_digest":"` + base64.StdEncoding.EncodeToString(digest) + `","created_at":"` + createdAt + `"}`

	request := httptest.NewRequest(http.MethodPost, "/v1/sync/push", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	signedTestHeaders(request)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if api.pushSession.AccountID != "acct-a" || api.pushSession.DeviceID != "dev-a" {
		t.Fatalf("resolved session = %+v", api.pushSession)
	}
	if api.pushEnvelope.EventID != "evt-1" || !bytes.Equal(api.pushEnvelope.CiphertextAndTag, ciphertext) || !bytes.Equal(api.pushEnvelope.EnvelopeDigest, digest) {
		t.Fatalf("opaque envelope changed at HTTP boundary: %+v", api.pushEnvelope)
	}
	wantCreatedAt, err := time.Parse(time.RFC3339, createdAt)
	if err != nil {
		t.Fatal(err)
	}
	if !api.pushEnvelope.CreatedAt.Equal(wantCreatedAt) {
		t.Fatalf("created_at=%s want=%s", api.pushEnvelope.CreatedAt, wantCreatedAt)
	}
	if !strings.Contains(response.Body.String(), `"committed_revision":7`) {
		t.Fatalf("ack body=%s", response.Body.String())
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control=%q, want no-store", response.Header().Get("Cache-Control"))
	}
}

func TestPushHandlerDoesNotReflectCiphertextOnAuthorizationFailure(t *testing.T) {
	api := &fakeSyncAPI{pushErr: ErrCrossAccount}
	handler := newSignedTestHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	secretCiphertext := "DO_NOT_REFLECT_THIS_CIPHERTEXT"
	body := `{"account_id":"acct-b","vault_id":"vault-b","event_id":"evt-1","object_id":"obj-1","source_device_id":"dev-a","ciphertext_and_tag":"` + base64.StdEncoding.EncodeToString([]byte(secretCiphertext)) + `"}`

	request := httptest.NewRequest(http.MethodPost, "/v1/sync/push", strings.NewReader(body))
	signedTestHeaders(request)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if strings.Contains(response.Body.String(), secretCiphertext) || strings.Contains(response.Body.String(), base64.StdEncoding.EncodeToString([]byte(secretCiphertext))) {
		t.Fatalf("error reflected ciphertext: %s", response.Body.String())
	}
}

func TestPullHandlerPassesOpaqueCursorAndReturnsNextCursorNoStore(t *testing.T) {
	api := &fakeSyncAPI{pullPage: PullPage{
		Events: []StoredEvent{{
			Envelope: Envelope{VaultID: "vault-a", EventID: "evt-8", ObjectID: "obj-1", CiphertextAndTag: []byte("opaque-8")},
			CommittedRevision: 8,
			Conflict:          true,
		}},
		NextCursor: "opaque-cursor-8",
	}}
	handler := newSignedTestHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	request := httptest.NewRequest(http.MethodGet, "/v1/sync/pull?vault_id=vault-a&cursor=opaque-cursor-7&limit=25", nil)
	signedTestHeaders(request)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if api.pullVault != "vault-a" || api.pullCursor != "opaque-cursor-7" || api.pullLimit != 25 {
		t.Fatalf("pull args vault=%q cursor=%q limit=%d", api.pullVault, api.pullCursor, api.pullLimit)
	}
	body := response.Body.String()
	if !strings.Contains(body, `"event_id":"evt-8"`) || !strings.Contains(body, `"committed_revision":8`) || !strings.Contains(body, base64.StdEncoding.EncodeToString([]byte("opaque-8"))) {
		t.Fatalf("opaque pull body=%s", body)
	}
	if !strings.Contains(body, `"next_cursor":"opaque-cursor-8"`) {
		t.Fatalf("next cursor missing from pull body=%s", body)
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control=%q, want no-store", response.Header().Get("Cache-Control"))
	}
}

func TestPullHandlerAllowsEmptyCursorForInitialSync(t *testing.T) {
	api := &fakeSyncAPI{pullPage: PullPage{NextCursor: "opaque-cursor-1"}}
	handler := newSignedTestHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	request := httptest.NewRequest(http.MethodGet, "/v1/sync/pull?vault_id=vault-a&limit=25", nil)
	signedTestHeaders(request)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if api.pullCursor != "" {
		t.Fatalf("initial cursor=%q, want empty", api.pullCursor)
	}
}

func TestPullHandlerRejectsInvalidLimitOrMissingVault(t *testing.T) {
	api := &fakeSyncAPI{}
	handler := newSignedTestHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	for _, path := range []string{
		"/v1/sync/pull?vault_id=vault-a&cursor=opaque-cursor-7&limit=nope",
		"/v1/sync/pull?vault_id=&cursor=opaque-cursor-7&limit=25",
	} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("path=%s status=%d body=%s", path, response.Code, response.Body.String())
		}
	}
}

func TestHandlerRejectsMissingAuthenticatedSession(t *testing.T) {
	api := &fakeSyncAPI{}
	handler := newSignedTestHandler(api, fakeSessionResolver{err: errors.New("no authenticated session")})
	request := httptest.NewRequest(http.MethodGet, "/v1/sync/pull?vault_id=vault-a&limit=25", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}
