# Sreadya CycleVault v1 interoperability contract

Status: frozen interoperability contract for C2 Task 14. This document records the existing mobile format; it does not define a new backup format.

## Format identity

- `format`: `SREADYA-CYCLEVAULT`
- `formatVersion`: `1`
- Recovery passphrase: UTF-8 string, production export requires at least 12 characters.
- Salt: 16 random bytes, base64 encoded in the outer container.
- KDF: Argon2id, version 0x13, memory = 19 MiB (`19456` KiB), iterations/time cost = `2`, parallelism = `1`, output = 32 bytes.
- KDF manifest label: `argon2id-m19MiB-t2-p1`.
- Cipher: AES-256-GCM.
- AES-GCM nonce: 12 bytes.
- AES-GCM authentication tag: 16 bytes.
- Cipher manifest label: `aes-256-gcm`.

No client may silently change these parameters or translate the container to a different format while calling it CycleVault v1.

## Outer JSON container

The UTF-8 file contents are one JSON object with this field order in mobile exports:

1. `manifest`
2. `salt`
3. `sealedPayload`

`manifest` is the manifest object described below. `salt` is the base64 encoding of the 16-byte Argon2id salt. `sealedPayload` is base64 of:

`nonce || ciphertext || authentication_tag`

This byte order matches Dart `SecretBox.concatenation()` / `SecretBox.fromConcatenation()`.

## Manifest and authenticated additional data

The manifest field order emitted by the mobile v1 implementation is:

1. `format`
2. `formatVersion`
3. `createdAtUtc`
4. `appVersion`
5. `databaseSchema`
6. `predictionEngine`
7. `kdf`
8. `cipher`

The exact compact UTF-8 `jsonEncode(manifest)` bytes are AES-GCM authenticated additional data (AAD). Implementations must authenticate the exact manifest bytes corresponding to the parsed container. Reordering, changing, adding, or removing authenticated manifest fields changes the AAD and therefore must not be silently normalized during decryption.

Current mobile export values at contract freeze:

- `appVersion`: `1.0.0`
- `databaseSchema`: `1`
- `predictionEngine`: `prediction-v1`

Readers must reject unsupported `format` / `formatVersion` before replacing live health data.

## Clear payload JSON

The encrypted UTF-8 payload is a compact JSON object with fields in this order:

1. `periods`
2. `observations`

Each period export contains, in order:

1. `id`
2. `start` — UTC ISO-8601 string
3. `end` — UTC ISO-8601 string or null
4. `source`
5. `externalId` — string or null

Each observation export contains, in order:

1. `id`
2. `kind`
3. `occurredAt` — UTC ISO-8601 string
4. `severity` — enum name or null
5. `numericValue` — number or null
6. `unit` — string or null
7. `label` — string or null
8. `note` — string or null
9. `flowLevel` — enum name or null
10. `source`
11. `externalId` — string or null

On restore, the current mobile implementation deliberately classifies imported period and observation records as `cycleVault`; it does not trust the exported `source` value as the new local provenance.

## Restore safety invariants

A reader must not replace the live vault unless all required parsing, authentication and domain validation succeeds. At minimum:

- wrong passphrase fails authentication and preserves live data;
- ciphertext/tag/nonce tampering fails and preserves live data;
- unsupported format/version fails before live replacement;
- malformed payload fails;
- duplicate period IDs or observation IDs fail domain validation;
- period end before start fails domain validation;
- overlapping period episodes fail domain validation;
- failed staged replacement must leave the previous live dataset intact.

## Interoperability vector

`shared/crypto/interoperability-vectors/cyclevault-v1.json` is synthetic and contains no user data. It uses fixed salt, nonce, timestamp and health fixtures so byte output is reproducible.

The vector was constructed independently using standard Argon2id (v0x13, m=19456 KiB, t=2, p=1, 32-byte output) and AES-256-GCM. It is accepted only if the existing production Dart `CycleVaultService.restoreBytes` and Dart Argon2id implementation reproduce/accept the known answers. After Dart acceptance, Web must reproduce the same derived key and decrypt the same sealed payload before Web-generated vectors are considered.

The synthetic passphrase and derived key in the vector are public test data and must never be reused as real recovery secrets.

## Web dependency gate

The Web implementation may evaluate `@noble/hashes@2.4.0` for Argon2id only after the independent vector passes the mobile/Dart conformance test. Before production use, the exact vector must also pass in target browsers and the 19 MiB Argon2id operation must be measured for latency and memory behavior.

If the exact v1 vector cannot be reproduced, or browser resource behavior is unacceptable, Task 14 stops for a dedicated crypto-library review. The v1 format must not be weakened, reparameterized, or silently replaced to make the Web implementation easier.
