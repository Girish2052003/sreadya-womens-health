# Sreva Ciphertext Sync Protocol v1

**Status:** Task-19 protocol design candidate. Provider-independent. No production service is authorized until the Task-19 gate is green.

## 1. Purpose and non-goals

Protocol v1 provides optional cross-device continuity for an existing local Sreva vault. It transports authenticated opaque ciphertext and minimum operational metadata. It does not move Sreva cycle logic, predictions, insights, reports, life-stage reasoning, or plaintext health interpretation to the server.

Account-free Sreva remains complete. Enabling, disabling, losing, or interrupting sync MUST NOT prevent local logging or local health functionality.

## 2. Server-visible model

The service may persist only opaque account/vault/device/object/event/enrollment identifiers; device public signing keys and authorization state; protocol/suite/key-epoch values; ciphertext/encrypted envelopes and non-secret salt/nonce values; envelope compatibility schema IDs; revisions; minimum sync timestamps/ciphertext sizes; and one-time challenge/enrollment lifecycle state.

The service schema/API MUST NOT introduce readable health semantics such as period dates, flow, symptoms, sexual activity, fertility/pregnancy state, medication, mood, notes, predictions, or report content.

## 3. Canonical event envelope

A logical encrypted event contains:

```text
protocol_version
suite_id
account_id
vault_id
key_epoch
object_id
event_id
source_device_id
schema_id
base_revision
operation                  # upsert | tombstone
kdf_salt                   # 32 random bytes
nonce                      # 12 random bytes
ciphertext_and_tag
created_at                 # operational timestamp, not health date
```

The account/vault/event/object/device/key-epoch/schema/revision/operation/suite fields are authenticated as AAD exactly as defined in `shared/crypto/e2ee-key-hierarchy-v1.md`. The service never decrypts `ciphertext_and_tag`.

## 4. Push authorization

A client first receives a short-lived action-scoped challenge. It signs the canonical device-authentication transcript from the key-hierarchy document and submits an authenticated account session, device ID, challenge, canonical request body, and Ed25519 device signature.

Before accepting a mutation, the service verifies:

1. session account matches request account context;
2. device belongs to that account and is active;
3. challenge is correctly scoped, unexpired, and unused;
4. request-body SHA-256 matches the value inside the signed transcript;
5. Ed25519 signature verifies under the registered device public key;
6. vault belongs to account;
7. protocol/suite/key epoch are supported;
8. event ID has not been reused with different bytes;
9. object revision transition satisfies conflict rules;
10. size and rate limits pass.

Challenge consumption must be atomic with the authorization decision. A used challenge cannot authorize a retry; a client obtains a new challenge and may resend the same immutable idempotent event.

## 5. Idempotency

`event_id` is the idempotency key. A first valid submission commits. A byte-equivalent retry returns the existing acknowledgement without creating another logical event. Reusing the same event ID with different envelope bytes/metadata is rejected. Clients MUST NOT intentionally reuse an event ID for a fresh encryption.

## 6. Pull and safe application

An authorized client requests events after an opaque sync cursor. The client validates outer fields, reconstructs AAD, derives the event key from its local epoch VRS, authenticates/decrypts AES-GCM, validates decrypted schema/domain content locally, applies conflict semantics transactionally, and advances the cursor only after safe application or preservation.

Authentication or schema failure never silently deletes or replaces current local health state.

## 7. Revisions and conflicts

Every object has a logical revision and each mutation carries `base_revision`. A matching base commits the next revision. Concurrent or stale same-object changes are preserved as competing encrypted branches rather than resolved using health semantics on the server. Authorized clients decrypt competing candidates and surface a user/domain-safe choice where an automatic merge is not explicitly safe. Tombstones participate in the same revision graph and stale edits MUST NOT silently resurrect deleted data.

`shared/sync/conflict-vectors/v1.json` is authoritative for deterministic protocol-state cases.

## 8. Offline queue

Offline clients first commit locally, then create encrypted change records with stable event IDs in a durable local queue. Reconnect retries ciphertext idempotently, pulls remote ciphertext, decrypts/validates, and applies or surfaces conflicts. Sync outage therefore never blocks local health capture.

## 9. Tombstones and deletion

Deletion is an encrypted logical tombstone whose outer operation is `tombstone`. The server may retain opaque tombstone/version metadata required to prevent stale resurrection under retention policy, without learning which health record was deleted.

Account deletion may delete server-held account/public-device/envelope/ciphertext state according to policy. It MUST NOT claim to erase CycleVault exports, screenshots, backups, or copies already retained by former devices.

## 10. Trusted-device enrollment

Enrollment state is `pending → approved → envelope_ready → consumed`, with rejected/expired terminal paths. The target first authenticates the account and registers its Ed25519 public key. The approver must be active. Enrollment is random, scoped, short-lived, and one-time. TS travels directly source-to-target and is never submitted to the service. Only the encrypted VRS transfer envelope plus non-secret parameters are relayed. Changing source/target/account/vault/key epoch causes cryptographic authentication failure because those fields are bound into KDF context/AAD.

## 11. Recovery

Recovery requires both successful account identity authentication and the user-held Recovery Secret capable of decrypting the recovery envelope. Email, SMS, support staff, database access, account session, or passkey login alone cannot unwrap the old VRS. After recovery, a fresh device identity is created/authorized and later sensitive operations return to the normal challenge/signature boundary.

## 12. Revocation

A revoked device cannot obtain valid action challenges, push/pull future sync generations, approve devices, or modify recovery state. Revocation is not represented as a remote wipe. A surviving client may create a new VRS/key epoch; the service coordinates only opaque epoch metadata and ciphertext.

## 13. Replay and substitution defenses

Protocol v1 rejects or detects used/expired challenge or enrollment replay; altered duplicate events; stale revisions without conflict preservation; revoked-device requests; account/vault/device substitution; ciphertext/AAD/tag tampering; request-body substitution; and unsupported suite/key-epoch downgrade.

## 14. Transport/browser boundary

HTTPS is mandatory. Sensitive endpoints put no health values in URLs/query strings. Browser requests may carry opaque IDs only. Responses are not stored in ordinary service-worker/public caches. Authorization tokens and challenges are never embedded in static GitHub Pages output. The future sync service is deployed separately from GitHub Pages.

## 15. Limits and abuse controls

Production service enforces conservative configurable envelope-size, queue, device, enrollment, challenge, verification-failure, and mutation-rate limits. Error responses do not reflect ciphertext bodies, recovery material, private keys, or secrets into logs.

## 16. Version negotiation

Clients send explicit protocol version and suite ID. Unknown versions/suites fail closed; there is no implicit downgrade. New suites require shared golden vectors, migration rules, threat-model update, and protocol review before production use.
