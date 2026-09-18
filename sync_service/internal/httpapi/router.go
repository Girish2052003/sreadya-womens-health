// Package httpapi owns the service HTTP boundary.
package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"sreadya.dev/sync_service/internal/store"
)

// NewRouter constructs the provider-independent HTTP surface. Existing Task-20
// liveness/readiness behavior remains available when no options are supplied.
func NewRouter(persistence store.Store, options ...RouterOption) http.Handler {
	cfg := routerConfig{}
	for _, option := range options {
		if option != nil {
			option(&cfg)
		}
	}

	router := chi.NewRouter()

	router.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeStatus(w, http.StatusOK, "ok")
	})

	router.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		if persistence == nil || persistence.Ping(r.Context()) != nil {
			writeStatus(w, http.StatusServiceUnavailable, "unavailable")
			return
		}
		writeStatus(w, http.StatusOK, "ok")
	})

	if cfg.identity != nil {
		registerIdentityRoutes(router, cfg.identity)
	}
	if cfg.continuity != nil && cfg.continuitySessions != nil && cfg.continuityDeviceAuth != nil {
		registerContinuityRoutes(router, cfg.continuity, cfg.continuitySessions, cfg.continuityDeviceAuth)
	}

	return router
}

func writeStatus(w http.ResponseWriter, code int, status string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": status})
}
