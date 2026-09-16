# Sreva Ciphertext Sync Protocol v1

**Status:** Task-19 protocol design candidate. Provider-independent. No production service is authorized until the Task-19 gate is green.

## 1. Purpose and non-goals

Protocol v1 provides optional cross-device continuity for an existing local Sreva vault. It transports authenticated opaque ciphertext and minimum operational metadata. It does not move Sreva cycle logic, predictions, insights, reports, life-stage reasoning, or plaintext health interpretation to the server.

Account-free Sreva remains complete. Enabling, disabling, losing, or interrupting sync MUST NOT prevent local logging or local health functionality.

## 2. Server-visible model

The service may persist only what the reviewed protocol requires:

- opaque account ID;
- opaque vault ID;
- opaque device ID and device public signing key;
- device authorization/revocation state;
- opaque object/event/enrollment IDs;
- protocol version, suite ID and key epoch;
- ciphertext/encrypted envelopes and non-secret salt/nonce values;
- schema identifier that describes encrypted record envelope compatibility but not medical content;
- revision/version counters;
- minimum synchronization timestamps and ciphertext sizes;
- one-time challenge/enrollment lifecycle state.

The service schema/API MUST NOT introduce readable health semantics such as period dates, flow, symptoms, sexual activity, fertility/pregnancy state, medication, mood, notes, predictions, or report content.

## 3. Canonical event envelope

A logical encrypted event contains:

```text
protocol_version
suite_id
account_id                 # authenticated account context; opaque
vault_id                   # opaque
key_epoch
object_id                  # random/opaque
 event_id                  # random/opaque and globally unique within vault
source_device_id           # opaque
schema_id                  # e.g. health-record-v1; no medical value
base_revision              # revision source client believed current
operation                  # upsert | tombstone
kdf_salt                   # 32 random bytes
nonce                      # 12 random bytes
ciphertext_and_tag         # AES-256-GCM output
created_at                 # operational client/server timestamp; not health date
```

`account_id`, `vault_id`, `event_id`, `object_id`, `source_device_id`, `key_epoch`, `schema_id`, `base_revision`, `operation` and suite are authenticated as AAD exactly as defined in `shared/crypto/e2ee-key-hierarchy-v1.md`.

The service never decrypts `ciphertext_and_tag`.

## 4. Push authorization

A client first receives a short-lived, action-scoped challenge. It signs the canonical device-authentication transcript described by the key-hierarchy document and submits:

- authenticated account session;
- device ID;
- challenge ID/value;
- canonical request body;
- device ECDSA P-256/SHA-256 signature.

The service verifies all of the following before accepting the mutation:

1. session account matches request account context;
2. device belongs to that account and is active;
3. challenge belongs to that account/device/action, is unexpired and unused;
4. request body hash matches the signed transcript;
5. signature verifies under registered device public key;
6. vault belongs to account;
7. suite/protocol/key epoch are supported for that vault;
8. event ID has not been used with different content;
9. object revision transition satisfies conflict rules;
10. size/rate limits pass.

Challenge is consumed atomically with the authorization decision. A used challenge cannot authorize a retry; the client obtains a new challenge and may resend the same idempotent event ID.

## 5. Idempotency and duplicate events

`event_id` is the idempotency key.

- First valid submission: store/commit.
- Repeated byte-equivalent envelope for an already committed `event_id`: return the existing acknowledgement; do not create another logical event.
- Same `event_id` with different envelope bytes/metadata: reject as integrity/protocol violation.

Clients MUST NOT intentionally reuse an event ID for a new encryption because that could also imply unsafe derived-key/nonce reuse.

## 6. Pull

An authorized client requests events after an opaque sync cursor. The service returns authorized ciphertext envelopes and a new cursor. The client:

1. validates outer protocol fields and authorization context;
2. reconstructs expected AAD;
3. derives the event key from the locally held epoch VRS;
4. authenticates/decrypts AES-GCM;
5. validates decrypted schema/domain content locally;
6. applies conflict semantics transactionally to local authoritative state;
7. advances local sync cursor only after safe application/preservation.

Authentication or schema failure never silently deletes/replaces current local health state.

## 7. Revisions and conflicts

Every object maintains a logical revision. A mutation carries `base_revision`.

