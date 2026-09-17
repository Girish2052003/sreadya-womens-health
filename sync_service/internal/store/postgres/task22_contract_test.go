package postgres

import (
	"sreva.dev/sync_service/internal/devices"
	srevasync "sreva.dev/sync_service/internal/sync"
)

var _ devices.Lookup = (*Store)(nil)
var _ srevasync.Repository = (*Store)(nil)
var _ srevasync.AtomicRepository = (*Store)(nil)
var _ srevasync.PullRepository = (*Store)(nil)
