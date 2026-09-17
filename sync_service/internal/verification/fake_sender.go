package verification

import (
	"context"
	"sync"
)

// FakeSender is a deterministic local/test adapter. It deliberately performs
// no network I/O and is not a production delivery provider.
type FakeSender struct {
	mu       sync.Mutex
	messages []Message
}

func NewFakeSender() *FakeSender { return &FakeSender{} }

func (f *FakeSender) Send(_ context.Context, message Message) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.messages = append(f.messages, message)
	return nil
}

func (f *FakeSender) Sent() []Message {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]Message(nil), f.messages...)
}
