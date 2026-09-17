package sync

import (
	"bytes"
	"context"
	"errors"
	"sync"
	"testing"
)

func TestTask27AuthorizationIsolation(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository, fakeAuthorizer{}, 1024)

	_, err := service.Push(
		context.Background(),
		Session{AccountID: "acct-b", DeviceID: "dev-b"},
		validEnvelope(),
	)
	if !errors.Is(err, ErrCrossAccount) {
		t.Fatalf("cross-account session error = %v, want ErrCrossAccount", err)
	}
	if repository.commits != 0 {
		t.Fatalf("cross-account session committed %d events", repository.commits)
	}
}

func TestTask27ConcurrentSameObjectPreservesEverySyntheticEvent(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository, fakeAuthorizer{}, 4096)

	const writers = 16
	results := make(chan Ack, writers)
	errorsSeen := make(chan error, writers)
	var wg sync.WaitGroup
	for index := 0; index < writers; index++ {
		envelope := validEnvelope()
		envelope.EventID = string(rune('a' + index)) + "-task27-event"
		envelope.BaseRevision = 0
		envelope.EnvelopeDigest = bytes.Repeat([]byte{byte(index + 1)}, 32)

		wg.Add(1)
		go func(candidate Envelope) {
			defer wg.Done()
			ack, err := service.Push(
				context.Background(),
				Session{AccountID: "acct-a", DeviceID: "dev-a"},
				candidate,
			)
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
		t.Fatalf("concurrent Task 27 push failed: %v", err)
	}

	revisions := map[int64]bool{}
	count := 0
	for ack := range results {
		count++
		revisions[ack.CommittedRevision] = true
	}
	if count != writers || len(revisions) != writers || repository.commits != writers {
		t.Fatalf(
			"writers=%d unique revisions=%d commits=%d, want %d/%d/%d",
			count,
			len(revisions),
			repository.commits,
			writers,
			writers,
			writers,
		)
	}
}

func TestTask27RevokedDeviceCannotCommitAfterAuthorizationFailure(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository, fakeAuthorizer{err: errRevokedDevice}, 1024)

	_, err := service.Push(
		context.Background(),
		Session{AccountID: "acct-a", DeviceID: "dev-revoked"},
		validEnvelope(),
	)
	if !errors.Is(err, errRevokedDevice) {
		t.Fatalf("revoked-device error = %v, want %v", err, errRevokedDevice)
	}
	if repository.commits != 0 {
		t.Fatalf("revoked device committed %d events", repository.commits)
	}
}

func TestTask27ReplayOfEquivalentEventIsIdempotent(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository, fakeAuthorizer{}, 1024)
	envelope := validEnvelope()

	first, err := service.Push(
		context.Background(),
		Session{AccountID: "acct-a", DeviceID: "dev-a"},
		envelope,
	)
	if err != nil {
		t.Fatal(err)
	}
	replay, err := service.Push(
		context.Background(),
		Session{AccountID: "acct-a", DeviceID: "dev-a"},
		envelope,
	)
	if err != nil {
		t.Fatal(err)
	}
	if !replay.Existing || replay.CommittedRevision != first.CommittedRevision || repository.commits != 1 {
		t.Fatalf("replay ack=%+v first=%+v commits=%d", replay, first, repository.commits)
	}
}

func FuzzTask27SyncEnvelope(f *testing.F) {
	f.Add([]byte("opaque-synthetic-ciphertext"))
	f.Add([]byte{})
	f.Fuzz(func(t *testing.T, payload []byte) {
		if len(payload) > 2048 {
			t.Skip()
		}
		repository := newFakeRepository()
		service := NewService(repository, fakeAuthorizer{}, 2048)
		envelope := validEnvelope()
		envelope.CiphertextAndTag = append([]byte(nil), payload...)
		envelope.EnvelopeDigest = bytes.Repeat([]byte{0x7a}, 32)

		first, err := service.Push(
			context.Background(),
			Session{AccountID: "acct-a", DeviceID: "dev-a"},
			envelope,
		)
		if err != nil {
			t.Fatalf("first synthetic fuzz push failed: %v", err)
		}
		replay, err := service.Push(
			context.Background(),
			Session{AccountID: "acct-a", DeviceID: "dev-a"},
			envelope,
		)
		if err != nil {
			t.Fatalf("equivalent replay failed: %v", err)
		}
		if !replay.Existing || replay.CommittedRevision != first.CommittedRevision {
			t.Fatalf("replay=%+v first=%+v", replay, first)
		}
	})
}
