package httpapi

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeIdentityAPI struct {
	created             []IdentityRequest
	registrationAccount string
	loginCalls          int
}

func (f *fakeIdentityAPI) CreateIdentity(_ context.Context, request IdentityRequest) error {
	f.created = append(f.created, request)
	return nil
}

func (f *fakeIdentityAPI) BeginPasskeyRegistration(_ context.Context, accountID string) (PasskeyBeginResult, error) {
	f.registrationAccount = accountID
	return PasskeyBeginResult{
		SessionID: "registration-session",
		PublicKey: map[string]any{"challenge": "registration-challenge"},
	}, nil
}

func (f *fakeIdentityAPI) BeginPasskeyLogin(_ context.Context) (PasskeyBeginResult, error) {
	f.loginCalls++
	return PasskeyBeginResult{
		SessionID: "login-session",
		PublicKey: map[string]any{"challenge": "login-challenge"},
	}, nil
}

func (f *fakeIdentityAPI) ListDevices(_ context.Context, accountID string) ([]DeviceSummary, error) {
	return []DeviceSummary{{DeviceID: "device-1", AccountID: accountID, State: "active"}}, nil
}

func TestIdentityRouteAcceptsAccountIdentityBoundary(t *testing.T) {
	api := &fakeIdentityAPI{}
	router := NewRouter(nil, WithIdentityAPI(api))
	request := httptest.NewRequest(http.MethodPost, "/v1/accounts/identity", strings.NewReader(`{"account_id":"acct-1","email":"wife@example.com"}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want %d; body=%s", response.Code, http.StatusAccepted, response.Body.String())
	}
	if len(api.created) != 1 || api.created[0].AccountID != "acct-1" || api.created[0].Email != "wife@example.com" {
		t.Fatalf("created identities = %#v", api.created)
	}
}

func TestPasskeyBeginRoutesExposeOpaqueSessionIDs(t *testing.T) {
	api := &fakeIdentityAPI{}
	router := NewRouter(nil, WithIdentityAPI(api))

	registration := httptest.NewRequest(http.MethodPost, "/v1/auth/passkeys/register/begin", strings.NewReader(`{"account_id":"acct-1"}`))
	registration.Header.Set("Content-Type", "application/json")
	registrationResponse := httptest.NewRecorder()
	router.ServeHTTP(registrationResponse, registration)
	if registrationResponse.Code != http.StatusOK || !strings.Contains(registrationResponse.Body.String(), `"session_id":"registration-session"`) {
		t.Fatalf("registration response: status=%d body=%s", registrationResponse.Code, registrationResponse.Body.String())
	}
	if api.registrationAccount != "acct-1" {
		t.Fatalf("registration account = %q, want acct-1", api.registrationAccount)
	}

	login := httptest.NewRequest(http.MethodPost, "/v1/auth/passkeys/login/begin", nil)
	loginResponse := httptest.NewRecorder()
	router.ServeHTTP(loginResponse, login)
	if loginResponse.Code != http.StatusOK || !strings.Contains(loginResponse.Body.String(), `"session_id":"login-session"`) {
		t.Fatalf("login response: status=%d body=%s", loginResponse.Code, loginResponse.Body.String())
	}
	if api.loginCalls != 1 {
		t.Fatalf("login calls = %d, want 1", api.loginCalls)
	}
}

func TestDeviceRouteReturnsAccountScopedDeviceSummaries(t *testing.T) {
	api := &fakeIdentityAPI{}
	router := NewRouter(nil, WithIdentityAPI(api))
	request := httptest.NewRequest(http.MethodGet, "/v1/accounts/acct-1/devices", nil)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", response.Code, response.Body.String())
	}
	body := response.Body.String()
	if !strings.Contains(body, `"device_id":"device-1"`) || !strings.Contains(body, `"account_id":"acct-1"`) {
		t.Fatalf("unexpected device response body: %s", body)
	}
}
