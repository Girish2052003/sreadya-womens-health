package deviceauth

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"sreva.dev/sync_service/internal/devices"
)

var (
	ErrChallengeReplay  = errors.New("device challenge already consumed or unknown")
	ErrChallengeExpired = errors.New("device challenge expired")
	ErrChallengeScope   = errors.New("device challenge scope mismatch")
	ErrInvalidSignature = errors.New("invalid device signature")
	ErrInvalidKey       = errors.New("invalid device signing key")
	ErrInvalidSuite     = errors.New("unsupported device signature suite")
	ErrFrameTooLarge    = errors.New("device-auth transcript field exceeds lp16 limit")
)

const signatureSuite = "Ed25519"

type Scope struct {
	AccountID  string
	DeviceID   string
	Action     string
	Method     string
	Path       string
	BodySHA256 []byte
}

type Challenge struct {
	Value     string
	Scope     Scope
	ExpiresAt time.Time
	Consumed  bool
}

type Request struct {
	Scope
	Challenge string
	Signature []byte
}

type ChallengeStore interface {
	Put(context.Context, Challenge) error
	Consume(context.Context, string) (Challenge, error)
}

type Service struct {
	challenges ChallengeStore
	devices    devices.Lookup
	now        func() time.Time
	newToken   func() (string, error)
}

func NewService(challenges ChallengeStore, deviceLookup devices.Lookup, now func() time.Time, newToken func() (string, error)) *Service {
	return &Service{
		challenges: challenges,
		devices:    deviceLookup,
		now:        now,
		newToken:   newToken,
	}
}

func (s *Service) Issue(ctx context.Context, scope Scope, ttl time.Duration) (string, error) {
	value, err := s.newToken()
	if err != nil {
		return "", err
	}
	challenge := Challenge{
		Value:     value,
		Scope:     normalizedScope(scope),
		ExpiresAt: s.now().Add(ttl),
	}
	if err := s.challenges.Put(ctx, challenge); err != nil {
		return "", err
	}
	return value, nil
}

func (s *Service) Verify(ctx context.Context, request Request) error {
	challenge, err := s.challenges.Consume(ctx, request.Challenge)
	if err != nil {
		return err
	}
	if !s.now().Before(challenge.ExpiresAt) {
		return ErrChallengeExpired
	}

	scope := normalizedScope(request.Scope)
	if !equalScope(challenge.Scope, scope) {
		return ErrChallengeScope
	}

	record, err := s.devices.Device(ctx, scope.DeviceID)
	if err != nil {
		return err
	}
	if record.AccountID != scope.AccountID {
		return devices.ErrCrossAccount
	}
	switch record.State {
	case devices.StateRevoked:
		return devices.ErrDeviceRevoked
	case devices.StateActive:
		// Continue below.
	default:
		return devices.ErrDeviceInactive
	}
	if record.SignatureSuite != signatureSuite {
		return ErrInvalidSuite
	}
	if len(record.PublicSigningKey) != ed25519.PublicKeySize {
		return ErrInvalidKey
	}
	if len(request.Signature) != ed25519.SignatureSize {
		return ErrInvalidSignature
	}

	transcript := Transcript(scope, request.Challenge)
	if transcript == nil || !ed25519.Verify(ed25519.PublicKey(record.PublicSigningKey), transcript, request.Signature) {
		return ErrInvalidSignature
	}
	return nil
}

func normalizedScope(scope Scope) Scope {
	scope.Method = strings.ToUpper(scope.Method)
	scope.BodySHA256 = append([]byte(nil), scope.BodySHA256...)
	return scope
}

func equalScope(left, right Scope) bool {
	return left.AccountID == right.AccountID &&
		left.DeviceID == right.DeviceID &&
		left.Action == right.Action &&
		left.Method == right.Method &&
		left.Path == right.Path &&
		bytes.Equal(left.BodySHA256, right.BodySHA256)
}

// Transcript returns the frozen Task-19 sreva-device-auth-v1 LP16 transcript.
// The request-body digest is represented as lowercase hexadecimal UTF-8, exactly
// as specified by the v1 interoperability vector.
func Transcript(scope Scope, challenge string) []byte {
	fields := [][]byte{
		[]byte("sreva-device-auth-v1"),
		[]byte(scope.AccountID),
		[]byte(scope.DeviceID),
		[]byte(strings.ToUpper(scope.Method)),
		[]byte(scope.Path),
		[]byte(challenge),
		[]byte(hex.EncodeToString(scope.BodySHA256)),
	}

	var out []byte
	for _, field := range fields {
		if len(field) > int(^uint16(0)) {
			return nil
		}
		var length [2]byte
		binary.BigEndian.PutUint16(length[:], uint16(len(field)))
		out = append(out, length[:]...)
		out = append(out, field...)
	}
	return out
}
