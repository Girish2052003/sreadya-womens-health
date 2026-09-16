package task19

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/hkdf"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math/big"
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
	PublicXHex         string `json:"publicXHex"`
	PublicYHex         string `json:"publicYHex"`
	TranscriptHex      string `json:"transcriptHex"`
	SignatureP1363Hex string `json:"signatureP1363Hex"`
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
	x := new(big.Int).SetBytes(mustHex(t, entry.PublicXHex))
	y := new(big.Int).SetBytes(mustHex(t, entry.PublicYHex))
	publicKey := &ecdsa.PublicKey{Curve: elliptic.P256(), X: x, Y: y}
	signature := mustHex(t, entry.SignatureP1363Hex)
	if len(signature) != 64 {
		t.Fatalf("P-256 P1363 signature must be 64 bytes, got %d", len(signature))
	}
	r := new(big.Int).SetBytes(signature[:32])
	s := new(big.Int).SetBytes(signature[32:])
	digest := sha256.Sum256(mustHex(t, entry.TranscriptHex))
	if !ecdsa.Verify(publicKey, digest[:], r, s) {
		t.Fatalf("device authentication signature did not verify")
	}
}