- If `base_revision` equals the server-observed current revision, commit next revision.
- If the object has advanced independently, do not choose a health winner on the server. Preserve the competing encrypted branch/event and mark an opaque conflict condition for authorized clients.
- Clients decrypt competing candidates and present a health-language choice when automatic domain-safe merging is not explicitly specified.
- Tombstones participate in the same revision graph and MUST NOT permit silent stale resurrection.

The server may detect revision concurrency from opaque metadata, but it never interprets health meaning.

The authoritative deterministic cases are in `shared/sync/conflict-vectors/v1.json`.

## 8. Offline queue

Offline clients append encrypted local change records to a durable local queue. Each queued mutation has a stable event ID. Reconnect behavior is:

```text
local plaintext change
→ local authoritative commit
→ encrypt event locally
→ queue ciphertext envelope
→ retry authorization/push idempotently
→ receive remote ciphertext since cursor
→ decrypt/validate/apply or surface conflict locally
```

Sync outage therefore never blocks local health capture. Queue failure must be visible without claiming health data was synchronized.

## 9. Tombstones and deletion

A deletion is an encrypted logical tombstone event whose outer operation is `tombstone`. The server can retain the opaque tombstone/version required to prevent stale resurrection according to retention policy, but it does not learn what health record was deleted.

Account deletion can delete server-held accounts, public device material, envelopes and ciphertext under policy. It MUST NOT claim to erase CycleVault exports, screenshots, backups, or plaintext/ciphertext already retained by former devices.

## 10. Trusted-device enrollment

Enrollment state machine:

```text
pending → approved → envelope_ready → consumed
       ↘ rejected
       ↘ expired
```

Rules:

- target must first authenticate account and register its device public key;
- source approver must be an active trusted device;
- enrollment ID is random, account/vault/target scoped and short-lived;
- transfer secret is delivered directly source→target and is never submitted to service;
- only the encrypted VRS transfer envelope plus non-secret parameters are relayed;
- consume is one-time and atomic;
- expired/rejected/consumed enrollment cannot be reopened;
- changing source/target/account/vault/key epoch invalidates AES-GCM authentication because those fields are bound in KDF context/AAD.

## 11. Recovery

Recovery requires both:

1. successful account identity authentication; and
2. the user-held Sreva Recovery Secret capable of decrypting the stored recovery envelope.

Email, SMS, support staff, database access, account session or passkey account login alone cannot unwrap the old VRS.

After successful recovery the client creates/registers a fresh device identity. Security-sensitive recovery operations use the normal challenge/signature boundary once the new device has been authorized through the recovery flow.

## 12. Revocation

A revoked device:

- cannot obtain valid action challenges;
- cannot push or pull future sync generations;
- cannot approve new devices;
- cannot modify recovery state;
- cannot be represented as remotely wiped.

Revocation may trigger a new key epoch created on a surviving authorized client. The service only coordinates opaque epoch metadata and ciphertext; it never generates or receives the new VRS.

## 13. Replay and substitution defenses

Protocol v1 rejects or detects:

- used/expired challenge replay;
- used/expired enrollment replay;
- duplicate event with altered bytes;
- stale base revision without explicit conflict preservation;
- revoked-device requests;
- account/vault/device substitution through authorization checks and cryptographic AAD binding;
- ciphertext/AAD/tag tampering through AES-GCM authentication;
- request-body substitution through signed body hash;
- unsupported suite/key-epoch downgrade.

## 14. Transport and browser boundary

HTTPS is mandatory. Sensitive ciphertext endpoints use no health values in URL paths/query strings. Browser requests may carry opaque IDs only. Responses are not stored in ordinary service-worker/public caches. Authorization tokens and challenges are never embedded in static GitHub Pages output.

The future sync service is deployed separately from GitHub Pages.

## 15. Limits and abuse controls

Production service must enforce conservative configurable limits for envelope size, queue depth, devices per account, enrollment attempts, challenge issuance, failed verification and mutation rate. Limits operate on opaque operational metadata and MUST NOT inspect health plaintext.

Error responses avoid reflecting ciphertext, request bodies, recovery material, device private material or secrets into logs.

## 16. Version negotiation

Clients send explicit protocol version and suite ID. Unknown versions/suites fail closed. There is no implicit downgrade.

Migration uses explicit read compatibility plus a write-current policy. New suites require shared golden vectors, cross-platform conformance, threat-model update and protocol review before production use.
