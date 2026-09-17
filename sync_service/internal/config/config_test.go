package config

import "testing"

func TestLoadFromLookupRequiresDatabaseURL(t *testing.T) {
	_, err := LoadFromLookup(func(string) (string, bool) { return "", false })
	if err == nil {
		t.Fatal("expected missing database URL to fail closed")
	}
}

func TestLoadFromLookupUsesProviderIndependentDefaults(t *testing.T) {
	lookup := func(key string) (string, bool) {
		values := map[string]string{
			"SREVA_SYNC_DATABASE_URL": "postgres://sreva:test@db.example/sreva?sslmode=require",
		}
		value, ok := values[key]
		return value, ok
	}

	cfg, err := LoadFromLookup(lookup)
	if err != nil {
		t.Fatalf("LoadFromLookup returned error: %v", err)
	}
	if cfg.ListenAddress != ":8080" {
		t.Fatalf("ListenAddress = %q, want :8080", cfg.ListenAddress)
	}
	if cfg.DatabaseURL != "postgres://sreva:test@db.example/sreva?sslmode=require" {
		t.Fatalf("DatabaseURL = %q", cfg.DatabaseURL)
	}
	if cfg.PostgreSQLTarget != "18.6" {
		t.Fatalf("PostgreSQLTarget = %q, want 18.6", cfg.PostgreSQLTarget)
	}
}

func TestLoadFromLookupAllowsExplicitListenAddress(t *testing.T) {
	lookup := func(key string) (string, bool) {
		values := map[string]string{
			"SREVA_SYNC_DATABASE_URL": "postgres://localhost/sreva",
			"SREVA_SYNC_LISTEN_ADDR":   "127.0.0.1:9090",
		}
		value, ok := values[key]
		return value, ok
	}

	cfg, err := LoadFromLookup(lookup)
	if err != nil {
		t.Fatalf("LoadFromLookup returned error: %v", err)
	}
	if cfg.ListenAddress != "127.0.0.1:9090" {
		t.Fatalf("ListenAddress = %q, want explicit value", cfg.ListenAddress)
	}
}
