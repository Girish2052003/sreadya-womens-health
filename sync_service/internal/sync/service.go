package sync

import (
	"bytes"
	"context"
	"errors"
	stdsync "sync"
	"time"
)

var (
	ErrCrossAccount     = errors.New("sync envelope crosses account boundary")
	ErrEnvelopeTooLarge = errors.New("ciphertext envelope exceeds size limit")
	ErrEventIDReuse     = errors.New("event id reused with different envelope")
	ErrInvalidPullLimit = errors.New("pull limit must be between 1 and 1000")
	ErrPullUnsupported  = errors.New("repository does not support pull")
)

type Session struct {
	AccountID string
	DeviceID  string
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
	CreatedAt        time.Time
}

type Ack struct {
	EventID           string
	CommittedRevision int64
	Conflict          bool
	Existing          bool
}

type StoredEvent struct {
	Envelope          Envelope
	CommittedRevision int64
	Conflict          bool
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

type AtomicRepository interface {
	CommitEnvelope(context.Context, Envelope) (Ack, error)
}

type PullRepository interface {
	EventsAfter(context.Context, string, int64, int) ([]StoredEvent, error)
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

	// Durable repositories own revision allocation and idempotency atomically so
	// concurrent service instances cannot assign the same object revision.
	if atomicRepository, ok := s.repository.(AtomicRepository); ok {
		return atomicRepository.CommitEnvelope(ctx, envelope)
	}

	// Lightweight/in-memory repositories use the service-level critical section.
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

func (s *Service) Pull(ctx context.Context, session Session, vaultID string, afterRevision int64, limit int) ([]StoredEvent, error) {
	if limit < 1 || limit > 1000 {
		return nil, ErrInvalidPullLimit
	}
	if session.AccountID == "" {
		return nil, ErrCrossAccount
	}
	if err := s.authorizer.Authorize(ctx, session.AccountID, session.DeviceID); err != nil {
		return nil, err
	}
	vaultAccount, err := s.repository.VaultAccount(ctx, vaultID)
	if err != nil {
		return nil, err
	}
	if vaultAccount != session.AccountID {
		return nil, ErrCrossAccount
	}
	pullRepository, ok := s.repository.(PullRepository)
	if !ok {
		return nil, ErrPullUnsupported
	}
	return pullRepository.EventsAfter(ctx, vaultID, afterRevision, limit)
}
