package auth

import (
	"bytes"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestAccountIdentityAcceptsEmailPhoneOrBoth(t *testing.T) {
	cases := []AccountIdentity{
		{AccountID: "acct-email", Email: "wife@example.com"},
		{AccountID: "acct-phone", Phone: "+358401234567"},
		{AccountID: "acct-both", Email: "wife@example.com", Phone: "+358401234567"},
	}

	for _, identity := range cases {
		if err := identity.Validate(); err != nil {
			t.Fatalf("identity %+v should be valid: %v", identity, err)
		}
	}
}

func TestAccountIdentityRejectsMissingVerificationChannel(t *testing.T) {
	identity := AccountIdentity{AccountID: "acct-none"}
	if err := identity.Validate(); err == nil {
		t.Fatal("identity without email or phone must be rejected")
	}
}

func TestAccountIdentityBoundaryContainsNoVaultOrHealthFields(t *testing.T) {
	typeOf := reflect.TypeOf(AccountIdentity{})
	forbidden := []string{"vault", "health", "period", "symptom", "pregnancy", "fertility", "secret", "rootkey"}
	for i := 0; i < typeOf.NumField(); i++ {
		field := strings.ToLower(typeOf.Field(i).Name + " " + string(typeOf.Field(i).Tag))
		for _, term := range forbidden {
			if strings.Contains(field, term) {
				t.Fatalf("AccountIdentity field %q crosses account/vault separation with term %q", typeOf.Field(i).Name, term)
			}
		}
	}
}

func TestPasskeyServiceBeginsRegistrationAndStoresOneTimeSession(t *testing.T) {
	now := time.Date(2026, 9, 17, 1, 0, 0, 0, time.UTC)
	sessions := NewSessionStore(
		func() time.Time { return now },
		func() (string, error) { return "registration-session", nil },
	)
	service, err := NewPasskeyService(PasskeyConfig{
		RPID:          "example.com",
		RPDisplayName: "Sreva",
		RPOrigins:     []string{"https://example.com"},
	}, sessions)
	if err != nil {
		t.Fatal(err)
	}

	user := PasskeyUser{
		ID:          []byte("0123456789abcdef"),
		Name:        "wife@example.com",
		DisplayName: "Sreva User",
	}
	creation, sessionID, err := service.BeginRegistration(user)
	if err != nil {
		t.Fatal(err)
	}
	if creation == nil || sessionID != "registration-session" {
		t.Fatalf("unexpected begin-registration result: creation=%v session=%q", creation, sessionID)
	}

	session, err := service.ConsumeRegistrationSession(sessionID)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(session.UserID, user.ID) {
		t.Fatalf("stored registration user id = %q, want %q", session.UserID, user.ID)
	}
	if session.Challenge == "" {
		t.Fatal("registration session challenge must be populated by WebAuthn")
	}
}

func TestPasskeyServiceBeginsDiscoverableLogin(t *testing.T) {
	now := time.Date(2026, 9, 17, 1, 0, 0, 0, time.UTC)
	sessions := NewSessionStore(
		func() time.Time { return now },
		func() (string, error) { return "login-session", nil },
	)
	service, err := NewPasskeyService(PasskeyConfig{
		RPID:          "example.com",
		RPDisplayName: "Sreva",
		RPOrigins:     []string{"https://example.com"},
	}, sessions)
	if err != nil {
		t.Fatal(err)
	}

	assertion, sessionID, err := service.BeginPasskeyLogin()
	if err != nil {
		t.Fatal(err)
	}
	if assertion == nil || sessionID != "login-session" {
		t.Fatalf("unexpected begin-login result: assertion=%v session=%q", assertion, sessionID)
	}

	session, err := service.ConsumeLoginSession(sessionID)
	if err != nil {
		t.Fatal(err)
	}
	if len(session.UserID) != 0 {
		t.Fatalf("discoverable login must not pre-bind a user id, got %q", session.UserID)
	}
	if session.Challenge == "" {
		t.Fatal("login session challenge must be populated by WebAuthn")
	}
}
