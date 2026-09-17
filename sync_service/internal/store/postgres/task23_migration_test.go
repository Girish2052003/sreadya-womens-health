package postgres

import (
	"os"
	"strings"
	"testing"
)

func TestTask23ContinuityMigrationKeepsRecoveryOpaque(t *testing.T) {
	raw, err := os.ReadFile("../../../migrations/006_trusted_device_recovery.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(raw))

	for _, required := range []string{
		"alter table devices",
		"approved_by_device_id",
		"approved_at",
		"create table recovery_wrappers",
		"account_id",
		"vault_id",
		"key_epoch",
		"protocol_version",
		"suite_id",
		"kdf_salt",
		"nonce",
		"ciphertext_and_tag",
		"envelope_digest",
		"on delete cascade",
	} {
		if !strings.Contains(sql, required) {
			t.Fatalf("migration missing %q", required)
		}
	}

	for _, forbidden := range []string{
		"health",
		"period",
		"symptom",
		"vault_root_secret",
		"recovery_secret",
		"plaintext",
	} {
		if strings.Contains(sql, forbidden) {
			t.Fatalf("migration contains forbidden readable semantic %q", forbidden)
		}
	}
}
