package sync

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPushHandlerDerivesEnvelopeDigestFromExactSignedBody(t *testing.T) {
	api := &fakeSyncAPI{pushAck: Ack{EventID: "evt-digest", CommittedRevision: 1}}
	handler := newSignedTestHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	forgedDigest := bytes.Repeat([]byte{0x7f}, sha256.Size)
	body := `{"account_id":"acct-a","vault_id":"vault-a","event_id":"evt-digest","object_id":"obj-a","source_device_id":"dev-a","key_epoch":1,"protocol_version":1,"suite_id":"SREVA-AES256GCM-HKDFSHA256-ED25519-V1","schema_id":"opaque-schema-v1","base_revision":0,"operation":"upsert","kdf_salt":"` + base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x11}, 32)) + `","nonce":"` + base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x22}, 12)) + `","ciphertext_and_tag":"` + base64.StdEncoding.EncodeToString([]byte("opaque-ciphertext")) + `","envelope_digest":"` + base64.StdEncoding.EncodeToString(forgedDigest) + `"}`
	want := sha256.Sum256([]byte(body))

	request := httptest.NewRequest(http.MethodPost, "/v1/sync/push", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	signedTestHeaders(request)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if bytes.Equal(api.pushEnvelope.EnvelopeDigest, forgedDigest) {
		t.Fatal("handler trusted client-supplied envelope_digest")
	}
	if !bytes.Equal(api.pushEnvelope.EnvelopeDigest, want[:]) {
		t.Fatalf("envelope digest=%x want exact body sha256=%x", api.pushEnvelope.EnvelopeDigest, want)
	}
}
