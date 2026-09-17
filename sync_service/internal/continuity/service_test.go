package continuity

import (
	"bytes"
	"context"
	"errors"
	"testing"

	"sreva.dev/sync_service/internal/devices"
)

type memoryStore struct {
	devices  map[string]devices.Record
	wrappers map[string]RecoveryWrapper
	deleted  map[string]bool
}

func newMemoryStore() *memoryStore {
	return &memoryStore{
		devices: map[string]devices.Record{
			"dev-trusted": {DeviceID: "dev-trusted", AccountID: "acct-a", State: devices.StateActive},
			"dev-new":     {DeviceID: "dev-new", AccountID: "acct-a", State: devices.StatePending},
			"dev-other":   {DeviceID: "dev-other", AccountID: "acct-b", State: devices.StatePending},
		},
		wrappers: make(map[string]RecoveryWrapper),
		deleted:  make(map[string]bool),
	}
}

func (s *memoryStore) Device(_ context.Context, deviceID string) (devices.Record, error) {
	record, ok := s.devices[deviceID]
	if !ok {
		return devices.Record{}, devices.ErrDeviceNotFound
	}
	return record, nil
}

func (s *memoryStore) ActivateDevice(_ context.Context, accountID, targetDeviceID, approvedByDeviceID string) error {
	target, ok := s.devices[targetDeviceID]
	if !ok {
		return devices.ErrDeviceNotFound
	}
	if target.AccountID != accountID || approvedByDeviceID == "" {
		return errors.New("invalid approval")
	}
	target.State = devices.StateActive
	s.devices[targetDeviceID] = target
	return nil
}

func (s *memoryStore) RevokeDevice(_ context.Context, accountID, targetDeviceID, revokedByDeviceID string) error {
	target, ok := s.devices[targetDeviceID]
	if !ok {
		return devices.ErrDeviceNotFound
	}
	if target.AccountID != accountID || revokedByDeviceID == "" {
		return errors.New("invalid revocation")
	}
	target.State = devices.StateRevoked
	s.devices[targetDeviceID] = target
	return nil
}

func (s *memoryStore) PutRecoveryWrapper(_ context.Context, wrapper RecoveryWrapper) error {
	s.wrappers[wrapper.AccountID+"/"+wrapper.VaultID] = wrapper
	return nil
}

func (s *memoryStore) RecoveryWrapper(_ context.Context, accountID, vaultID string) (RecoveryWrapper, error) {
	wrapper, ok := s.wrappers[accountID+"/"+vaultID]
	if !ok {
		return RecoveryWrapper{}, ErrRecoveryWrapperNotFound
	}
	return wrapper, nil
}

func (s *memoryStore) DeleteAccount(_ context.Context, accountID string) error {
	s.deleted[accountID] = true
	return nil
}

func TestExistingTrustedDeviceApprovesPendingDevice(t *testing.T) {
	store := newMemoryStore()
	service := NewService(store)

	if err := service.ApproveDevice(context.Background(), "acct-a", "dev-trusted", "dev-new"); err != nil {
		t.Fatalf("ApproveDevice: %v", err)
	}

	if got := store.devices["dev-new"].State; got != devices.StateActive {
		t.Fatalf("new device state = %q, want active", got)
	}
}

func TestApprovalRejectsCrossAccountTarget(t *testing.T) {
	service := NewService(newMemoryStore())
	if err := service.ApproveDevice(context.Background(), "acct-a", "dev-trusted", "dev-other"); !errors.Is(err, devices.ErrCrossAccount) {
		t.Fatalf("ApproveDevice error = %v, want cross-account rejection", err)
	}
}

func TestRevokedDeviceCannotAuthorizeFutureSync(t *testing.T) {
	store := newMemoryStore()
	store.devices["dev-new"] = devices.Record{DeviceID: "dev-new", AccountID: "acct-a", State: devices.StateActive}
	service := NewService(store)

	if err := service.RevokeDevice(context.Background(), "acct-a", "dev-trusted", "dev-new"); err != nil {
		t.Fatalf("RevokeDevice: %v", err)
	}

	if err := devices.NewService(store).Authorize(context.Background(), "acct-a", "dev-new"); !errors.Is(err, devices.ErrDeviceRevoked) {
		t.Fatalf("Authorize after revoke = %v, want revoked", err)
	}
}

func TestRecoveryWrapperRoundTripRemainsOpaque(t *testing.T) {
	store := newMemoryStore()
	service := NewService(store)
	wrapper := RecoveryWrapper{
		AccountID:        "acct-a",
		VaultID:          "vault-a",
		KeyEpoch:         2,
		ProtocolVersion:  1,
		SuiteID:          "SREVA-AES256GCM-HKDFSHA256-ED25519-V1",
		KDFSalt:          []byte{1, 2, 3, 4},
		Nonce:            []byte{5, 6, 7, 8},
		CiphertextAndTag: []byte{9, 10, 11, 12, 13},
		EnvelopeDigest:   []byte{14, 15, 16, 17},
	}

	if err := service.SaveRecoveryWrapper(context.Background(), "acct-a", "dev-trusted", wrapper); err != nil {
		t.Fatalf("SaveRecoveryWrapper: %v", err)
	}
	got, err := service.LoadRecoveryWrapper(context.Background(), "acct-a", "vault-a")
	if err != nil {
		t.Fatalf("LoadRecoveryWrapper: %v", err)
	}
	if !bytes.Equal(got.CiphertextAndTag, wrapper.CiphertextAndTag) || !bytes.Equal(got.Nonce, wrapper.Nonce) {
		t.Fatal("opaque recovery wrapper bytes changed")
	}
}

func TestAccountDeletionReceiptDoesNotClaimFormerDeviceErasure(t *testing.T) {
	store := newMemoryStore()
	service := NewService(store)

	receipt, err := service.DeleteAccount(context.Background(), "acct-a")
	if err != nil {
		t.Fatalf("DeleteAccount: %v", err)
	}
	if !store.deleted["acct-a"] || !receipt.ServerStateDeleted {
		t.Fatal("server-side account deletion was not recorded")
	}
	if receipt.FormerDeviceCopiesErased {
		t.Fatal("server deletion must never claim former-device copies were erased")
	}
}
