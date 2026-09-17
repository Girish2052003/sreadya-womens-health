package sync

import (
	"bytes"
	"context"
	"errors"
	stdsync "sync"
)

var (
	ErrCrossAccount    = errors.New("sync envelope crosses account boundary")
	ErrEnvelopeTooLarge = errors.New("ciphertext envelope exceeds size limit")
	ErrEventIDReuse    = errors.New("event id reused with different envelope")
)

type Session struct {
	AccountID string
}

type Envelope struct {
	AccountID        string
	VaultID          string
	EventID          string
	ObjectID         string
	SourceDeviceID   string
	KeyEpoch         int64
	ProtocolVersion  int64
	SuiteID          string
	SchemaID         string
	BaseRevision     int64
	Operation        string
	KDFSalt          []byte
	Nonce            []byte
	CiphertextAndTag []byte
	EnvelopeDigest   []byte
}

type Ack struct {
	EventID           string
	CommittedRevision int64
	Conflict          bool
	Existing          bool
}

type DeviceAuthorizer interface {
	Authorize(context.Context, string, string) error
}

type Repository interface {
	VaultAccount(context.Context, string) (string, error)
	ExistingEvent(context.Context, string) ([]byte, Ack, bool, error)
	CurrentRevision(context.Context, string, string) (int64, error)
	Commit(context.Context, Envelope, Ack) error
}

type Service struct {
	repository         Repository
	authorizer         DeviceAuthorizer
	maxCiphertextBytes int
	mu                 stdsync.Mutex
}

func NewService(repository Repository, authorizer DeviceAuthorizer, maxCiphertextBytes int) *Service {
	return &Service{
		repository:         repository,
		authorizer:         authorizer,
		maxCiphertextBytes: maxCiphertextBytes,
	}
}

func (s *Service) Push(ctx context.Context, session Session, envelope Envelope) (Ack, error) {
	if session.AccountID == "" || envelope.AccountID != session.AccountID {
		return Ack{}, ErrCrossAccount
	}
	if s.maxCiphertextBytes >= 0 && len(envelope.CiphertextAndTag) > s.maxCiphertextBytes {
		return Ack{}, ErrEnvelopeTooLarge
	}
	if err := s.authorizer.Authorize(ctx, session.AccountID, envelope.SourceDeviceID); err != nil {
		return Ack{}, err
	}
	vaultAccount, err := s.repository.VaultAccount(ctx, envelope.VaultID)
	if err != nil {
		return Ack{}, err
	}
	if vaultAccount != session.AccountID {
		return Ack{}, ErrCrossAccount
	}

	// Revision allocation, event-id idempotency and commit are one service-level
	// critical section. The persistence adapter can later strengthen this with a
	// database transaction/advisory lock without changing the protocol boundary.
	s.mu.Lock()
	defer s.mu.Unlock()

	digest, existingAck, exists, err := s.repository.ExistingEvent(ctx, envelope.EventID)
	if err != nil {
		return Ack{}, err
	}
	if exists {
		if !bytes.Equal(digest, envelope.EnvelopeDigest) {
			return Ack{}, ErrEventIDReuse
		}
		existingAck.Existing = true
		return existingAck, nil
	}

	currentRevision, err := s.repository.CurrentRevision(ctx, envelope.VaultID, envelope.ObjectID)
	if err != nil {
		return Ack{}, err
	}
	ack := Ack{
		EventID:           envelope.EventID,
		CommittedRevision: currentRevision + 1,
		Conflict:          envelope.BaseRevision != currentRevision,
	}
	if err := s.repository.Commit(ctx, envelope, ack); err != nil {
		return Ack{}, err
	}
	return ack, nil
}
