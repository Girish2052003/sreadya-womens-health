package sync

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
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
	pullAfter   int64
	pullLimit   int
	pullEvents  []StoredEvent
	pullErr     error
}

func (f *fakeSyncAPI) Push(_ context.Context, session Session, envelope Envelope) (Ack, error) {
	f.pushSession = session
	f.pushEnvelope = envelope
	return f.pushAck, f.pushErr
}

func (f *fakeSyncAPI) Pull(_ context.Context, session Session, vaultID string, afterRevision int64, limit int) ([]StoredEvent, error) {
	f.pullSession = session
	f.pullVault = vaultID
	f.pullAfter = afterRevision
	f.pullLimit = limit
	return f.pullEvents, f.pullErr
}

func TestPushHandlerAcceptsOpaqueEnvelopeFromBodyOnly(t *testing.T) {
	api := &fakeSyncAPI{pushAck: Ack{EventID: "evt-1", CommittedRevision: 7}}
	handler := NewHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	ciphertext := []byte("opaque-health-ciphertext")
	digest := bytes.Repeat([]byte{0x33}, 32)
	body := `{"account_id":"acct-a","vault_id":"vault-a","event_id":"evt-1","object_id":"obj-1","source_device_id":"dev-a","key_epoch":1,"protocol_version":1,"suite_id":"SREVA-E2EE-V1-ED25519","schema_id":"opaque-schema-v1","base_revision":6,"operation":"upsert","kdf_salt":"` + base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x11}, 32)) + `","nonce":"` + base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x22}, 12)) + `","ciphertext_and_tag":"` + base64.StdEncoding.EncodeToString(ciphertext) + `","envelope_digest":"` + base64.StdEncoding.EncodeToString(digest) + `"}`

	request := httptest.NewRequest(http.MethodPost, "/v1/sync/push", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
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
	if !strings.Contains(response.Body.String(), `"committed_revision":7`) {
		t.Fatalf("ack body=%s", response.Body.String())
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control=%q, want no-store", response.Header().Get("Cache-Control"))
	}
}

func TestPushHandlerDoesNotReflectCiphertextOnAuthorizationFailure(t *testing.T) {
	api := &fakeSyncAPI{pushErr: ErrCrossAccount}
	handler := NewHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	secretCiphertext := "DO_NOT_REFLECT_THIS_CIPHERTEXT"
	body := `{"account_id":"acct-b","vault_id":"vault-b","event_id":"evt-1","object_id":"obj-1","source_device_id":"dev-a","ciphertext_and_tag":"` + base64.StdEncoding.EncodeToString([]byte(secretCiphertext)) + `"}`

	request := httptest.NewRequest(http.MethodPost, "/v1/sync/push", strings.NewReader(body))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if strings.Contains(response.Body.String(), secretCiphertext) || strings.Contains(response.Body.String(), base64.StdEncoding.EncodeToString([]byte(secretCiphertext))) {
		t.Fatalf("error reflected ciphertext: %s", response.Body.String())
	}
}

func TestPullHandlerUsesOpaqueCursorAndReturnsOpaqueEventsNoStore(t *testing.T) {
	api := &fakeSyncAPI{pullEvents: []StoredEvent{{
		Envelope: Envelope{VaultID: "vault-a", EventID: "evt-8", ObjectID: "obj-1", CiphertextAndTag: []byte("opaque-8")},
		CommittedRevision: 8,
		Conflict:          true,
	}}}
	handler := NewHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	request := httptest.NewRequest(http.MethodGet, "/v1/sync/pull?vault_id=vault-a&after_revision=7&limit=25", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if api.pullVault != "vault-a" || api.pullAfter != 7 || api.pullLimit != 25 {
		t.Fatalf("pull args vault=%q after=%d limit=%d", api.pullVault, api.pullAfter, api.pullLimit)
	}
	body := response.Body.String()
	if !strings.Contains(body, `"event_id":"evt-8"`) || !strings.Contains(body, `"committed_revision":8`) || !strings.Contains(body, base64.StdEncoding.EncodeToString([]byte("opaque-8"))) {
		t.Fatalf("opaque pull body=%s", body)
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control=%q, want no-store", response.Header().Get("Cache-Control"))
	}
}

func TestPullHandlerRejectsNonNumericCursorOrLimit(t *testing.T) {
	api := &fakeSyncAPI{}
	handler := NewHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	for _, path := range []string{
		"/v1/sync/pull?vault_id=vault-a&after_revision=not-a-number&limit=25",
		"/v1/sync/pull?vault_id=vault-a&after_revision=7&limit=nope",
		"/v1/sync/pull?vault_id=&after_revision=7&limit=25",
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
	handler := NewHandler(api, fakeSessionResolver{err: errors.New("no authenticated session")})
	request := httptest.NewRequest(http.MethodGet, "/v1/sync/pull?vault_id=vault-a&after_revision=0&limit="+strconv.Itoa(25), nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}
