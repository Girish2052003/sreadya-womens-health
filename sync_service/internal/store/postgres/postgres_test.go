package postgres

import (
	"testing"

	"sreva.dev/sync_service/internal/store"
)

func TestStoreSatisfiesProviderIndependentContract(t *testing.T) {
	var _ store.Store = (*Store)(nil)
}

func TestPostgreSQLCompatibilityTargetMatchesFrozenConfig(t *testing.T) {
	if TargetVersion != "18.6" {
		t.Fatalf("TargetVersion = %q, want 18.6", TargetVersion)
	}
}
