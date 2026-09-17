package deviceauth

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"errors"
	"testing"
	"time"

	"sreva.dev/sync_service/internal/devices"
)

type fakeChallenges struct {
	records map[string]Challenge
}

func (f *fakeChallenges) Put(_ context.Context, challenge Challenge) error {
	if f.records == nil {
		f.records = make(map[string]Challenge)
	}
	f.records[challenge.Value] = challenge
	return nil
}

func (f *fakeChallenges) Consume(_ context.Context, value string) (Challenge, error) {
	challenge, ok := f.records[value]
	if !ok || challenge.Consumed {
		return Challenge{}, ErrChallengeReplay
	}
	challenge.Consumed = true
	f.records[value] = challenge
	return challenge, nil
}

type fakeDevices struct {
	record devices.Record
	err    error
}

func (f fakeDevices) Device(_ context.Context, _ string) (devices.Record, error) {
	return f.record, f.err
}

func mustHex(t *testing.T, value string) []byte {
	t.Helper()
	decoded, err := hex.DecodeString(value)
	if err != nil {
		t.Fatalf("decode hex: %v", err)
	}
	return decoded
}

func mustKey(t *testing.T, value []byte) [32]byte {
	t.Helper()
	if len(value) != ed25519.PublicKeySize {
		t.Fatalf("public key length=%d", len(value))
	}
	var key [32]byte
	copy(key[:], value)
	return key
}

func TestVerifyMatchesFrozenTask19DeviceAuthenticationVector(t *testing.T) {
	now := time.Date(2026, 9, 17, 2, 30, 0, 0, time.UTC)
	challenges := &fakeChallenges{}
	lookup := fakeDevices{record: devices.Record{
		DeviceID:         "dev_target_B2",
		AccountID:        "acct_test_7Q3V",
		State:            devices.StateActive,
		PublicSigningKey: mustKey(t, mustHex(t, "03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8")),
		SignatureSuite:   "Ed25519",
	}}
	service := NewService(challenges, lookup, func() time.Time { return now }, func() (string, error) {
		return "challenge_test_F6", nil
	})

	issued, err := service.Issue(context.Background(), Scope{
		AccountID:  "acct_test_7Q3V",
		DeviceID:   "dev_target_B2",
		Action:     "sync.push",
		Method:     "POST",
		Path:       "/v1/sync/push",
		BodySHA256: mustHex(t, "614f704709533f3a6c542dbf5e9c63c8f5e17c1a1d0ab3612a3270ac086e719f"),
	}, 2*time.Minute)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if issued != "challenge_test_F6" {
		t.Fatalf("challenge=%q", issued)
	}

	err = service.Verify(context.Background(), Request{
		Scope: Scope{
			AccountID:  "acct_test_7Q3V",
			DeviceID:   "dev_target_B2",
			Action:     "sync.push",
			Method:     "POST",
			Path:       "/v1/sync/push",
			BodySHA256: mustHex(t, "614f704709533f3a6c542dbf5e9c63c8f5e17c1a1d0ab3612a3270ac086e719f"),
		},
		Challenge: "challenge_test_F6",
		Signature: mustHex(t, "afe539d0df5ff67b427e31da13e5fc2f8d362f99b1430cf3d02817355682c00642c77346e06aac9fba3018705a723a089527ffe9280c10e758925a2ec5a19806"),
	})
	if err != nil {
		t.Fatalf("verify frozen vector: %v", err)
	}
}

func TestVerifyRejectsReplayExpiryScopeAndInvalidSignature(t *testing.T) {
	now := time.Date(2026, 9, 17, 2, 30, 0, 0, time.UTC)
	publicKey, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	lookup := fakeDevices{record: devices.Record{
		DeviceID:         "dev-a",
		AccountID:        "acct-a",
		State:            devices.StateActive,
		PublicSigningKey: mustKey(t, publicKey),
		SignatureSuite:   "Ed25519",
	}}

	newService := func(challenge string) (*Service, *fakeChallenges) {
		store := &fakeChallenges{}
		return NewService(store, lookup, func() time.Time { return now }, func() (string, error) { return challenge, nil }), store
	}
	base := Scope{
		AccountID:  "acct-a",
		DeviceID:   "dev-a",
		Action:     "sync.push",
		Method:     "POST",
		Path:       "/v1/sync/push",
		BodySHA256: make([]byte, 32),
	}

	t.Run("replay", func(t *testing.T) {
		service, _ := newService("challenge-replay")
		if _, err := service.Issue(context.Background(), base, time.Minute); err != nil {
			t.Fatal(err)
		}
		signature := ed25519.Sign(privateKey, Transcript(base, "challenge-replay"))
		request := Request{Scope: base, Challenge: "challenge-replay", Signature: signature}
		if err := service.Verify(context.Background(), request); err != nil {
			t.Fatalf("first verify: %v", err)
		}
		if err := service.Verify(context.Background(), request); !errors.Is(err, ErrChallengeReplay) {
			t.Fatalf("replay error=%v", err)
		}
	})

	t.Run("expiry", func(t *testing.T) {
		service, _ := newService("challenge-expired")
		if _, err := service.Issue(context.Background(), base, time.Second); err != nil {
			t.Fatal(err)
		}
		now = now.Add(2 * time.Second)
		signature := ed25519.Sign(privateKey, Transcript(base, "challenge-expired"))
		if err := service.Verify(context.Background(), Request{Scope: base, Challenge: "challenge-expired", Signature: signature}); !errors.Is(err, ErrChallengeExpired) {
			t.Fatalf("expiry error=%v", err)
		}
		now = now.Add(-2 * time.Second)
	})

	t.Run("scope", func(t *testing.T) {
		service, _ := newService("challenge-scope")
		if _, err := service.Issue(context.Background(), base, time.Minute); err != nil {
			t.Fatal(err)
		}
		changed := base
		changed.Path = "/v1/sync/pull?vault_id=vault-b"
		signature := ed25519.Sign(privateKey, Transcript(changed, "challenge-scope"))
		if err := service.Verify(context.Background(), Request{Scope: changed, Challenge: "challenge-scope", Signature: signature}); !errors.Is(err, ErrChallengeScope) {
			t.Fatalf("scope error=%v", err)
		}
	})

	t.Run("signature", func(t *testing.T) {
		service, _ := newService("challenge-signature")
		if _, err := service.Issue(context.Background(), base, time.Minute); err != nil {
			t.Fatal(err)
		}
		badSignature := make([]byte, ed25519.SignatureSize)
		if err := service.Verify(context.Background(), Request{Scope: base, Challenge: "challenge-signature", Signature: badSignature}); !errors.Is(err, ErrInvalidSignature) {
			t.Fatalf("signature error=%v", err)
		}
	})
}
