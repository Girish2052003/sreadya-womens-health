package devices

import (
	"context"
	"errors"
	"testing"
)

type fakeLookup struct {
	records map[string]Record
}

func (f fakeLookup) Device(_ context.Context, deviceID string) (Record, error) {
	record, ok := f.records[deviceID]
	if !ok {
		return Record{}, ErrDeviceNotFound
	}
	return record, nil
}

func TestServiceAuthorizesOnlyActiveDeviceForAccount(t *testing.T) {
	service := NewService(fakeLookup{records: map[string]Record{
		"dev-active":  {DeviceID: "dev-active", AccountID: "acct-a", State: StateActive},
		"dev-revoked": {DeviceID: "dev-revoked", AccountID: "acct-a", State: StateRevoked},
		"dev-pending": {DeviceID: "dev-pending", AccountID: "acct-a", State: StatePending},
	}})

	if err := service.Authorize(context.Background(), "acct-a", "dev-active"); err != nil {
		t.Fatalf("active same-account device rejected: %v", err)
	}
	if err := service.Authorize(context.Background(), "acct-b", "dev-active"); !errors.Is(err, ErrCrossAccount) {
		t.Fatalf("cross-account authorization error = %v, want ErrCrossAccount", err)
	}
	if err := service.Authorize(context.Background(), "acct-a", "dev-revoked"); !errors.Is(err, ErrDeviceRevoked) {
		t.Fatalf("revoked authorization error = %v, want ErrDeviceRevoked", err)
	}
	if err := service.Authorize(context.Background(), "acct-a", "dev-pending"); !errors.Is(err, ErrDeviceInactive) {
		t.Fatalf("pending authorization error = %v, want ErrDeviceInactive", err)
	}
}

func TestServiceRejectsUnknownDevice(t *testing.T) {
	service := NewService(fakeLookup{records: map[string]Record{}})
	if err := service.Authorize(context.Background(), "acct-a", "missing"); !errors.Is(err, ErrDeviceNotFound) {
		t.Fatalf("unknown-device error = %v, want ErrDeviceNotFound", err)
	}
}
