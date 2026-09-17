package sync

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"sreva.dev/sync_service/internal/deviceauth"
)

const challengeTTL = 2 * time.Minute

const (
	challengeHeader = "X-Sreva-Device-Challenge"
	signatureHeader = "X-Sreva-Device-Signature"
)

type SyncAPI interface {
	Push(context.Context, Session, Envelope) (Ack, error)
	Pull(context.Context, Session, string, string, int) (PullPage, error)
}

type SessionResolver interface {
	Resolve(*http.Request) (Session, error)
}

type SignedDeviceAuthorizer interface {
	Issue(context.Context, deviceauth.Scope, time.Duration) (string, error)
	Verify(context.Context, deviceauth.Request) error
}

type Handler struct {
	api        SyncAPI
	sessions   SessionResolver
	deviceAuth SignedDeviceAuthorizer
}

func NewHandler(api SyncAPI, sessions SessionResolver, deviceAuth SignedDeviceAuthorizer) http.Handler {
	return &Handler{api: api, sessions: sessions, deviceAuth: deviceAuth}
}

type challengeRequestJSON struct {
	Action     string `json:"action"`
	BodySHA256 string `json:"body_sha256"`
	VaultID    string `json:"vault_id"`
	Cursor     string `json:"cursor"`
	Limit      int    `json:"limit"`
}

type challengeResponseJSON struct {
	Challenge string `json:"challenge"`
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
	case r.Method == http.MethodPost && r.URL.Path == "/v1/sync/challenge":
		h.handleChallenge(w, r, session)
	case r.Method == http.MethodPost && r.URL.Path == "/v1/sync/push":
		h.handlePush(w, r, session)
	case r.Method == http.MethodGet && r.URL.Path == "/v1/sync/pull":
		h.handlePull(w, r, session)
	case r.URL.Path == "/v1/sync/challenge" || r.URL.Path == "/v1/sync/push" || r.URL.Path == "/v1/sync/pull":
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	default:
		writeError(w, http.StatusNotFound, "not found")
	}
}

func (h *Handler) handleChallenge(w http.ResponseWriter, r *http.Request, session Session) {
	if h.deviceAuth == nil {
		writeError(w, http.StatusInternalServerError, "request failed")
		return
	}

	var wire challengeRequestJSON
	if err := json.NewDecoder(r.Body).Decode(&wire); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	var scope deviceauth.Scope
	switch wire.Action {
	case "sync.push":
		digest, err := hex.DecodeString(wire.BodySHA256)
		if err != nil || len(digest) != sha256.Size {
			writeError(w, http.StatusBadRequest, "invalid request")
			return
		}
		scope = deviceauth.Scope{
			AccountID:  session.AccountID,
			DeviceID:   session.DeviceID,
			Action:     "sync.push",
			Method:     http.MethodPost,
			Path:       "/v1/sync/push",
			BodySHA256: digest,
		}
	case "sync.pull":
		if wire.VaultID == "" || wire.Limit < 1 || wire.Limit > 1000 {
			writeError(w, http.StatusBadRequest, "invalid request")
			return
		}
		digest := sha256.Sum256(nil)
		scope = deviceauth.Scope{
			AccountID:  session.AccountID,
			DeviceID:   session.DeviceID,
			Action:     "sync.pull",
			Method:     http.MethodGet,
			Path:       canonicalPullTarget(wire.VaultID, wire.Cursor, wire.Limit),
			BodySHA256: digest[:],
		}
	default:
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	challenge, err := h.deviceAuth.Issue(r.Context(), scope, challengeTTL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "request failed")
		return
	}
	writeJSON(w, http.StatusOK, challengeResponseJSON{Challenge: challenge})
}

func (h *Handler) handlePush(w http.ResponseWriter, r *http.Request, session Session) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}
	digest := sha256.Sum256(body)
	if err := h.verifySignedRequest(r, deviceauth.Scope{
		AccountID:  session.AccountID,
		DeviceID:   session.DeviceID,
		Action:     "sync.push",
		Method:     http.MethodPost,
		Path:       "/v1/sync/push",
		BodySHA256: digest[:],
	}); err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var wire envelopeJSON
	if err := json.Unmarshal(body, &wire); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}
	if wire.SourceDeviceID != session.DeviceID {
		writeError(w, http.StatusForbidden, "forbidden")
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
	limit := int(limit64)
	digest := sha256.Sum256(nil)
	if err := h.verifySignedRequest(r, deviceauth.Scope{
		AccountID:  session.AccountID,
		DeviceID:   session.DeviceID,
		Action:     "sync.pull",
		Method:     http.MethodGet,
		Path:       canonicalPullTarget(vaultID, cursor, limit),
		BodySHA256: digest[:],
	}); err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	page, err := h.api.Pull(r.Context(), session, vaultID, cursor, limit)
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

func (h *Handler) verifySignedRequest(r *http.Request, scope deviceauth.Scope) error {
	if h.deviceAuth == nil {
		return deviceauth.ErrInvalidSignature
	}
	challenge := strings.TrimSpace(r.Header.Get(challengeHeader))
	signatureText := strings.TrimSpace(r.Header.Get(signatureHeader))
	if challenge == "" || signatureText == "" {
		return deviceauth.ErrInvalidSignature
	}
	signature, err := base64.StdEncoding.DecodeString(signatureText)
	if err != nil {
		return deviceauth.ErrInvalidSignature
	}
	return h.deviceAuth.Verify(r.Context(), deviceauth.Request{
		Scope:     scope,
		Challenge: challenge,
		Signature: signature,
	})
}

func canonicalPullTarget(vaultID, cursor string, limit int) string {
	query := url.Values{}
	query.Set("cursor", cursor)
	query.Set("limit", strconv.Itoa(limit))
	query.Set("vault_id", vaultID)
	return "/v1/sync/pull?" + query.Encode()
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
