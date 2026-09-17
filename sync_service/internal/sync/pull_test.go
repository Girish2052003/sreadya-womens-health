package sync

import (
	"context"
	"errors"
	"testing"
)

type fakePullRepository struct {
	*fakeRepository
	events    []StoredEvent
	afterSeen int64
	limitSeen int
}

func (f *fakePullRepository) EventsAfter(_ context.Context, vaultID string, afterRevision int64, limit int) ([]StoredEvent, error) {
	f.afterSeen = afterRevision
	f.limitSeen = limit
	result := make([]StoredEvent, 0, len(f.events))
	for _, event := range f.events {
		if event.Envelope.VaultID == vaultID && event.CommittedRevision > afterRevision {
			result = append(result, event)
			if len(result) == limit {
				break
			}
		}
	}
	return result, nil
}

func TestPullReturnsAuthorizedOpaqueEventsAfterCursor(t *testing.T) {
	repository := &fakePullRepository{
		fakeRepository: newFakeRepository(),
		events: []StoredEvent{
			{Envelope: Envelope{VaultID: "vault-a", EventID: "evt-1", CiphertextAndTag: []byte("opaque-1")}, CommittedRevision: 1},
			{Envelope: Envelope{VaultID: "vault-a", EventID: "evt-2", CiphertextAndTag: []byte("opaque-2")}, CommittedRevision: 2},
			{Envelope: Envelope{VaultID: "vault-a", EventID: "evt-3", CiphertextAndTag: []byte("opaque-3")}, CommittedRevision: 3, Conflict: true},
		},
	}
	service := NewService(repository, fakeAuthorizer{}, 1024)

	events, err := service.Pull(context.Background(), Session{AccountID: "acct-a", DeviceID: "dev-a"}, "vault-a", 1, 50)
	if err != nil {
		t.Fatal(err)
	}
	if repository.afterSeen != 1 || repository.limitSeen != 50 {
		t.Fatalf("pull repository saw after=%d limit=%d", repository.afterSeen, repository.limitSeen)
	}
	if len(events) != 2 || events[0].CommittedRevision != 2 || events[1].CommittedRevision != 3 {
		t.Fatalf("events = %+v, want revisions 2,3", events)
	}
	if string(events[0].Envelope.CiphertextAndTag) != "opaque-2" || !events[1].Conflict {
		t.Fatalf("opaque/conflict fields were not preserved: %+v", events)
	}
}

func TestPullRejectsCrossAccountVault(t *testing.T) {
	repository := &fakePullRepository{fakeRepository: newFakeRepository()}
	service := NewService(repository, fakeAuthorizer{}, 1024)

	_, err := service.Pull(context.Background(), Session{AccountID: "acct-a", DeviceID: "dev-a"}, "vault-b", 0, 50)
	if !errors.Is(err, ErrCrossAccount) {
		t.Fatalf("cross-account pull error = %v, want ErrCrossAccount", err)
	}
}

func TestPullPropagatesRevokedDeviceRejection(t *testing.T) {
	repository := &fakePullRepository{fakeRepository: newFakeRepository()}
	service := NewService(repository, fakeAuthorizer{err: errRevokedDevice}, 1024)

	_, err := service.Pull(context.Background(), Session{AccountID: "acct-a", DeviceID: "dev-revoked"}, "vault-a", 0, 50)
	if !errors.Is(err, errRevokedDevice) {
		t.Fatalf("revoked pull error = %v, want %v", err, errRevokedDevice)
	}
}

func TestPullRejectsInvalidLimit(t *testing.T) {
	repository := &fakePullRepository{fakeRepository: newFakeRepository()}
	service := NewService(repository, fakeAuthorizer{}, 1024)

	for _, limit := range []int{0, -1, 1001} {
		_, err := service.Pull(context.Background(), Session{AccountID: "acct-a", DeviceID: "dev-a"}, "vault-a", 0, limit)
		if !errors.Is(err, ErrInvalidPullLimit) {
			t.Fatalf("limit %d error = %v, want ErrInvalidPullLimit", limit, err)
		}
	}
}
