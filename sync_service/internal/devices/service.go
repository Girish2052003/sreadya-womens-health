package devices

import (
	"context"
	"errors"
)

var (
	ErrDeviceNotFound = errors.New("device not found")
	ErrCrossAccount   = errors.New("device does not belong to account")
	ErrDeviceRevoked  = errors.New("device is revoked")
	ErrDeviceInactive = errors.New("device is not active")
)

type State string

const (
	StatePending State = "pending"
	StateActive  State = "active"
	StateRevoked State = "revoked"
)

type Record struct {
	DeviceID         string
	AccountID        string
	State            State
	PublicSigningKey [32]byte
	SignatureSuite   string
}

type Lookup interface {
	Device(context.Context, string) (Record, error)
}

type Service struct {
	lookup Lookup
}

func NewService(lookup Lookup) *Service {
	return &Service{lookup: lookup}
}

func (s *Service) Authorize(ctx context.Context, accountID, deviceID string) error {
	record, err := s.lookup.Device(ctx, deviceID)
	if err != nil {
		return err
	}
	if record.AccountID != accountID {
		return ErrCrossAccount
	}
	switch record.State {
	case StateActive:
		return nil
	case StateRevoked:
		return ErrDeviceRevoked
	default:
		return ErrDeviceInactive
	}
}
