package syncservice

import (
	"os"
	"strings"
	"testing"
)

func TestTask20RequiredScaffoldExists(t *testing.T) {
	required := []string{
		"go.sum",
		"cmd/sreva-sync/main.go",
		"internal/httpapi/router.go",
		"internal/config/config.go",
		"internal/store/store.go",
		"internal/store/postgres/postgres.go",
		"migrations/001_identity.sql",
		"migrations/002_devices.sql",
		"migrations/003_ciphertext_sync.sql",
	}
	for _, path := range required {
		if _, err := os.Stat(path); err != nil {
			t.Errorf("required Task-20 scaffold path %q is missing: %v", path, err)
		}
	}
}

func TestTask20DependencyPins(t *testing.T) {
	contents, err := os.ReadFile("go.mod")
	if err != nil {
		t.Fatal(err)
	}
	text := string(contents)
	for _, required := range []string{
		"go 1.27.1",
		"github.com/go-chi/chi/v5 v5.3.2",
		"github.com/jackc/pgx/v5 v5.11.0",
	} {
		if !strings.Contains(text, required) {
			t.Errorf("go.mod is missing frozen pin %q", required)
		}
	}
}

func TestMigrationsContainNoReadableHealthSemantics(t *testing.T) {
	paths := []string{
		"migrations/001_identity.sql",
		"migrations/002_devices.sql",
		"migrations/003_ciphertext_sync.sql",
	}
	forbidden := []string{
		"period_start",
		"period_end",
		"symptom",
		"pregnancy_status",
		"fertility",
		"sexual_activity",
		"flow_level",
		"medication",
		"mood",
		"health_note",
	}
	for _, path := range paths {
		contents, err := os.ReadFile(path)
		if err != nil {
			t.Errorf("cannot inspect %q: %v", path, err)
			continue
		}
		lower := strings.ToLower(string(contents))
		for _, term := range forbidden {
			if strings.Contains(lower, term) {
				t.Errorf("migration %q contains forbidden readable-health semantic %q", path, term)
			}
		}
	}
}
