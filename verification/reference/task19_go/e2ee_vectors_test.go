package task19

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/hkdf"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"testing"
)

type envelopeVector struct {
	IKMHex              string `json:"ikmHex"`
	SaltHex             string `json:"saltHex"`
	InfoHex             string `json:"infoHex"`
	DerivedKeyHex       string `json:"derivedKeyHex"`
	NonceHex            string `json:"nonceHex"`
	AADHex              string `json:"aadHex"`
	CiphertextAndTagHex string `json:"ciphertextAndTagHex"`
	PlaintextHex        string `json:"plaintextHex"`
}

type deviceAuthVector struct {
	PublicKeyHex  string `json:"publicKeyHex"`
	TranscriptHex string `json:"transcriptHex"`
	SignatureHex  string `json:"signatureHex"`
}

type vectorFile struct {
	RecoveryEnvelope      envelopeVector   `json:"recoveryEnvelope"`
	TrustedDeviceTransfer envelopeVector   `json:"trustedDeviceTransfer"`
	SyncEvent             envelopeVector   `json:"syncEvent"`
	DeviceAuthentication  deviceAuthVector `json:"deviceAuthentication"`
}

func mustHex(t *testing.T, value string) []byte {
	t.Helper()
	out, err := hex.DecodeString(value)
	if err != nil {
		t.Fatalf("decode hex: %v", err)
	}
	return out
}

func loadVector(t *testing.T) vectorFile {
	t.Helper()
	contents, err := os.ReadFile("../../../shared/crypto/interoperability-vectors/e2ee-v1.json")
	if err != nil {
		t.Fatalf("read vector: %v", err)
	}
	var vector vectorFile
	if err := json.Unmarshal(contents, &vector); err != nil {
		t.Fatalf("parse vector: %v", err)
	}
	return vector
}

func verifyEnvelope(t *testing.T, entry envelopeVector) {
	t.Helper()
	ikm := mustHex(t, entry.IKMHex)
	salt := mustHex(t, entry.SaltHex)
	info := mustHex(t, entry.InfoHex)
	key, err := hkdf.Key(sha256.New, ikm, salt, string(info), 32)
	if err != nil {
		t.Fatalf("HKDF: %v", err)
	}
	if !bytes.Equal(key, mustHex(t, entry.DerivedKeyHex)) {
		t.Fatalf("derived key mismatch")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		t.Fatalf("AES key: %v", err)
	}
	var gcm cipher.AEAD
	gcm, err = cipher.NewGCM(block)
	if err != nil {
		t.Fatalf("AES-GCM: %v", err)
	}
	clear, err := gcm.Open(
		nil,
		mustHex(t, entry.NonceHex),
		mustHex(t, entry.CiphertextAndTagHex),
		mustHex(t, entry.AADHex),
	)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if !bytes.Equal(clear, mustHex(t, entry.PlaintextHex)) {
		t.Fatalf("plaintext mismatch")
	}
}

func TestE2EEV1Envelopes(t *testing.T) {
	vector := loadVector(t)
	verifyEnvelope(t, vector.RecoveryEnvelope)
	verifyEnvelope(t, vector.TrustedDeviceTransfer)
	verifyEnvelope(t, vector.SyncEvent)
}

func TestE2EEV1DeviceAuthenticationSignature(t *testing.T) {
	entry := loadVector(t).DeviceAuthentication
	publicKey := mustHex(t, entry.PublicKeyHex)
	if len(publicKey) != ed25519.PublicKeySize {
		t.Fatalf("Ed25519 public key must be %d bytes, got %d", ed25519.PublicKeySize, len(publicKey))
	}
	signature := mustHex(t, entry.SignatureHex)
	if len(signature) != ed25519.SignatureSize {
		t.Fatalf("Ed25519 signature must be %d bytes, got %d", ed25519.SignatureSize, len(signature))
	}
	if !ed25519.Verify(ed25519.PublicKey(publicKey), mustHex(t, entry.TranscriptHex), signature) {
		t.Fatalf("device authentication signature did not verify")
	}
}
