package config

import (
	"strings"
	"testing"
)

func TestOTPRouteEnablementFailsClosedWithoutApprovedProductionSender(t *testing.T) {
	values := map[string]string{
		"SREVA_SYNC_DATABASE_URL": "postgres://example.invalid/sreva",
		"SREVA_SYNC_OTP_ENABLED":  "true",
	}
	_, err := LoadFromLookup(func(key string) (string, bool) {
		value, ok := values[key]
		return value, ok
	})
	if err == nil {
		t.Fatal("OTP enablement must fail closed while no approved production VerificationSender exists")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "verification") || !strings.Contains(strings.ToLower(err.Error()), "sender") {
		t.Fatalf("fail-closed error must explain the sender boundary, got %q", err)
	}
}

func TestOTPRouteDisabledKeepsProviderIndependentConfigValid(t *testing.T) {
	values := map[string]string{
		"SREVA_SYNC_DATABASE_URL": "postgres://example.invalid/sreva",
		"SREVA_SYNC_OTP_ENABLED":  "false",
	}
	cfg, err := LoadFromLookup(func(key string) (string, bool) {
		value, ok := values[key]
		return value, ok
	})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.OTPEnabled {
		t.Fatal("OTPEnabled must remain false without an approved production sender")
	}
}
