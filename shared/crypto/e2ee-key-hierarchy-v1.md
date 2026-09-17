# Sreva E2EE Key Hierarchy v1

**Status:** Task-19 protocol design candidate. No production account/sync code is authorized until the Task-19 review and three-client conformance gate are green.

## 1. Security objective

Sreva optional account continuity preserves the local-first privacy model. Health plaintext is created and interpreted only on authorized clients. The sync service may store ciphertext, wrapped key material, public device material, opaque identifiers, minimum operational metadata, and authorization state. It must not possess the secret required to decrypt the health vault.

Account authentication and health-vault decryption are separate security domains. A valid passkey, email verification, SMS verification, session cookie, administrator credential, or database credential MUST NOT by itself derive the health-vault key.

## 2. Versioned suite

Protocol v1 uses established primitives with maintained implementation paths in the existing Dart client, modern browser WebCrypto, and Go 1.27.1:

- key derivation: HKDF-SHA-256;
- authenticated encryption: AES-256-GCM with a fresh 96-bit nonce for every encryption under a given derived key;
- device authentication: Ed25519 signatures;
- request-body hashing: SHA-256;
- randomness: platform cryptographically secure random source.

Canonical suite identifier:

`SREVA-AES256GCM-HKDFSHA256-ED25519-V1`

Sreva does not define a new cipher, hash, KDF, signature primitive, or public-key encryption construction in v1. Ed25519 signs the canonical transcript bytes directly; v1 does not use Ed25519ph or an extra pre-hash of the complete transcript. SHA-256 remains inside the transcript as the request-body digest.

## 3. Canonical framing

Cryptographic context uses `sreva-lp16-v1` framing. Every field is encoded as raw bytes or UTF-8 and prefixed with an unsigned 16-bit big-endian byte length. The first field is always the domain-separation label. This prevents concatenation ambiguity and makes the same byte transcript reproducible in Dart, Web, and Go.

No implementation may replace canonical framing with ad-hoc JSON serialization for a key-derivation, AAD, or request-signature transcript.

## 4. Vault Root Secret

Each E2EE vault has a client-generated 32-byte **Vault Root Secret (VRS)**. The VRS is generated with a CSPRNG on an authorized client and is never intentionally sent to Sreva infrastructure in plaintext.

The VRS is the root secret for encrypted synchronization. It is separate from the existing device-local storage encryption key. A client may protect its locally stored VRS using its platform-specific secure-storage/vault boundary, but those local wrapping details do not change the cross-platform E2EE protocol.

The VRS is identified by an opaque `vault_id` and integer `key_epoch`. Those identifiers are not secrets.

## 5. Logical sync-event keys

Every encrypted logical event has a fresh random `event_id` and opaque `object_id`. Its per-event encryption key is derived from the current VRS using HKDF-SHA-256 with:

- input key material: VRS;
- fresh 32-byte random salt stored with the event envelope;
- info: canonical frame of `sreva-event-key-v1`, `event_id`, `object_id`, `source_device_id`, `key_epoch`, and suite ID;
- output length: 32 bytes.

AES-256-GCM AAD binds the ciphertext to the canonical frame of `sreva-sync-event-v1`, opaque account ID, vault ID, event ID, object ID, source device ID, key epoch, logical schema/version, base revision, operation, and suite ID.

Changing account/vault/object/event/device/revision/operation metadata therefore breaks authentication instead of silently reinterpreting ciphertext. Duplicate event IDs are rejected or recognized idempotently and MUST NOT authorize a fresh encryption under a reused key/nonce pair.

## 6. User-held recovery secret

Emergency recovery uses a separate 32-byte CSPRNG-generated **Recovery Secret (RS)**. It is not an account password and is not derived from email, phone, OTP, passkey material, or any server-held secret.

The human-facing representation includes a version marker and checksum so common transcription errors can be detected before decryption. The raw 32-byte secret remains the cryptographic input.

