# Sreva E2EE Key Hierarchy v1

**Status:** Task-19 protocol design candidate. No production account/sync code is authorized until the Task-19 review and three-client conformance gate are green.

## 1. Security objective

Sreva optional account continuity must preserve the local-first privacy model. Health plaintext is created and interpreted only on authorized clients. The sync service may store ciphertext, wrapped key material, public device material, opaque identifiers, minimum version/timestamp metadata, and authorization state. It must not possess the secret required to decrypt the health vault.

Account authentication and health-vault decryption are separate security domains. A valid passkey, email verification, SMS verification, session cookie, administrator credential, or database credential MUST NOT by itself derive the health-vault key.

## 2. Versioned suite

Protocol v1 uses only established primitives available in the existing Dart client, modern browser WebCrypto implementations, and Go 1.27.1:

- key derivation: HKDF-SHA-256;
- authenticated encryption: AES-256-GCM with a fresh 96-bit nonce for every encryption under a given derived key;
- device authentication: ECDSA P-256 with SHA-256;
- randomness: platform cryptographically secure random source;
- hashing: SHA-256.

Canonical suite identifier:

`SREVA-AES256GCM-HKDFSHA256-P256-V1`

Sreva does not define a new cipher, hash, KDF, signature primitive, or public-key encryption construction in v1.

## 3. Canonical framing

Cryptographic context uses `sreva-lp16-v1` framing. Every field is encoded as raw bytes or UTF-8 and prefixed with an unsigned 16-bit big-endian byte length. The first field is always the domain-separation label. This prevents concatenation ambiguity and makes the same byte transcript reproducible in Dart, Web, and Go.

No implementation may replace canonical framing with ad-hoc JSON serialization for a key-derivation, AAD, or request-signature transcript.

## 4. Vault Root Secret

Each E2EE vault has a client-generated 32-byte **Vault Root Secret (VRS)**. The VRS is generated with a CSPRNG on an authorized client and never intentionally sent to Sreva infrastructure in plaintext.

The VRS is the root secret for encrypted synchronization. It is separate from the existing device-local storage encryption key. A client may protect its locally stored VRS using its platform-specific secure-storage/vault boundary, but those local wrapping details do not change the cross-platform E2EE protocol.

The VRS is identified by an opaque `vault_id` and integer `key_epoch`. The identifiers are not secrets.

## 5. Logical sync-event keys

Every encrypted logical event has fresh random `event_id` and opaque `object_id`. The per-event encryption key is derived from the current VRS using HKDF-SHA-256 with:

- input key material: VRS;
- fresh 32-byte random salt stored with the event envelope;
- info: canonical frame of `sreva-event-key-v1`, `event_id`, `object_id`, `source_device_id`, `key_epoch`, and suite ID;
- output length: 32 bytes.

AES-256-GCM AAD binds the ciphertext to the canonical frame of `sreva-sync-event-v1`, opaque account ID, vault ID, event ID, object ID, source device ID, key epoch, logical schema/version, base revision, operation, and suite ID.

Consequences:

- changing account/vault/object/event/device/revision/operation metadata breaks authentication rather than silently reinterpreting ciphertext;
- a cross-account or cross-vault ciphertext substitution cannot decrypt successfully when the recipient reconstructs the expected AAD;
- duplicate event IDs are rejected/idempotently recognized by the service and MUST NOT be treated as permission to reuse a nonce/key pair.

## 6. User-held recovery secret

Emergency recovery uses a separate 32-byte CSPRNG-generated **Recovery Secret (RS)**. It is not an account password and is not derived from email, phone number, OTP, passkey material, or any server-held secret.

The human-facing representation includes a format/version marker and checksum so common transcription errors can be rejected before decryption. The raw 32-byte secret is the cryptographic input; formatting/checksum bytes do not reduce the required entropy.

A recovery wrapping key is derived using HKDF-SHA-256:

- input key material: RS;
- fresh 32-byte random salt stored in the recovery envelope;
- info binds account ID, vault ID, key epoch and suite ID under `sreva-recovery-wrap-key-v1`;
- output length: 32 bytes.

