# Task 21 — Passkey Account Identity Formal Closure

Status: **FORMALLY CLOSED**

## Tested closure baseline

- Branch: `feat/task21-passkey-account-identity`
- Tested code SHA: `2c76ba5549fa69677e81c7c46e8056f82c527f2f`
- Dedicated workflow: `C2 Task 21 Passkey Account Identity`
- Successful exact-head run: `35170833289`
- Required checks on the same SHA:
  - pinned Go module lock reproducibility: PASS
  - `go test ./...`: PASS
  - `go vet ./...`: PASS

The documentation commit containing this note is not a replacement verification baseline. Any later task must inherit the tested code SHA above, or a descendant that is independently reverified.

## Frozen Task-21 requirement coverage

Task 21 is the provider-independent account/passkey identity boundary defined in `docs/superpowers/plans/2026-09-16-sreadya-c2-cross-platform-implementation.md`.

- go-webauthn is pinned to `v0.17.4` with a reproducible dependency graph.
- Account identity accepts email-only, phone-only, or both, while remaining separate from health-vault key material and health semantics.
- Passkey registration includes begin and cryptographically verified finish boundaries.
- Discoverable passkey login includes begin and cryptographically verified finish boundaries.
- Ceremony sessions are short-lived, purpose-bound, one-time, replay-rejecting, and expiry-rejecting.
- The HTTP finish boundary keeps the opaque ceremony session identifier out of the URL and preserves the authenticator response body for go-webauthn validation.
- Deterministic rate-limiter behavior is covered for the authentication boundary scaffold.
- Verification delivery is represented by a small `VerificationSender` interface plus deterministic fake/local behavior only; no production email/SMS vendor is selected in source.
- Email and phone change notifications cover both old and new destinations.
- Production OTP enablement fails closed while no approved production verification sender exists.
- Account/device HTTP route contracts are present without exposing health plaintext or vault-root secrets.
- Existing Task-20 `/healthz` and `/readyz` behavior remains backward-compatible.

## Scope boundary

Task 21 closes the account/passkey **service boundary**. The command remains a provider-independent service scaffold; deployment assembly, production sender selection, and opaque ciphertext synchronization are not silently pulled into this task. Ciphertext synchronization and conflict semantics begin in Task 22.

## TDD evidence

Two closure gaps found during the final audit were resolved test-first:

1. Finish-path RED SHA `36aa35ab6454b83d2fac8eb573b368092038c7b1`, workflow run `35170221018`: failed only because `FinishRegistration` / `FinishPasskeyLogin` did not yet exist.
2. HTTP-finish RED SHA `73cb18baea16d5216debe9b4462a66bf951c16f8`, workflow run `35170364132`: module lock and inherited packages were healthy; `internal/httpapi` failed only because `/register/finish` and `/login/finish` were not yet exposed.

Both RED contracts are satisfied by the tested closure baseline `2c76ba5549fa69677e81c7c46e8056f82c527f2f`.