A recovery wrapping key is derived with HKDF-SHA-256 from RS, a fresh 32-byte salt, and canonical context binding account ID, vault ID, key epoch, and suite under `sreva-recovery-wrap-key-v1`. The VRS is wrapped with AES-256-GCM and AAD under `sreva-recovery-envelope-v1` binding the same context.

Sreva infrastructure may store the encrypted recovery envelope and its non-secret salt/nonce/metadata. Without the user-held RS it cannot unwrap the VRS. If every authorized device and the RS are lost, old vault content is cryptographically unrecoverable by design even if account identity is later recovered.

## 7. Trusted-device enrollment

The preferred same-user new-device path is existing-trusted-device approval.

1. The target authenticates the account and registers a fresh Ed25519 public signing key.
2. The service creates a short-lived opaque enrollment ID in `pending` state.
3. An existing trusted source device reviews and approves the target identity.
4. The source generates a fresh random 32-byte **Transfer Secret (TS)**.
5. TS is delivered directly source-to-target through an explicit local channel such as a QR code. The server MUST NOT receive TS.
6. The source derives a one-time wrapping key with HKDF-SHA-256 from TS, a fresh salt, and context binding account/vault/enrollment/source/target/key-epoch/suite.
7. The source wraps VRS with AES-256-GCM using AAD that binds the same identities and uploads only the wrapped envelope.
8. The target obtains the envelope, derives the same key from the locally received TS, authenticates/decrypts VRS, protects it locally, and confirms enrollment.
9. Enrollment and transfer envelope become terminal/used; replay is rejected. TS is cleared from application state as far as platform controls permit.

The QR contains only version, enrollment ID, and TS. It does not contain VRS or health plaintext. If a direct transfer channel is unavailable, the separate Recovery Secret flow is used. Email or SMS recovery never substitutes for either cryptographic path.

## 8. Per-device cryptographic identity

Every authorized device generates an Ed25519 signing keypair locally. The service stores only the raw 32-byte public key and authorization state. Private signing keys never intentionally leave the client.

Sensitive sync/device/recovery mutations require a server-issued single-use challenge plus a canonical transcript binding account ID, device ID, HTTP method, canonical path, challenge, and SHA-256 of the exact request body. The Ed25519 signature is computed over those canonical transcript bytes.

Wire representation is:

- public key: raw 32-byte Ed25519 public key;
- signature: raw 64-byte Ed25519 signature.

Challenges expire, are single-use, and are scoped to account/device/action. TLS remains mandatory; device signatures are an application-layer authorization control, not a replacement for HTTPS.

## 9. Revocation and key epochs

Revoking a device blocks future authenticated sync/device/recovery actions from that device. Revocation does not claim to erase plaintext or secrets already obtained.

A compromise/revocation response may advance `key_epoch` and create a new VRS on an authorized surviving client. New writes use the new epoch. Existing ciphertext may be re-encrypted client-side when practical; the server never performs plaintext migration. Old epochs remain readable only by clients that legitimately retain the corresponding secret during migration.

## 10. Algorithm agility

Every envelope carries protocol version, suite ID, and key epoch. Implementations reject unknown suites by default rather than guessing. A future suite requires new cross-platform golden vectors, explicit migration rules, and review. Silent primitive substitution under the v1 suite identifier is forbidden.

Post-quantum or hybrid public-key mechanisms are deliberately not improvised into v1. They may be introduced only after maintained interoperable support and explicit review exist across Dart, browsers, and Go.

## 11. Test-vector authority

`shared/crypto/interoperability-vectors/e2ee-v1.json` is the canonical byte-level fixture for v1. Its fixed secrets/nonces/keys exist only for tests. Production code MUST generate fresh random secrets, salts, nonces, IDs, challenges, and device keys and MUST NOT copy vector values.

The same vector must pass independent Dart, WebCrypto, and Go verification before Task 19 can be considered green.
