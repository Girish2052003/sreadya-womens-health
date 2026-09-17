package syncservice

import (
	"os"
	"strings"
	"testing"
)

func TestTask22SyncCursorMigrationExistsAndIsOpaque(t *testing.T) {
	const path = "migrations/004_sync_cursor.sql"
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("Task-22 sync cursor migration %q is missing: %v", path, err)
	}
	text := strings.ToLower(string(contents))
	for _, required := range []string{
		"server_sequence",
		"generated always as identity",
		"vault_id, server_sequence",
	} {
		if !strings.Contains(text, required) {
			t.Errorf("Task-22 sync cursor migration is missing %q", required)
		}
	}

	for _, forbidden := range []string{
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
	} {
		if strings.Contains(text, forbidden) {
			t.Errorf("Task-22 sync cursor migration contains forbidden readable-health semantic %q", forbidden)
		}
	}
}
