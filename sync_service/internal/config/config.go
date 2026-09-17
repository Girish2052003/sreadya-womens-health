// Package config owns provider-independent service configuration.
package config

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// PostgreSQLTarget records the reviewed database compatibility target for C2.
const PostgreSQLTarget = "18.6"

// Config contains only deployment-neutral service settings.
type Config struct {
	ListenAddress    string
	DatabaseURL      string
	PostgreSQLTarget string
	OTPEnabled       bool
}

// LoadFromLookup builds configuration from an environment-like lookup function.
// Keeping lookup injectable makes the configuration boundary deterministic in tests
// and avoids coupling the package to any hosting provider.
func LoadFromLookup(lookup func(string) (string, bool)) (Config, error) {
	databaseURL, ok := lookup("SREVA_SYNC_DATABASE_URL")
	if !ok || strings.TrimSpace(databaseURL) == "" {
		return Config{}, errors.New("SREVA_SYNC_DATABASE_URL is required")
	}

	listenAddress := ":8080"
	if value, ok := lookup("SREVA_SYNC_LISTEN_ADDR"); ok && strings.TrimSpace(value) != "" {
		listenAddress = strings.TrimSpace(value)
	}

	otpEnabled := false
	if value, ok := lookup("SREVA_SYNC_OTP_ENABLED"); ok && strings.TrimSpace(value) != "" {
		parsed, err := strconv.ParseBool(strings.TrimSpace(value))
		if err != nil {
			return Config{}, fmt.Errorf("SREVA_SYNC_OTP_ENABLED must be a boolean: %w", err)
		}
		otpEnabled = parsed
	}
	if otpEnabled {
		return Config{}, errors.New("OTP verification routes require an approved production verification sender; none is configured")
	}

	return Config{
		ListenAddress:    listenAddress,
		DatabaseURL:      strings.TrimSpace(databaseURL),
		PostgreSQLTarget: PostgreSQLTarget,
		OTPEnabled:       false,
	}, nil
}
