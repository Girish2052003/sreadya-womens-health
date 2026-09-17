package sync

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
)

var errRevokedDevice = errors.New("revoked device")

type fakeAuthorizer struct {
	err error
}

func (f fakeAuthorizer) Authorize(_ context.Context, _, _ string) error {
	return f.err
}

type storedEvent struct {
	digest []byte
	ack    Ack
}

type fakeRepository struct {
	mu            sync.Mutex
	vaultAccounts map[string]string
	events        map[string]storedEvent
	revisions     map[string]int64
	commits       int
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{
		vaultAccounts: map[string]string{"vault-a": "acct-a", "vault-b": "acct-b"},
		events:        make(map[string]storedEvent),
		revisions:     make(map[string]int64),
	}
}

func objectKey(vaultID, objectID string) string {
	return vaultID + "/" + objectID
}

func (f *fakeRepository) VaultAccount(_ context.Context, vaultID string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	accountID, ok := f.vaultAccounts[vaultID]
	if !ok {
		return "", fmt.Errorf("unknown vault %q", vaultID)
	}
	return accountID, nil
}

func (f *fakeRepository) ExistingEvent(_ context.Context, eventID string) ([]byte, Ack, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	stored, ok := f.events[eventID]
	if !ok {
		return nil, Ack{}, false, nil
	}
	return append([]byte(nil), stored.digest...), stored.ack, true, nil
}

func (f *fakeRepository) CurrentRevision(_ context.Context, vaultID, objectID string) (int64, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.revisions[objectKey(vaultID, objectID)], nil
}

func (f *fakeRepository) Commit(_ context.Context, envelope Envelope, ack Ack) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.commits++
	f.events[envelope.EventID] = storedEvent{digest: append([]byte(nil), envelope.EnvelopeDigest...), ack: ack}
	f.revisions[objectKey(envelope.VaultID, envelope.ObjectID)] = ack.CommittedRevision
	return nil
}

func validEnvelope() Envelope {
	return Envelope{
		AccountID:        "acct-a",
		VaultID:          "vault-a",
		EventID:          "evt-1",
		ObjectID:         "obj-1",
		SourceDeviceID:   "dev-a",
		KeyEpoch:         1,
		ProtocolVersion:  1,
		SuiteID:          "SREVA-E2EE-V1-ED25519",
		SchemaID:         "opaque-schema-v1",
		BaseRevision:     0,
		Operation:        "upsert",
		KDFSalt:          bytes.Repeat([]byte{0x11}, 32),
		Nonce:            bytes.Repeat([]byte{0x22}, 12),
		CiphertextAndTag: []byte("opaque-ciphertext"),
		EnvelopeDigest:   bytes.Repeat([]byte{0x33}, 32),
	}
}

func TestPushCommitsMatchingBaseAsNextRevision(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository, fakeAuthorizer{}, 1024)

	ack, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, validEnvelope())
	if err != nil {
		t.Fatal(err)
	}
	if ack.CommittedRevision != 1 || ack.Conflict || ack.Existing {
		t.Fatalf("ack = %+v, want revision 1 non-conflict fresh commit", ack)
	}
	if repository.commits != 1 {
		t.Fatalf("commit count = %d, want 1", repository.commits)
	}
}

func TestPushRejectsCrossAccountAndCrossVaultSubstitution(t *testing.T) {
	for _, mutate := range []func(*Envelope){
		func(envelope *Envelope) { envelope.AccountID = "acct-b" },
		func(envelope *Envelope) { envelope.VaultID = "vault-b" },
	} {
		repository := newFakeRepository()
		service := NewService(repository, fakeAuthorizer{}, 1024)
		envelope := validEnvelope()
		mutate(&envelope)

		_, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, envelope)
		if !errors.Is(err, ErrCrossAccount) {
			t.Fatalf("cross-account substitution error = %v, want ErrCrossAccount", err)
		}
		if repository.commits != 0 {
			t.Fatalf("cross-account request committed %d events", repository.commits)
		}
	}
}

func TestPushPropagatesRevokedDeviceRejection(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository, fakeAuthorizer{err: errRevokedDevice}, 1024)

	_, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, validEnvelope())
	if !errors.Is(err, errRevokedDevice) {
		t.Fatalf("revoked-device error = %v, want %v", err, errRevokedDevice)
	}
	if repository.commits != 0 {
		t.Fatalf("revoked device committed %d events", repository.commits)
	}
}

