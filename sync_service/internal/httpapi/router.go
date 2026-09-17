// Package httpapi owns the service HTTP boundary.
package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"sreva.dev/sync_service/internal/store"
)

// NewRouter constructs the provider-independent HTTP surface for the service
// scaffold. Liveness is independent of persistence; readiness is not.
func NewRouter(persistence store.Store) http.Handler {
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

	return router
}

func writeStatus(w http.ResponseWriter, code int, status string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": status})
}
