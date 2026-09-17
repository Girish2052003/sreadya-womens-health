package sync

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPullHandlerMapsInvalidOpaqueCursorToBadRequest(t *testing.T) {
	api := &fakeSyncAPI{pullErr: ErrInvalidCursor}
	handler := newSignedTestHandler(api, fakeSessionResolver{session: Session{AccountID: "acct-a", DeviceID: "dev-a"}})
	request := httptest.NewRequest(http.MethodGet, "/v1/sync/pull?vault_id=vault-a&cursor=malformed&limit=25", nil)
	signedTestHeaders(request)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}