func TestPushRejectsOversizedCiphertext(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository, fakeAuthorizer{}, 8)
	envelope := validEnvelope()
	envelope.CiphertextAndTag = bytes.Repeat([]byte{0x44}, 9)

	_, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, envelope)
	if !errors.Is(err, ErrEnvelopeTooLarge) {
		t.Fatalf("oversized error = %v, want ErrEnvelopeTooLarge", err)
	}
	if repository.commits != 0 {
		t.Fatalf("oversized envelope committed %d events", repository.commits)
	}
}

func TestPushReturnsExistingAcknowledgementForByteEquivalentRetry(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository, fakeAuthorizer{}, 1024)
	envelope := validEnvelope()

	first, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, envelope)
	if err != nil {
		t.Fatal(err)
	}
	second, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, envelope)
	if err != nil {
		t.Fatal(err)
	}
	if !second.Existing || second.CommittedRevision != first.CommittedRevision {
		t.Fatalf("retry ack = %+v, first = %+v", second, first)
	}
	if repository.commits != 1 {
		t.Fatalf("idempotent retry commit count = %d, want 1", repository.commits)
	}
}

func TestPushRejectsReusedEventIDWithDifferentEnvelopeDigest(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository, fakeAuthorizer{}, 1024)
	envelope := validEnvelope()
	if _, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, envelope); err != nil {
		t.Fatal(err)
	}

	envelope.EnvelopeDigest = bytes.Repeat([]byte{0x55}, 32)
	_, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, envelope)
	if !errors.Is(err, ErrEventIDReuse) {
		t.Fatalf("mutated duplicate error = %v, want ErrEventIDReuse", err)
	}
	if repository.commits != 1 {
		t.Fatalf("mutated duplicate commit count = %d, want 1", repository.commits)
	}
}

func TestPushPreservesStaleBaseAsConflictBranch(t *testing.T) {
	repository := newFakeRepository()
	repository.revisions[objectKey("vault-a", "obj-1")] = 12
	service := NewService(repository, fakeAuthorizer{}, 1024)
	envelope := validEnvelope()
	envelope.BaseRevision = 8

	ack, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, envelope)
	if err != nil {
		t.Fatal(err)
	}
	if ack.CommittedRevision != 13 || !ack.Conflict {
		t.Fatalf("stale ack = %+v, want revision 13 conflict-preserved", ack)
	}
}

func TestPushSerializesConcurrentSameObjectUpdatesWithoutDroppingEither(t *testing.T) {
	repository := newFakeRepository()
	repository.revisions[objectKey("vault-a", "obj-1")] = 4
	service := NewService(repository, fakeAuthorizer{}, 1024)

	first := validEnvelope()
	first.EventID = "evt-concurrent-a"
	first.BaseRevision = 4
	first.EnvelopeDigest = bytes.Repeat([]byte{0x61}, 32)
	second := validEnvelope()
	second.EventID = "evt-concurrent-b"
	second.BaseRevision = 4
	second.EnvelopeDigest = bytes.Repeat([]byte{0x62}, 32)

	results := make(chan Ack, 2)
	errorsSeen := make(chan error, 2)
	var wg sync.WaitGroup
	for _, envelope := range []Envelope{first, second} {
		wg.Add(1)
		go func(envelope Envelope) {
			defer wg.Done()
			ack, err := service.Push(context.Background(), Session{AccountID: "acct-a"}, envelope)
			if err != nil {
				errorsSeen <- err
				return
			}
			results <- ack
		}(envelope)
	}
	wg.Wait()
	close(results)
	close(errorsSeen)

	for err := range errorsSeen {
		t.Fatalf("concurrent push failed: %v", err)
	}
	var fresh, conflict int
	seenRevisions := map[int64]bool{}
	for ack := range results {
		seenRevisions[ack.CommittedRevision] = true
		if ack.Conflict {
			conflict++
		} else {
			fresh++
		}
	}
	if fresh != 1 || conflict != 1 || !seenRevisions[5] || !seenRevisions[6] {
		t.Fatalf("concurrent results fresh=%d conflict=%d revisions=%v", fresh, conflict, seenRevisions)
	}
	if repository.commits != 2 {
		t.Fatalf("concurrent commit count = %d, want 2", repository.commits)
	}
}
