package httpapi

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"sreadya.dev/sync_service/internal/continuity"
	"sreadya.dev/sync_service/internal/deviceauth"
	"sreadya.dev/sync_service/internal/devices"
)

const continuityChallengeTTL = 2 * time.Minute

const (
	continuityChallengeHeader = "X-Sreadya-Device-Challenge"
	continuitySignatureHeader = "X-Sreadya-Device-Signature"
)

type ContinuitySession struct {
	AccountID string
	DeviceID  string
}

type ContinuitySessionResolver interface {
	Resolve(*http.Request) (ContinuitySession, error)
}

type ContinuityDeviceAuthorizer interface {
	Issue(context.Context, deviceauth.Scope, time.Duration) (string, error)
	Verify(context.Context, deviceauth.Request) error
}

type ContinuityAPI interface {
	ApproveDevice(context.Context, string, string, string) error
	RevokeDevice(context.Context, string, string, string) error
	SaveRecoveryWrapper(context.Context, string, string, continuity.RecoveryWrapper) error
	LoadRecoveryWrapper(context.Context, string, string) (continuity.RecoveryWrapper, error)
	DeleteAccount(context.Context, string) (continuity.DeletionReceipt, error)
}

type continuityChallengeRequest struct {
	Action         string `json:"action"`
	TargetDeviceID string `json:"target_device_id,omitempty"`
	VaultID        string `json:"vault_id,omitempty"`
	BodySHA256     string `json:"body_sha256"`
}

type continuityChallengeResponse struct {
	Challenge string `json:"challenge"`
}

type recoveryWrapperJSON struct {
	KeyEpoch         int64  `json:"key_epoch"`
	ProtocolVersion  int64  `json:"protocol_version"`
	SuiteID          string `json:"suite_id"`
	KDFSalt          []byte `json:"kdf_salt"`
	Nonce            []byte `json:"nonce"`
	CiphertextAndTag []byte `json:"ciphertext_and_tag"`
	EnvelopeDigest   []byte `json:"envelope_digest"`
}

type deletionReceiptJSON struct {
	ServerStateDeleted       bool `json:"server_state_deleted"`
	FormerDeviceCopiesErased bool `json:"former_device_copies_erased"`
}

func WithContinuityAPI(api ContinuityAPI) RouterOption {
	return func(cfg *routerConfig) { cfg.continuity = api }
}

func WithContinuitySessionResolver(resolver ContinuitySessionResolver) RouterOption {
	return func(cfg *routerConfig) { cfg.continuitySessions = resolver }
}

func WithContinuityDeviceAuthorizer(authorizer ContinuityDeviceAuthorizer) RouterOption {
	return func(cfg *routerConfig) { cfg.continuityDeviceAuth = authorizer }
}

