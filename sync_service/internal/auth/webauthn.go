package auth

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
)

const ceremonyTTL = 5 * time.Minute

// AccountIdentity is deliberately limited to account-recovery/contact
// identity. It contains no health-vault key material or health semantics.
type AccountIdentity struct {
	AccountID string `json:"account_id"`
	Email     string `json:"email,omitempty"`
	Phone     string `json:"phone,omitempty"`
}

func (a AccountIdentity) Validate() error {
	if strings.TrimSpace(a.AccountID) == "" {
		return errors.New("account_id is required")
	}
	if strings.TrimSpace(a.Email) == "" && strings.TrimSpace(a.Phone) == "" {
		return errors.New("at least one verification channel is required")
	}
	return nil
}

type PasskeyConfig struct {
	RPID          string
	RPDisplayName string
	RPOrigins     []string
}

// PasskeyUser is the minimum Sreadya adapter for go-webauthn's User contract.
type PasskeyUser struct {
	ID          []byte
	Name        string
	DisplayName string
	Credentials []webauthn.Credential
}

func (u PasskeyUser) WebAuthnID() []byte                           { return u.ID }
func (u PasskeyUser) WebAuthnName() string                        { return u.Name }
func (u PasskeyUser) WebAuthnDisplayName() string                 { return u.DisplayName }
func (u PasskeyUser) WebAuthnCredentials() []webauthn.Credential { return u.Credentials }

type PasskeyService struct {
	engine   *webauthn.WebAuthn
	sessions *SessionStore
}

func NewPasskeyService(cfg PasskeyConfig, sessions *SessionStore) (*PasskeyService, error) {
	if sessions == nil {
		return nil, errors.New("session store is required")
	}
	engine, err := webauthn.New(&webauthn.Config{
		RPID:          strings.TrimSpace(cfg.RPID),
		RPDisplayName: strings.TrimSpace(cfg.RPDisplayName),
		RPOrigins:     append([]string(nil), cfg.RPOrigins...),
	})
	if err != nil {
		return nil, err
	}
	return &PasskeyService{engine: engine, sessions: sessions}, nil
}

func (s *PasskeyService) BeginRegistration(user PasskeyUser) (*protocol.CredentialCreation, string, error) {
	creation, session, err := s.engine.BeginRegistration(user)
	if err != nil {
		return nil, "", err
	}
	id, err := s.sessions.Put("registration", *session, ceremonyTTL)
	if err != nil {
		return nil, "", err
	}
	return creation, id, nil
}

func (s *PasskeyService) ConsumeRegistrationSession(id string) (webauthn.SessionData, error) {
	return s.sessions.Consume(id, "registration")
}

// FinishRegistration consumes the server-side ceremony exactly once before
// delegating authenticator-response verification to go-webauthn. A malformed
// or invalid response therefore cannot be replayed against the same challenge.
func (s *PasskeyService) FinishRegistration(id string, user PasskeyUser, request *http.Request) (*webauthn.Credential, error) {
	session, err := s.ConsumeRegistrationSession(id)
	if err != nil {
		return nil, err
	}
	return s.engine.FinishRegistration(user, session, request)
}

func (s *PasskeyService) BeginPasskeyLogin() (*protocol.CredentialAssertion, string, error) {
	assertion, session, err := s.engine.BeginDiscoverableLogin()
	if err != nil {
		return nil, "", err
	}
	id, err := s.sessions.Put("login", *session, ceremonyTTL)
	if err != nil {
		return nil, "", err
	}
	return assertion, id, nil
}

func (s *PasskeyService) ConsumeLoginSession(id string) (webauthn.SessionData, error) {
	return s.sessions.Consume(id, "login")
}

// FinishPasskeyLogin completes a discoverable/passkey assertion through the
// upstream verifier after consuming Sreadya's purpose-bound one-time session.
func (s *PasskeyService) FinishPasskeyLogin(id string, handler webauthn.DiscoverableUserHandler, request *http.Request) (webauthn.User, *webauthn.Credential, error) {
	session, err := s.ConsumeLoginSession(id)
	if err != nil {
		return nil, nil, err
	}
	return s.engine.FinishPasskeyLogin(handler, session, request)
}
