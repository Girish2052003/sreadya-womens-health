package sync

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestTask22PushRejectsSourceDeviceDifferentFromAuthenticatedSigner(t *testing.T) {
	api := &fakeSyncAPI{}
	authz := &fakeSignedDeviceAuth{}
	handler := NewHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}}, authz)
	body := `{"account_id":"acct-a","vault_id":"vault-a","event_id":"evt-1","object_id":"obj-1","source_device_id":"dev-b","ciphertext_and_tag":"` + base64.StdEncoding.EncodeToString([]byte("opaque")) + `"}`
	request := httptest.NewRequest(http.MethodPost, "/v1/sync/push", strings.NewReader(body))
	request.Header.Set("X-Sreva-Device-Challenge", "challenge-push")
	request.Header.Set("X-Sreva-Device-Signature", base64.StdEncoding.EncodeToString([]byte{1, 2, 3}))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if api.pushEnvelope.EventID != "" {
		t.Fatalf("cross-device signed push reached SyncAPI: %+v", api.pushEnvelope)
	}
}
