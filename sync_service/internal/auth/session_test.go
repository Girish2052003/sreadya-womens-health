package auth

import (
	"errors"
	"testing"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
)

func TestSessionStoreRejectsReplay(t *testing.T) {
	now := time.Date(2026, 9, 17, 1, 0, 0, 0, time.UTC)
	store := NewSessionStore(
		func() time.Time { return now },
		func() (string, error) { return "session-1", nil },
	)

	id, err := store.Put("login", webauthn.SessionData{Challenge: "challenge"}, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if id != "session-1" {
		t.Fatalf("session id = %q, want session-1", id)
	}

	if _, err := store.Consume(id, "login"); err != nil {
		t.Fatalf("first consume failed: %v", err)
	}
	if _, err := store.Consume(id, "login"); !errors.Is(err, ErrSessionReplay) {
		t.Fatalf("second consume error = %v, want ErrSessionReplay", err)
	}
}

func TestSessionStoreRejectsExpiredChallenge(t *testing.T) {
	now := time.Date(2026, 9, 17, 1, 0, 0, 0, time.UTC)
	store := NewSessionStore(
		func() time.Time { return now },
		func() (string, error) { return "session-expiring", nil },
	)

	id, err := store.Put("registration", webauthn.SessionData{Challenge: "challenge"}, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	now = now.Add(time.Minute + time.Second)

	if _, err := store.Consume(id, "registration"); !errors.Is(err, ErrSessionExpired) {
		t.Fatalf("expired consume error = %v, want ErrSessionExpired", err)
	}
}

func TestSessionStoreRejectsPurposeSubstitution(t *testing.T) {
	now := time.Date(2026, 9, 17, 1, 0, 0, 0, time.UTC)
	store := NewSessionStore(
		func() time.Time { return now },
		func() (string, error) { return "session-purpose", nil },
	)

	id, err := store.Put("registration", webauthn.SessionData{Challenge: "challenge"}, time.Minute)
	if err != nil {
		t.Fatal(err)
	}

	if _, err := store.Consume(id, "login"); !errors.Is(err, ErrSessionPurpose) {
		t.Fatalf("purpose-substitution error = %v, want ErrSessionPurpose", err)
	}
}

func TestRateLimiterEnforcesWindow(t *testing.T) {
	now := time.Date(2026, 9, 17, 1, 0, 0, 0, time.UTC)
	limiter := NewRateLimiter(2, time.Minute, func() time.Time { return now })

	if !limiter.Allow("account-1") || !limiter.Allow("account-1") {
		t.Fatal("first two attempts should be allowed")
	}
	if limiter.Allow("account-1") {
		t.Fatal("third attempt inside the window should be rejected")
	}

	now = now.Add(time.Minute + time.Second)
	if !limiter.Allow("account-1") {
		t.Fatal("attempt after window reset should be allowed")
	}
}
