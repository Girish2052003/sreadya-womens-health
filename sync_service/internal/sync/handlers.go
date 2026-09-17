package sync

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"
)

type SyncAPI interface {
	Push(context.Context, Session, Envelope) (Ack, error)
	Pull(context.Context, Session, string, string, int) (PullPage, error)
}

type SessionResolver interface {
	Resolve(*http.Request) (Session, error)
}

type Handler struct {
	api      SyncAPI
	sessions SessionResolver
}

func NewHandler(api SyncAPI, sessions SessionResolver) http.Handler {
	return &Handler{api: api, sessions: sessions}
}

type envelopeJSON struct {
	AccountID        string    `json:"account_id"`
	VaultID          string    `json:"vault_id"`
	EventID          string    `json:"event_id"`
	ObjectID         string    `json:"object_id"`
	SourceDeviceID   string    `json:"source_device_id"`
	KeyEpoch         int64     `json:"key_epoch"`
	ProtocolVersion  int64     `json:"protocol_version"`
	SuiteID          string    `json:"suite_id"`
	SchemaID         string    `json:"schema_id"`
	BaseRevision     int64     `json:"base_revision"`
	Operation        string    `json:"operation"`
	KDFSalt          []byte    `json:"kdf_salt"`
	Nonce            []byte    `json:"nonce"`
	CiphertextAndTag []byte    `json:"ciphertext_and_tag"`
	EnvelopeDigest   []byte    `json:"envelope_digest"`
	CreatedAt        time.Time `json:"created_at"`
}

type ackJSON struct {
	EventID           string `json:"event_id"`
	CommittedRevision int64  `json:"committed_revision"`
	Conflict          bool   `json:"conflict"`
	Existing          bool   `json:"existing"`
}

type storedEventJSON struct {
	envelopeJSON
	CommittedRevision int64 `json:"committed_revision"`
	Conflict          bool  `json:"conflict"`
}

type pullPageJSON struct {
	Events     []storedEventJSON `json:"events"`
	NextCursor string            `json:"next_cursor"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")

	session, err := h.sessions.Resolve(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/v1/sync/push":
		h.handlePush(w, r, session)
	case r.Method == http.MethodGet && r.URL.Path == "/v1/sync/pull":
		h.handlePull(w, r, session)
	case r.URL.Path == "/v1/sync/push" || r.URL.Path == "/v1/sync/pull":
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	default:
		writeError(w, http.StatusNotFound, "not found")
	}
}

func (h *Handler) handlePush(w http.ResponseWriter, r *http.Request, session Session) {
	var wire envelopeJSON
	if err := json.NewDecoder(r.Body).Decode(&wire); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	ack, err := h.api.Push(r.Context(), session, wire.envelope())
	if err != nil {
		writeAPIError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ackJSON{
		EventID:           ack.EventID,
		CommittedRevision: ack.CommittedRevision,
		Conflict:          ack.Conflict,
		Existing:          ack.Existing,
	})
}

func (h *Handler) handlePull(w http.ResponseWriter, r *http.Request, session Session) {
	query := r.URL.Query()
	vaultID := query.Get("vault_id")
	if vaultID == "" {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}
	cursor := query.Get("cursor")
	limit64, err := strconv.ParseInt(query.Get("limit"), 10, 32)
	if err != nil || limit64 < 1 || limit64 > 1000 {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	page, err := h.api.Pull(r.Context(), session, vaultID, cursor, int(limit64))
	if err != nil {
		writeAPIError(w, err)
		return
	}
	events := make([]storedEventJSON, 0, len(page.Events))
	for _, event := range page.Events {
		events = append(events, storedEventJSON{
			envelopeJSON:      envelopeToJSON(event.Envelope),
			CommittedRevision: event.CommittedRevision,
			Conflict:          event.Conflict,
		})
	}
	writeJSON(w, http.StatusOK, pullPageJSON{Events: events, NextCursor: page.NextCursor})
}

func (wire envelopeJSON) envelope() Envelope {
	return Envelope{
		AccountID:        wire.AccountID,
		VaultID:          wire.VaultID,
		EventID:          wire.EventID,
		ObjectID:         wire.ObjectID,
		SourceDeviceID:   wire.SourceDeviceID,
		KeyEpoch:         wire.KeyEpoch,
		ProtocolVersion:  wire.ProtocolVersion,
		SuiteID:          wire.SuiteID,
		SchemaID:         wire.SchemaID,
		BaseRevision:     wire.BaseRevision,
		Operation:        wire.Operation,
		KDFSalt:          wire.KDFSalt,
		Nonce:            wire.Nonce,
		CiphertextAndTag: wire.CiphertextAndTag,
		EnvelopeDigest:   wire.EnvelopeDigest,
		CreatedAt:        wire.CreatedAt,
	}
}

func envelopeToJSON(envelope Envelope) envelopeJSON {
	return envelopeJSON{
		AccountID:        envelope.AccountID,
		VaultID:          envelope.VaultID,
		EventID:          envelope.EventID,
		ObjectID:         envelope.ObjectID,
		SourceDeviceID:   envelope.SourceDeviceID,
		KeyEpoch:         envelope.KeyEpoch,
		ProtocolVersion:  envelope.ProtocolVersion,
		SuiteID:          envelope.SuiteID,
		SchemaID:         envelope.SchemaID,
		BaseRevision:     envelope.BaseRevision,
		Operation:        envelope.Operation,
		KDFSalt:          envelope.KDFSalt,
		Nonce:            envelope.Nonce,
		CiphertextAndTag: envelope.CiphertextAndTag,
		EnvelopeDigest:   envelope.EnvelopeDigest,
		CreatedAt:        envelope.CreatedAt,
	}
}

func writeAPIError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrCrossAccount):
		writeError(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, ErrEnvelopeTooLarge):
		writeError(w, http.StatusRequestEntityTooLarge, "request too large")
	case errors.Is(err, ErrEventIDReuse):
		writeError(w, http.StatusConflict, "event conflict")
	case errors.Is(err, ErrInvalidCursor), errors.Is(err, ErrInvalidPullLimit):
		writeError(w, http.StatusBadRequest, "invalid request")
	default:
		writeError(w, http.StatusInternalServerError, "request failed")
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, struct {
		Error string `json:"error"`
	}{Error: message})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