The VRS is wrapped with AES-256-GCM. AAD binds account ID, vault ID, key epoch and suite ID under `sreva-recovery-envelope-v1`.

Sreva infrastructure may store this recovery envelope and its non-secret salt/nonce/metadata. Without the user-held RS it cannot unwrap the VRS.

If every authorized device and the RS are lost, old vault content is cryptographically unrecoverable by design even if account identity is later recovered.

## 7. Trusted-device enrollment without bespoke public-key encryption

The preferred same-user new-device path is existing-trusted-device approval.

1. The target device authenticates the account and registers a fresh P-256 device public signing key.
2. The server creates a short-lived opaque enrollment ID in `pending` state.
3. An existing trusted source device reviews and approves the target device identity.
4. The source device generates a fresh random 32-byte **Transfer Secret (TS)**.
5. The TS is delivered directly from source to target through an explicit local channel such as an on-screen QR code. The server MUST NOT receive the TS.
6. The source derives a one-time transfer wrapping key with HKDF-SHA-256 from the TS, a fresh random salt, and context binding account/vault/enrollment/source/target/key-epoch/suite.
7. The source wraps the VRS with AES-256-GCM using AAD that binds the same identities and uploads only the wrapped envelope.
8. The target obtains the envelope from the server, derives the same wrapping key from the locally received TS, authenticates/decrypts the VRS, stores it under the target platform's local protection boundary, and confirms enrollment.
9. Enrollment and transfer envelope become terminal/used; replay is rejected. The TS is destroyed from application state as far as platform controls permit.

The QR payload contains only version, enrollment ID and TS. It does not contain the VRS or health plaintext. Users must be warned not to share or photograph an active enrollment QR.

If source and target cannot establish the direct transfer channel, the target uses the separate Recovery Secret flow. Email/SMS identity recovery never substitutes for either path.

## 8. Per-device cryptographic identity

Every authorized device generates an ECDSA P-256 signing keypair locally. The server stores only the public key and device authorization state. Private signing keys never intentionally leave the client.

Sensitive sync/device/recovery mutations require a server-issued single-use challenge plus a canonical signed transcript binding account ID, device ID, HTTP method, canonical path, challenge, and SHA-256 of the request body.

Wire signature format is IEEE P1363 `r || s`, 64 bytes total. Client adapters that expose DER ECDSA signatures must convert to/from this canonical wire representation without changing the signed transcript.

Challenges expire, are single-use, and are scoped to account/device/action. TLS remains mandatory; device signatures are an application-layer authorization control, not a replacement for HTTPS.

## 9. Revocation and key epochs

Revoking a device blocks future authenticated sync/device/recovery actions from that device. Revocation does not claim to erase plaintext or secrets the device already obtained.

A compromise/revocation response may advance the vault `key_epoch` and generate a new VRS on an authorized surviving client. New writes use the new epoch. Existing ciphertext may be re-encrypted client-side when practical; the server never performs plaintext migration.

Old epochs remain readable only by authorized clients that legitimately retain the corresponding old secret during migration. Protocol metadata must make epochs explicit and reject accidental downgrade.

## 10. Algorithm agility

Every envelope carries protocol version, suite ID and key epoch. Implementations must reject unknown suites by default rather than guessing.

A future suite may be added only with new cross-platform golden vectors and migration rules. During migration clients may support an explicit read-old/write-new period. Silent primitive substitution under the v1 suite identifier is forbidden.

Post-quantum or hybrid public-key mechanisms are deliberately not improvised into v1. They may be introduced in a future suite once maintained interoperable support and an explicit review exist across Dart, browsers and Go.

## 11. Test-vector authority

`shared/crypto/interoperability-vectors/e2ee-v1.json` is the canonical byte-level interoperability fixture for v1. It contains synthetic fixed secrets/nonces solely for tests. Production code MUST generate fresh random secrets, salts, nonces, IDs and challenges and MUST NOT copy vector values.

The same vector must pass independent Dart, WebCrypto and Go verification before Task 19 can be considered green.
