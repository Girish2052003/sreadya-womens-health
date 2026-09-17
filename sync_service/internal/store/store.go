// Package store defines provider-independent persistence boundaries.
package store

import "context"

// Store is the minimum lifecycle contract required by the service scaffold.
type Store interface {
	Ping(context.Context) error
	Close() error
}
