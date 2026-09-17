package httpapi

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type IdentityRequest struct {
	AccountID string `json:"account_id"`
	Email     string `json:"email,omitempty"`
	Phone     string `json:"phone,omitempty"`
}

type PasskeyBeginResult struct {
	SessionID string `json:"session_id"`
	PublicKey any    `json:"public_key"`
}

type DeviceSummary struct {
	DeviceID  string `json:"device_id"`
	AccountID string `json:"account_id"`
	State     string `json:"state"`
}

// IdentityAPI is the HTTP-facing account/passkey boundary. It intentionally
// exposes account identity and device metadata only, never health plaintext or
// vault-root secrets.
type IdentityAPI interface {
	CreateIdentity(context.Context, IdentityRequest) error
	BeginPasskeyRegistration(context.Context, string) (PasskeyBeginResult, error)
	BeginPasskeyLogin(context.Context) (PasskeyBeginResult, error)
	ListDevices(context.Context, string) ([]DeviceSummary, error)
}

type routerConfig struct {
	identity IdentityAPI
}

type RouterOption func(*routerConfig)

func WithIdentityAPI(api IdentityAPI) RouterOption {
	return func(cfg *routerConfig) { cfg.identity = api }
}

func registerIdentityRoutes(router chi.Router, api IdentityAPI) {
	router.Post("/v1/accounts/identity", func(w http.ResponseWriter, r *http.Request) {
		var request IdentityRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		if err := api.CreateIdentity(r.Context(), request); err != nil {
			writeStatus(w, http.StatusBadRequest, "identity_rejected")
			return
		}
		writeStatus(w, http.StatusAccepted, "accepted")
	})

	router.Post("/v1/auth/passkeys/register/begin", func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			AccountID string `json:"account_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.AccountID == "" {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		result, err := api.BeginPasskeyRegistration(r.Context(), request.AccountID)
		if err != nil {
			writeStatus(w, http.StatusBadRequest, "passkey_registration_unavailable")
			return
		}
		writeJSON(w, http.StatusOK, result)
	})

	router.Post("/v1/auth/passkeys/login/begin", func(w http.ResponseWriter, r *http.Request) {
		result, err := api.BeginPasskeyLogin(r.Context())
		if err != nil {
			writeStatus(w, http.StatusBadRequest, "passkey_login_unavailable")
			return
		}
		writeJSON(w, http.StatusOK, result)
	})

	router.Get("/v1/accounts/{accountID}/devices", func(w http.ResponseWriter, r *http.Request) {
		accountID := chi.URLParam(r, "accountID")
		if accountID == "" {
			writeStatus(w, http.StatusBadRequest, "invalid_account")
			return
		}
		devices, err := api.ListDevices(r.Context(), accountID)
		if err != nil {
			writeStatus(w, http.StatusBadRequest, "device_lookup_failed")
			return
		}
		writeJSON(w, http.StatusOK, devices)
	})
}

func writeJSON(w http.ResponseWriter, code int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(value)
}
