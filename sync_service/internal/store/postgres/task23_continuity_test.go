package postgres

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"

	"sreva.dev/sync_service/internal/continuity"
)

func TestTask23StoreImplementsContinuityBoundary(t *testing.T) {
	var _ continuity.Store = (*Store)(nil)
}

func TestTask23ActivateDeviceRecordsApproverAndPendingTransition(t *testing.T) {
	var updateSQL string
	var updateArgs []any
	tx := &fakeTransaction{}
	tx.exec = func(_ context.Context, sql string, args ...any) error {
		updateSQL = sql
		updateArgs = append([]any(nil), args...)
		return nil
	}
	tx.queryRow = func(context.Context, string, ...any) rowScanner {
		return fakeRow(func(...any) error { return nil })
	}
	store := &Store{db: fakeDatabase{begin: func(context.Context) (transaction, error) { return tx, nil }}}

	if err := store.ActivateDevice(context.Background(), "acct-a", "dev-new", "dev-trusted"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(updateSQL, "state = 'active'") || !strings.Contains(updateSQL, "approved_by_device_id") || !strings.Contains(updateSQL, "state = 'pending'") {
		t.Fatalf("activation query does not bind pending approval provenance: %q", updateSQL)
	}
	if len(updateArgs) != 3 || updateArgs[0] != "dev-new" || updateArgs[1] != "acct-a" || updateArgs[2] != "dev-trusted" {
		t.Fatalf("activation args=%v", updateArgs)
	}
	if tx.commitCalls != 1 {
		t.Fatalf("activation commits=%d, want 1", tx.commitCalls)
	}
}

func TestTask23RevokeDeviceRecordsRevocationAndAccountBoundary(t *testing.T) {
	var updateSQL string
	var updateArgs []any
	tx := &fakeTransaction{}
	tx.exec = func(_ context.Context, sql string, args ...any) error {
		updateSQL = sql
		updateArgs = append([]any(nil), args...)
		return nil
	}
	tx.queryRow = func(context.Context, string, ...any) rowScanner {
		return fakeRow(func(...any) error { return nil })
	}
	store := &Store{db: fakeDatabase{begin: func(context.Context) (transaction, error) { return tx, nil }}}

	if err := store.RevokeDevice(context.Background(), "acct-a", "dev-target", "dev-trusted"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(updateSQL, "state = 'revoked'") || !strings.Contains(updateSQL, "revoked_at") || !strings.Contains(updateSQL, "account_id = $2") {
		t.Fatalf("revocation query is not account-scoped: %q", updateSQL)
	}
	if len(updateArgs) != 3 || updateArgs[0] != "dev-target" || updateArgs[1] != "acct-a" || updateArgs[2] != "dev-trusted" {
		t.Fatalf("revocation args=%v", updateArgs)
	}
}

func TestTask23RecoveryWrapperUpsertContainsOnlyOpaqueContinuityFields(t *testing.T) {
	wrapper := continuity.RecoveryWrapper{
		AccountID:        "acct-a",
		VaultID:          "vault-a",
		KeyEpoch:         3,
		ProtocolVersion:  1,
		SuiteID:          "SREVA-AES256GCM-HKDFSHA256-ED25519-V1",
		KDFSalt:          []byte{1, 2, 3},
		Nonce:            []byte{4, 5, 6},
		CiphertextAndTag: []byte{7, 8, 9},
		EnvelopeDigest:   []byte{10, 11, 12},
	}
	var sqlText string
	var args []any
	tx := &fakeTransaction{}
	tx.exec = func(_ context.Context, sql string, values ...any) error {
		sqlText = sql
		args = append([]any(nil), values...)
		return nil
	}
	store := &Store{db: fakeDatabase{begin: func(context.Context) (transaction, error) { return tx, nil }}}

	if err := store.PutRecoveryWrapper(context.Background(), wrapper); err != nil {
		t.Fatal(err)
	}
	lower := strings.ToLower(sqlText)
	if !strings.Contains(lower, "insert into recovery_wrappers") || !strings.Contains(lower, "on conflict") {
		t.Fatalf("wrapper persistence is not an upsert: %q", sqlText)
	}
	for _, forbidden := range []string{"health", "period", "symptom", "vault_root_secret", "recovery_secret", "plaintext"} {
		if strings.Contains(lower, forbidden) {
			t.Fatalf("wrapper SQL exposes forbidden semantic %q: %q", forbidden, sqlText)
		}
	}
	if len(args) != 9 || !bytes.Equal(args[7].([]byte), wrapper.CiphertextAndTag) {
		t.Fatalf("wrapper args=%v", args)
	}
}

func TestTask23RecoveryWrapperReadMapsNoRowsAndPreservesBytes(t *testing.T) {
	ciphertext := []byte{1, 3, 3, 7}
	store := &Store{db: fakeDatabase{
		queryRow: func(_ context.Context, sql string, args ...any) rowScanner {
			if !strings.Contains(sql, "FROM recovery_wrappers") || len(args) != 2 || args[0] != "acct-a" || args[1] != "vault-a" {
				t.Fatalf("unexpected recovery query sql=%q args=%v", sql, args)
			}
			return fakeRow(func(dest ...any) error {
				*(dest[0].(*int64)) = 3
				*(dest[1].(*int64)) = 1
				*(dest[2].(*string)) = "suite-v1"
				*(dest[3].(*[]byte)) = []byte{1}
				*(dest[4].(*[]byte)) = []byte{2}
				*(dest[5].(*[]byte)) = append([]byte(nil), ciphertext...)
				*(dest[6].(*[]byte)) = []byte{4}
				return nil
			})
		},
	}}
	got, err := store.RecoveryWrapper(context.Background(), "acct-a", "vault-a")
	if err != nil {
		t.Fatal(err)
	}
	if got.AccountID != "acct-a" || got.VaultID != "vault-a" || !bytes.Equal(got.CiphertextAndTag, ciphertext) {
		t.Fatalf("wrapper changed=%+v", got)
	}

	missing := &Store{db: fakeDatabase{queryRow: func(context.Context, string, ...any) rowScanner {
		return fakeRow(func(...any) error { return pgx.ErrNoRows })
	}}}
	if _, err := missing.RecoveryWrapper(context.Background(), "acct-a", "missing"); !errors.Is(err, continuity.ErrRecoveryWrapperNotFound) {
		t.Fatalf("missing recovery wrapper error=%v", err)
	}
}

func TestTask23DeleteAccountUsesCascadeRootOnly(t *testing.T) {
	var sqlText string
	var args []any
	tx := &fakeTransaction{}
	tx.exec = func(_ context.Context, sql string, values ...any) error {
		sqlText = sql
		args = append([]any(nil), values...)
		return nil
	}
	store := &Store{db: fakeDatabase{begin: func(context.Context) (transaction, error) { return tx, nil }}}

	if err := store.DeleteAccount(context.Background(), "acct-a"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sqlText, "DELETE FROM accounts") || len(args) != 1 || args[0] != "acct-a" {
		t.Fatalf("account delete sql=%q args=%v", sqlText, args)
	}
	if strings.Contains(strings.ToLower(sqlText), "device copy") || strings.Contains(strings.ToLower(sqlText), "remote wipe") {
		t.Fatalf("server delete must not imply remote-device erasure: %q", sqlText)
	}
	if tx.commitCalls != 1 {
		t.Fatalf("delete commits=%d, want 1", tx.commitCalls)
	}
}
