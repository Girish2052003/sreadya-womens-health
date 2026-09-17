package auth

import (
	"errors"
	"sync"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
)

var (
	ErrSessionReplay  = errors.New("authentication session already consumed")
	ErrSessionExpired = errors.New("authentication session expired")
	ErrSessionPurpose = errors.New("authentication session purpose mismatch")
)

type sessionEntry struct {
	purpose   string
	data      webauthn.SessionData
	expiresAt time.Time
	consumed  bool
}

// SessionStore keeps short-lived WebAuthn ceremony state server-side. Entries
// are purpose-bound and one-time so a registration challenge cannot be replayed
// or substituted into a login ceremony.
type SessionStore struct {
	mu       sync.Mutex
	entries  map[string]*sessionEntry
	now      func() time.Time
	newToken func() (string, error)
}

func NewSessionStore(now func() time.Time, newToken func() (string, error)) *SessionStore {
	return &SessionStore{
		entries:  make(map[string]*sessionEntry),
		now:      now,
		newToken: newToken,
	}
}

func (s *SessionStore) Put(purpose string, data webauthn.SessionData, ttl time.Duration) (string, error) {
	id, err := s.newToken()
	if err != nil {
		return "", err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries[id] = &sessionEntry{
		purpose:   purpose,
		data:      data,
		expiresAt: s.now().Add(ttl),
	}
	return id, nil
}

func (s *SessionStore) Consume(id, purpose string) (webauthn.SessionData, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.entries[id]
	if !ok || entry.consumed {
		return webauthn.SessionData{}, ErrSessionReplay
	}
	if entry.purpose != purpose {
		return webauthn.SessionData{}, ErrSessionPurpose
	}
	if !s.now().Before(entry.expiresAt) {
		return webauthn.SessionData{}, ErrSessionExpired
	}

	entry.consumed = true
	return entry.data, nil
}

type rateWindow struct {
	attempts []time.Time
}

// RateLimiter is an in-memory deterministic fixed-window boundary suitable for
// the modular-monolith scaffold. A persistent/distributed implementation can
// replace it behind the same call site when deployment requires it.
type RateLimiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	now    func() time.Time
	keys   map[string]*rateWindow
}

func NewRateLimiter(limit int, window time.Duration, now func() time.Time) *RateLimiter {
	return &RateLimiter{
		limit:  limit,
		window: window,
		now:    now,
		keys:   make(map[string]*rateWindow),
	}
}

func (r *RateLimiter) Allow(key string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := r.now()
	cutoff := now.Add(-r.window)
	bucket := r.keys[key]
	if bucket == nil {
		bucket = &rateWindow{}
		r.keys[key] = bucket
	}

	kept := bucket.attempts[:0]
	for _, attempt := range bucket.attempts {
		if attempt.After(cutoff) {
			kept = append(kept, attempt)
		}
	}
	bucket.attempts = kept

	if len(bucket.attempts) >= r.limit {
		return false
	}
	bucket.attempts = append(bucket.attempts, now)
	return true
}
