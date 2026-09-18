package postgres

import (
	"sreadya.dev/sync_service/internal/devices"
	sreadyasync "sreadya.dev/sync_service/internal/sync"
)

var _ devices.Lookup = (*Store)(nil)
var _ sreadyasync.Repository = (*Store)(nil)
var _ sreadyasync.AtomicRepository = (*Store)(nil)
var _ sreadyasync.PullRepository = (*Store)(nil)
