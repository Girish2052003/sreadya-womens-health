package syncservice

import (
	"os"
	"strings"
	"testing"
)

var forbiddenReadableHealthSemantics = []string{
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
	assertNoReadableHealthSemantics(t, text, "sync cursor migration")
}

func TestTask22DeviceChallengeMigrationIsDurableOneUseAndOpaque(t *testing.T) {
	const path = "migrations/005_device_challenges.sql"
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("Task-22 device challenge migration %q is missing: %v", path, err)
	}
	text := strings.ToLower(string(contents))
	for _, required := range []string{
		"create table device_challenges",
		"challenge_value",
		"account_id",
		"device_id",
		"action",
		"method",
		"path",
		"body_sha256",
		"octet_length(body_sha256) = 32",
		"expires_at",
		"consumed_at",
	} {
		if !strings.Contains(text, required) {
			t.Errorf("Task-22 device challenge migration is missing %q", required)
		}
	}
	assertNoReadableHealthSemantics(t, text, "device challenge migration")
}

func assertNoReadableHealthSemantics(t *testing.T, text, label string) {
	t.Helper()
	for _, forbidden := range forbiddenReadableHealthSemantics {
		if strings.Contains(text, forbidden) {
			t.Errorf("Task-22 %s contains forbidden readable-health semantic %q", label, forbidden)
		}
	}
}
