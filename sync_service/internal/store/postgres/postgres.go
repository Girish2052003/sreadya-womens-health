// Package postgres provides the PostgreSQL implementation boundary.
package postgres

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"sreva.dev/sync_service/internal/store"
)

// TargetVersion is the reviewed PostgreSQL compatibility target.
const TargetVersion = "18.6"

// Store adapts pgxpool to the provider-independent persistence lifecycle.
type Store struct {
	pool *pgxpool.Pool
}

var _ store.Store = (*Store)(nil)

// Open creates a PostgreSQL-backed store without assuming any cloud provider.
func Open(ctx context.Context, databaseURL string) (*Store, error) {
	if strings.TrimSpace(databaseURL) == "" {
		return nil, errors.New("database URL is required")
	}

	pool, err := pgxpool.New(ctx, strings.TrimSpace(databaseURL))
	if err != nil {
		return nil, err
	}
	return &Store{pool: pool}, nil
}

// Ping reports whether PostgreSQL is reachable.
func (s *Store) Ping(ctx context.Context) error {
	if s == nil || s.pool == nil {
		return errors.New("postgres store is not open")
	}
	return s.pool.Ping(ctx)
}

// Close releases database resources. It is safe to call on an unopened store.
func (s *Store) Close() error {
	if s == nil || s.pool == nil {
		return nil
	}
	s.pool.Close()
	return nil
}
