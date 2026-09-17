package httpapi

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeIdentityAPI struct {
	created                    []IdentityRequest
	registrationAccount        string
	loginCalls                 int
	registrationFinishSessions []string
	registrationFinishBodies   []string
	loginFinishSessions        []string
	loginFinishBodies          []string
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

func (f *fakeIdentityAPI) FinishPasskeyRegistration(_ context.Context, sessionID string, request *http.Request) error {
	body, _ := io.ReadAll(request.Body)
	f.registrationFinishSessions = append(f.registrationFinishSessions, sessionID)
	f.registrationFinishBodies = append(f.registrationFinishBodies, string(body))
	return nil
}

func (f *fakeIdentityAPI) FinishPasskeyLogin(_ context.Context, sessionID string, request *http.Request) (string, error) {
	body, _ := io.ReadAll(request.Body)
	f.loginFinishSessions = append(f.loginFinishSessions, sessionID)
	f.loginFinishBodies = append(f.loginFinishBodies, string(body))
	return "acct-1", nil
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

func TestPasskeyFinishRoutesKeepSessionOutOfURLAndPreserveAuthenticatorBody(t *testing.T) {
	api := &fakeIdentityAPI{}
	router := NewRouter(nil, WithIdentityAPI(api))
	const sessionHeader = "X-Sreva-Passkey-Session"

	registrationBody := `{"id":"registration-credential","response":{"clientDataJSON":"opaque-registration"}}`
	registration := httptest.NewRequest(http.MethodPost, "/v1/auth/passkeys/register/finish", strings.NewReader(registrationBody))
	registration.Header.Set("Content-Type", "application/json")
	registration.Header.Set(sessionHeader, "registration-session")
	registrationResponse := httptest.NewRecorder()
	router.ServeHTTP(registrationResponse, registration)

	if registrationResponse.Code != http.StatusOK {
		t.Fatalf("registration finish status=%d body=%s", registrationResponse.Code, registrationResponse.Body.String())
	}
	if len(api.registrationFinishSessions) != 1 || api.registrationFinishSessions[0] != "registration-session" {
		t.Fatalf("registration finish sessions = %#v", api.registrationFinishSessions)
	}
	if len(api.registrationFinishBodies) != 1 || api.registrationFinishBodies[0] != registrationBody {
		t.Fatalf("registration authenticator body changed: %#v", api.registrationFinishBodies)
	}
	if strings.Contains(registration.URL.String(), "registration-session") {
		t.Fatalf("registration ceremony session leaked into URL: %s", registration.URL.String())
	}

	loginBody := `{"id":"login-credential","response":{"clientDataJSON":"opaque-login"}}`
	login := httptest.NewRequest(http.MethodPost, "/v1/auth/passkeys/login/finish", strings.NewReader(loginBody))
	login.Header.Set("Content-Type", "application/json")
	login.Header.Set(sessionHeader, "login-session")
	loginResponse := httptest.NewRecorder()
	router.ServeHTTP(loginResponse, login)

	if loginResponse.Code != http.StatusOK {
		t.Fatalf("login finish status=%d body=%s", loginResponse.Code, loginResponse.Body.String())
	}
	if len(api.loginFinishSessions) != 1 || api.loginFinishSessions[0] != "login-session" {
		t.Fatalf("login finish sessions = %#v", api.loginFinishSessions)
	}
	if len(api.loginFinishBodies) != 1 || api.loginFinishBodies[0] != loginBody {
		t.Fatalf("login authenticator body changed: %#v", api.loginFinishBodies)
	}
	if !strings.Contains(loginResponse.Body.String(), `"account_id":"acct-1"`) {
		t.Fatalf("login finish response missing authenticated account: %s", loginResponse.Body.String())
	}
	if strings.Contains(login.URL.String(), "login-session") {
		t.Fatalf("login ceremony session leaked into URL: %s", login.URL.String())
	}
}

func TestPasskeyFinishRoutesRejectMissingSessionHeader(t *testing.T) {
	api := &fakeIdentityAPI{}
	router := NewRouter(nil, WithIdentityAPI(api))

	request := httptest.NewRequest(http.MethodPost, "/v1/auth/passkeys/register/finish", strings.NewReader(`{}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status=%d, want %d; body=%s", response.Code, http.StatusBadRequest, response.Body.String())
	}
	if len(api.registrationFinishSessions) != 0 {
		t.Fatalf("finish API called without session header: %#v", api.registrationFinishSessions)
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
