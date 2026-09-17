package sync

import (
	"context"
	"errors"
	"testing"
)

type fakePullRepository struct {
	*fakeRepository
	page       PullPage
	cursorSeen string
	limitSeen  int
}

func (f *fakePullRepository) EventsAfter(_ context.Context, vaultID, cursor string, limit int) (PullPage, error) {
	f.cursorSeen = cursor
	f.limitSeen = limit
	result := PullPage{NextCursor: f.page.NextCursor}
	for _, event := range f.page.Events {
		if event.Envelope.VaultID == vaultID {
			result.Events = append(result.Events, event)
			if len(result.Events) == limit {
				break
			}
		}
	}
	return result, nil
}

func TestPullUsesOpaqueVaultCursorIndependentOfObjectRevision(t *testing.T) {
	repository := &fakePullRepository{
		fakeRepository: newFakeRepository(),
		page: PullPage{
			Events: []StoredEvent{
				{Envelope: Envelope{VaultID: "vault-a", ObjectID: "obj-a", EventID: "evt-a", CiphertextAndTag: []byte("opaque-a")}, CommittedRevision: 1},
				{Envelope: Envelope{VaultID: "vault-a", ObjectID: "obj-b", EventID: "evt-b", CiphertextAndTag: []byte("opaque-b")}, CommittedRevision: 1},
				{Envelope: Envelope{VaultID: "vault-a", ObjectID: "obj-a", EventID: "evt-c", CiphertextAndTag: []byte("opaque-c")}, CommittedRevision: 2, Conflict: true},
			},
			NextCursor: "opaque-cursor-10",
		},
	}
	service := NewService(repository, fakeAuthorizer{}, 1024)

	page, err := service.Pull(context.Background(), Session{AccountID: "acct-a", DeviceID: "dev-a"}, "vault-a", "opaque-cursor-7", 50)
	if err != nil {
		t.Fatal(err)
	}
	if repository.cursorSeen != "opaque-cursor-7" || repository.limitSeen != 50 {
		t.Fatalf("pull repository saw cursor=%q limit=%d", repository.cursorSeen, repository.limitSeen)
	}
	if len(page.Events) != 3 || page.Events[0].CommittedRevision != 1 || page.Events[1].CommittedRevision != 1 || page.Events[2].CommittedRevision != 2 {
		t.Fatalf("events = %+v, want independent object revisions 1,1,2", page.Events)
	}
	if page.NextCursor != "opaque-cursor-10" {
		t.Fatalf("next cursor = %q, want opaque-cursor-10", page.NextCursor)
	}
	if string(page.Events[1].Envelope.CiphertextAndTag) != "opaque-b" || !page.Events[2].Conflict {
		t.Fatalf("opaque/conflict fields were not preserved: %+v", page.Events)
	}
}

func TestPullRejectsCrossAccountVault(t *testing.T) {
	repository := &fakePullRepository{fakeRepository: newFakeRepository()}
	service := NewService(repository, fakeAuthorizer{}, 1024)

	_, err := service.Pull(context.Background(), Session{AccountID: "acct-a", DeviceID: "dev-a"}, "vault-b", "", 50)
	if !errors.Is(err, ErrCrossAccount) {
		t.Fatalf("cross-account pull error = %v, want ErrCrossAccount", err)
	}
}

func TestPullPropagatesRevokedDeviceRejection(t *testing.T) {
	repository := &fakePullRepository{fakeRepository: newFakeRepository()}
	service := NewService(repository, fakeAuthorizer{err: errRevokedDevice}, 1024)

	_, err := service.Pull(context.Background(), Session{AccountID: "acct-a", DeviceID: "dev-revoked"}, "vault-a", "", 50)
	if !errors.Is(err, errRevokedDevice) {
		t.Fatalf("revoked pull error = %v, want %v", err, errRevokedDevice)
	}
}

func TestPullRejectsInvalidLimit(t *testing.T) {
	repository := &fakePullRepository{fakeRepository: newFakeRepository()}
	service := NewService(repository, fakeAuthorizer{}, 1024)

	for _, limit := range []int{0, -1, 1001} {
		_, err := service.Pull(context.Background(), Session{AccountID: "acct-a", DeviceID: "dev-a"}, "vault-a", "", limit)
		if !errors.Is(err, ErrInvalidPullLimit) {
			t.Fatalf("limit %d error = %v, want ErrInvalidPullLimit", limit, err)
		}
	}
}
