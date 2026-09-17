// Package config owns provider-independent service configuration.
package config

import (
	"errors"
	"strings"
)

// PostgreSQLTarget records the reviewed database compatibility target for C2.
const PostgreSQLTarget = "18.6"

// Config contains only deployment-neutral service settings.
type Config struct {
	ListenAddress    string
	DatabaseURL      string
	PostgreSQLTarget string
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

	return Config{
		ListenAddress:    listenAddress,
		DatabaseURL:      strings.TrimSpace(databaseURL),
		PostgreSQLTarget: PostgreSQLTarget,
	}, nil
}
