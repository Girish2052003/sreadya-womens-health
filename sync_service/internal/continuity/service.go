package continuity

import (
	"context"
	"errors"

	"sreadya.dev/sync_service/internal/devices"
)

var (
	ErrRecoveryWrapperNotFound = errors.New("recovery wrapper not found")
	ErrTargetNotPending        = errors.New("target device is not pending")
	ErrInvalidRecoveryWrapper  = errors.New("invalid recovery wrapper")
)

// RecoveryWrapper is opaque continuity material. The service never receives or
// stores the vault root secret, recovery secret, or any readable health data.
type RecoveryWrapper struct {
	AccountID        string
	VaultID          string
	KeyEpoch         int64
	ProtocolVersion  int64
	SuiteID          string
	KDFSalt          []byte
	Nonce            []byte
	CiphertextAndTag []byte
	EnvelopeDigest   []byte
}

// DeletionReceipt describes only what this server action can truthfully attest
// to. Former devices, exports, backups, and screenshots are outside server
// control and therefore can never be reported as erased here.
type DeletionReceipt struct {
	ServerStateDeleted       bool
	FormerDeviceCopiesErased bool
}

type Store interface {
	devices.Lookup
	ActivateDevice(context.Context, string, string, string) error
	RevokeDevice(context.Context, string, string, string) error
	PutRecoveryWrapper(context.Context, RecoveryWrapper) error
	RecoveryWrapper(context.Context, string, string) (RecoveryWrapper, error)
	DeleteAccount(context.Context, string) error
}

type Service struct {
	store      Store
	devices    *devices.Service
}

func NewService(store Store) *Service {
	return &Service{
		store:   store,
		devices: devices.NewService(store),
	}
}

func (s *Service) ApproveDevice(ctx context.Context, accountID, approvingDeviceID, targetDeviceID string) error {
	if err := s.devices.Authorize(ctx, accountID, approvingDeviceID); err != nil {
		return err
	}

	target, err := s.store.Device(ctx, targetDeviceID)
	if err != nil {
		return err
	}
	if target.AccountID != accountID {
		return devices.ErrCrossAccount
	}
	if target.State != devices.StatePending {
		return ErrTargetNotPending
	}
	return s.store.ActivateDevice(ctx, accountID, targetDeviceID, approvingDeviceID)
}

func (s *Service) RevokeDevice(ctx context.Context, accountID, approvingDeviceID, targetDeviceID string) error {
	if err := s.devices.Authorize(ctx, accountID, approvingDeviceID); err != nil {
		return err
	}

	target, err := s.store.Device(ctx, targetDeviceID)
	if err != nil {
		return err
	}
	if target.AccountID != accountID {
		return devices.ErrCrossAccount
	}
	if target.State == devices.StateRevoked {
		return devices.ErrDeviceRevoked
	}
	return s.store.RevokeDevice(ctx, accountID, targetDeviceID, approvingDeviceID)
}

func (s *Service) SaveRecoveryWrapper(ctx context.Context, accountID, approvingDeviceID string, wrapper RecoveryWrapper) error {
	if err := s.devices.Authorize(ctx, accountID, approvingDeviceID); err != nil {
		return err
	}
	if wrapper.AccountID != accountID || !validRecoveryWrapper(wrapper) {
		return ErrInvalidRecoveryWrapper
	}
	return s.store.PutRecoveryWrapper(ctx, cloneRecoveryWrapper(wrapper))
}

func (s *Service) LoadRecoveryWrapper(ctx context.Context, accountID, vaultID string) (RecoveryWrapper, error) {
	wrapper, err := s.store.RecoveryWrapper(ctx, accountID, vaultID)
	if err != nil {
		return RecoveryWrapper{}, err
	}
	if wrapper.AccountID != accountID || wrapper.VaultID != vaultID || !validRecoveryWrapper(wrapper) {
		return RecoveryWrapper{}, ErrInvalidRecoveryWrapper
	}
	return cloneRecoveryWrapper(wrapper), nil
}

func (s *Service) DeleteAccount(ctx context.Context, accountID string) (DeletionReceipt, error) {
	if accountID == "" {
		return DeletionReceipt{}, errors.New("account id is required")
	}
	if err := s.store.DeleteAccount(ctx, accountID); err != nil {
		return DeletionReceipt{}, err
	}
	return DeletionReceipt{
		ServerStateDeleted:       true,
		FormerDeviceCopiesErased: false,
	}, nil
}

func validRecoveryWrapper(wrapper RecoveryWrapper) bool {
	return wrapper.AccountID != "" &&
		wrapper.VaultID != "" &&
		wrapper.KeyEpoch > 0 &&
		wrapper.ProtocolVersion > 0 &&
		wrapper.SuiteID != "" &&
		len(wrapper.KDFSalt) > 0 &&
		len(wrapper.Nonce) > 0 &&
		len(wrapper.CiphertextAndTag) > 0 &&
		len(wrapper.EnvelopeDigest) > 0
}

func cloneRecoveryWrapper(wrapper RecoveryWrapper) RecoveryWrapper {
	wrapper.KDFSalt = append([]byte(nil), wrapper.KDFSalt...)
	wrapper.Nonce = append([]byte(nil), wrapper.Nonce...)
	wrapper.CiphertextAndTag = append([]byte(nil), wrapper.CiphertextAndTag...)
	wrapper.EnvelopeDigest = append([]byte(nil), wrapper.EnvelopeDigest...)
	return wrapper
}