func registerContinuityRoutes(router chi.Router, api ContinuityAPI, sessions ContinuitySessionResolver, deviceAuth ContinuityDeviceAuthorizer) {
	router.Post("/v1/continuity/challenge", func(w http.ResponseWriter, r *http.Request) {
		setContinuityNoStore(w)
		session, ok := resolveContinuitySession(w, r, sessions, true)
		if !ok {
			return
		}

		var request continuityChallengeRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		digest, err := hex.DecodeString(strings.TrimSpace(request.BodySHA256))
		if err != nil || len(digest) != sha256.Size {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		scope, ok := continuityScopeForChallenge(session, request, digest)
		if !ok {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		challenge, err := deviceAuth.Issue(r.Context(), scope, continuityChallengeTTL)
		if err != nil {
			writeStatus(w, http.StatusInternalServerError, "request_failed")
			return
		}
		writeJSON(w, http.StatusOK, continuityChallengeResponse{Challenge: challenge})
	})

	router.Post("/v1/devices/{deviceID}/approve", func(w http.ResponseWriter, r *http.Request) {
		setContinuityNoStore(w)
		session, ok := resolveContinuitySession(w, r, sessions, true)
		if !ok {
			return
		}
		targetID := strings.TrimSpace(chi.URLParam(r, "deviceID"))
		if targetID == "" {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		if !verifyContinuityMutation(w, r, deviceAuth, session, "device.approve", http.MethodPost, "/v1/devices/"+targetID+"/approve", body) {
			return
		}
		if err := api.ApproveDevice(r.Context(), session.AccountID, session.DeviceID, targetID); err != nil {
			writeContinuityError(w, err)
			return
		}
		writeStatus(w, http.StatusOK, "approved")
	})

	router.Post("/v1/devices/{deviceID}/revoke", func(w http.ResponseWriter, r *http.Request) {
		setContinuityNoStore(w)
		session, ok := resolveContinuitySession(w, r, sessions, true)
		if !ok {
			return
		}
		targetID := strings.TrimSpace(chi.URLParam(r, "deviceID"))
		if targetID == "" {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		if !verifyContinuityMutation(w, r, deviceAuth, session, "device.revoke", http.MethodPost, "/v1/devices/"+targetID+"/revoke", body) {
			return
		}
		if err := api.RevokeDevice(r.Context(), session.AccountID, session.DeviceID, targetID); err != nil {
			writeContinuityError(w, err)
			return
		}
		writeStatus(w, http.StatusOK, "revoked")
	})

	router.Put("/v1/recovery/{vaultID}", func(w http.ResponseWriter, r *http.Request) {
		setContinuityNoStore(w)
		session, ok := resolveContinuitySession(w, r, sessions, true)
		if !ok {
			return
		}
		vaultID := strings.TrimSpace(chi.URLParam(r, "vaultID"))
		if vaultID == "" {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		if !verifyContinuityMutation(w, r, deviceAuth, session, "recovery.put", http.MethodPut, "/v1/recovery/"+vaultID, body) {
			return
		}
		var wire recoveryWrapperJSON
		if err := json.Unmarshal(body, &wire); err != nil {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		wrapper := continuity.RecoveryWrapper{
			AccountID:        session.AccountID,
			VaultID:          vaultID,
			KeyEpoch:         wire.KeyEpoch,
			ProtocolVersion:  wire.ProtocolVersion,
			SuiteID:          wire.SuiteID,
			KDFSalt:          wire.KDFSalt,
			Nonce:            wire.Nonce,
			CiphertextAndTag: wire.CiphertextAndTag,
			EnvelopeDigest:   wire.EnvelopeDigest,
		}
		if err := api.SaveRecoveryWrapper(r.Context(), session.AccountID, session.DeviceID, wrapper); err != nil {
			writeContinuityError(w, err)
			return
		}
		writeStatus(w, http.StatusOK, "stored")
	})

	router.Get("/v1/recovery/{vaultID}", func(w http.ResponseWriter, r *http.Request) {
		setContinuityNoStore(w)
		session, ok := resolveContinuitySession(w, r, sessions, false)
		if !ok {
			return
		}
		vaultID := strings.TrimSpace(chi.URLParam(r, "vaultID"))
		if vaultID == "" {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		wrapper, err := api.LoadRecoveryWrapper(r.Context(), session.AccountID, vaultID)
		if err != nil {
			writeContinuityError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, recoveryWrapperJSON{
			KeyEpoch:         wrapper.KeyEpoch,
			ProtocolVersion:  wrapper.ProtocolVersion,
			SuiteID:          wrapper.SuiteID,
			KDFSalt:          wrapper.KDFSalt,
			Nonce:            wrapper.Nonce,
			CiphertextAndTag: wrapper.CiphertextAndTag,
			EnvelopeDigest:   wrapper.EnvelopeDigest,
		})
	})

	router.Delete("/v1/account", func(w http.ResponseWriter, r *http.Request) {
		setContinuityNoStore(w)
		session, ok := resolveContinuitySession(w, r, sessions, true)
		if !ok {
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			writeStatus(w, http.StatusBadRequest, "invalid_request")
			return
		}
		if !verifyContinuityMutation(w, r, deviceAuth, session, "account.delete", http.MethodDelete, "/v1/account", body) {
			return
		}
		receipt, err := api.DeleteAccount(r.Context(), session.AccountID)
		if err != nil {
			writeContinuityError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, deletionReceiptJSON{
			ServerStateDeleted:       receipt.ServerStateDeleted,
			FormerDeviceCopiesErased: receipt.FormerDeviceCopiesErased,
		})
	})
}

func resolveContinuitySession(w http.ResponseWriter, r *http.Request, resolver ContinuitySessionResolver, requireDevice bool) (ContinuitySession, bool) {
	if resolver == nil {
		writeStatus(w, http.StatusUnauthorized, "unauthorized")
		return ContinuitySession{}, false
	}
	session, err := resolver.Resolve(r)
	if err != nil || strings.TrimSpace(session.AccountID) == "" || (requireDevice && strings.TrimSpace(session.DeviceID) == "") {
		writeStatus(w, http.StatusUnauthorized, "unauthorized")
		return ContinuitySession{}, false
	}
	return session, true
}

func continuityScopeForChallenge(session ContinuitySession, request continuityChallengeRequest, digest []byte) (deviceauth.Scope, bool) {
	var method, path string
	switch request.Action {
	case "device.approve":
		if !safeContinuityID(request.TargetDeviceID) {
			return deviceauth.Scope{}, false
		}
		method = http.MethodPost
		path = "/v1/devices/" + strings.TrimSpace(request.TargetDeviceID) + "/approve"
	case "device.revoke":
		if !safeContinuityID(request.TargetDeviceID) {
			return deviceauth.Scope{}, false
		}
		method = http.MethodPost
		path = "/v1/devices/" + strings.TrimSpace(request.TargetDeviceID) + "/revoke"
	case "recovery.put":
		if !safeContinuityID(request.VaultID) {
			return deviceauth.Scope{}, false
		}
		method = http.MethodPut
		path = "/v1/recovery/" + strings.TrimSpace(request.VaultID)
	case "account.delete":
		method = http.MethodDelete
		path = "/v1/account"
	default:
		return deviceauth.Scope{}, false
	}
	return deviceauth.Scope{
		AccountID:  session.AccountID,
		DeviceID:   session.DeviceID,
		Action:     request.Action,
		Method:     method,
		Path:       path,
		BodySHA256: append([]byte(nil), digest...),
	}, true
}

func safeContinuityID(value string) bool {
	value = strings.TrimSpace(value)
	return value != "" && !strings.ContainsAny(value, "/?#")
}

func verifyContinuityMutation(w http.ResponseWriter, r *http.Request, authorizer ContinuityDeviceAuthorizer, session ContinuitySession, action, method, path string, body []byte) bool {
	if authorizer == nil {
		writeStatus(w, http.StatusUnauthorized, "unauthorized")
		return false
	}
	challenge := strings.TrimSpace(r.Header.Get(continuityChallengeHeader))
	signatureText := strings.TrimSpace(r.Header.Get(continuitySignatureHeader))
	if challenge == "" || signatureText == "" {
		writeStatus(w, http.StatusUnauthorized, "unauthorized")
		return false
	}
	signature, err := base64.StdEncoding.DecodeString(signatureText)
	if err != nil {
		writeStatus(w, http.StatusUnauthorized, "unauthorized")
		return false
	}
	digest := sha256.Sum256(body)
	if err := authorizer.Verify(r.Context(), deviceauth.Request{
		Scope: deviceauth.Scope{
			AccountID:  session.AccountID,
			DeviceID:   session.DeviceID,
			Action:     action,
			Method:     method,
			Path:       path,
			BodySHA256: digest[:],
		},
		Challenge: challenge,
		Signature: signature,
	}); err != nil {
		writeStatus(w, http.StatusUnauthorized, "unauthorized")
		return false
	}
	return true
}

func writeContinuityError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, continuity.ErrRecoveryWrapperNotFound):
		writeStatus(w, http.StatusNotFound, "not_found")
	case errors.Is(err, continuity.ErrInvalidRecoveryWrapper):
		writeStatus(w, http.StatusBadRequest, "invalid_request")
	case errors.Is(err, continuity.ErrTargetNotPending):
		writeStatus(w, http.StatusConflict, "device_state_conflict")
	case errors.Is(err, devices.ErrCrossAccount):
		writeStatus(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, devices.ErrDeviceRevoked), errors.Is(err, devices.ErrDeviceInactive), errors.Is(err, devices.ErrDeviceNotFound):
		writeStatus(w, http.StatusUnauthorized, "unauthorized")
	default:
		writeStatus(w, http.StatusInternalServerError, "request_failed")
	}
}

func setContinuityNoStore(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-store")
}
