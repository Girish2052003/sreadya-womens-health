package httpapi

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeStore struct {
	pingErr error
	pings   int
}

func (s *fakeStore) Ping(context.Context) error {
	s.pings++
	return s.pingErr
}

func (s *fakeStore) Close() error { return nil }

func TestHealthzDoesNotDependOnDatabaseReadiness(t *testing.T) {
	store := &fakeStore{pingErr: errors.New("database unavailable")}
	router := NewRouter(store)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if store.pings != 0 {
		t.Fatalf("health endpoint pinged persistence %d times, want 0", store.pings)
	}
	if !strings.Contains(res.Body.String(), `"status":"ok"`) {
		t.Fatalf("unexpected health response: %s", res.Body.String())
	}
}

func TestReadyzIsGreenWhenPersistenceResponds(t *testing.T) {
	store := &fakeStore{}
	router := NewRouter(store)

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body=%s", res.Code, http.StatusOK, res.Body.String())
	}
	if store.pings != 1 {
		t.Fatalf("readiness endpoint pinged persistence %d times, want 1", store.pings)
	}
}

func TestReadyzFailsClosedWhenPersistenceIsUnavailable(t *testing.T) {
	store := &fakeStore{pingErr: errors.New("database unavailable")}
	router := NewRouter(store)

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d; body=%s", res.Code, http.StatusServiceUnavailable, res.Body.String())
	}
	if !strings.Contains(res.Body.String(), `"status":"unavailable"`) {
		t.Fatalf("unexpected readiness response: %s", res.Body.String())
	}
}
