# Sreva Mobile/Android v1 Formal Closure Ledger

> **Scope amendment — 16 September 2026:** This ledger preserves evidence for the already-verified Flutter/mobile v1 baseline and Android production pipeline. It does **not** claim closure of the later C2 Web/PWA, account, passkey, E2EE sync, trusted-device, or recovery-key architecture. The authoritative cross-platform specification is `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`. C2 cross-platform closure will require the newer 258-ID traceability and Web/sync evidence described by `docs/superpowers/plans/2026-09-16-sreva-c2-cross-platform-implementation.md`.

Status: **MOBILE/ANDROID V1 FORMAL CLOSURE — evidence-backed and fail-closed for its recorded scope.**

Release candidate: Sreva `1.0.0+1`

Verified feature implementation SHA: `be21114372fdb6167ef2869c668c666dc57ff41e`

Verified feature evidence run: GitHub Actions `34989149967`

Verified pre-seal `main` SHA: `f90159000874e936186c8e2fc7eea7252a770ba7`

Verified pre-seal `main` evidence run: GitHub Actions `34993055457`

This ledger is historical evidence for the immutable release trees named above. It must not be projected onto later source changes or C2 capabilities without fresh verification.

## Frozen product laws for the recorded mobile release

1. The user's device is the authoritative plaintext health datastore.
2. Core functionality requires no account.
3. Core functionality requires no Internet.
4. Predictions execute locally.
5. Insights execute locally.
6. Period reminders use local OS scheduling.
7. The recorded release operates no Sreva reproductive-health sync backend.
8. Health integrations require granular explicit permission.
9. Sensitive health data never enters ordinary logs or analytics.
10. Application updates use signed distribution channels.
11. Database migrations preserve and validate existing history or fail safely.
12. Medical/contraceptive claims remain outside v1 unless separately validated and regulated.

Under the later C2 architecture, law 7 generalizes to: Sreva must not operate a plaintext or developer-decryptable reproductive-health database; a future optional sync service may store ciphertext/minimum metadata only after its own security and release gates pass. That future architecture is outside the evidence recorded here.

## Mobile v1.0 capability contract

The recorded machine-enforced release gate reads the 15 September mobile master design and requires exactly Sections `4.1` through `4.22`. Every mobile capability family maps to concrete implementation and executable evidence. The verifier additionally checks the broad observation model, life-stage modes, reminder/privacy families and regulatory firewall.

Required recorded verifier result:

`22/22 worldwide v1.0 capability families traced to implementation and evidence.`

That output text is retained because it is what the historical verifier emitted. After C2, interpret it as **22/22 mobile-baseline families**, not as 258-ID Android/iOS/Web/PWA closure.

## Mandatory source and product evidence in this recorded scope

- Encrypted local SQLite/SQLCipher-class Health Vault with device-protected key material.
- Safe database migration coordinator with recovery and integrity validation.
- Local period/cycle history and structured observations.
- Local versioned prediction engine with uncertainty and prediction-history evaluation.
- Local reminder policy with three-day-before support, privacy modes, quiet hours and stale-reminder filtering.
- Android native reminder scheduling with DST/timezone wall-clock preservation and host lifecycle wiring.
- Optional Android Health Connect adapter behind explicit permissions and provenance/de-duplication boundaries.
- Local insights and local doctor-report generation with preview-before-share.
- User-controlled authenticated encrypted CycleVault export/restore.
- App lock, PIN fallback, sensitive-screen protection, privacy center and full local wipe.
- Local natural-language logging and offline voice boundary.
- Manual privacy-controlled partner sharing only; no developer relay in this recorded v1 release.
- Publishable and in-app privacy policy for the recorded local-first behavior.
- No advertising/behavioral analytics SDK or developer health-payload telemetry.

## Mandatory automated verification gates recorded for the release trees

- canonical `dart format --set-exit-if-changed`
- `flutter analyze`
- complete `flutter test`
- Python tool syntax checks
- complete reference/structural closure tests
- exhaustive 22/22 mobile-v1 traceability
- zero explicit production/release backlog markers
- privacy/health-payload logging scan
- committed-secret scan
- OSV dependency vulnerability scan
- CycloneDX SBOM generation
- Android host generation and native bridge installation checks
- Play target API/release-signing policy checks
- Kotlin release unit tests
- Helsinki DST forward/backward reminder verification
- worldwide Android/Java timezone-database reminder verification
- timezone-travel wall-clock verification
- reboot, application replacement/update, manual clock-change and timezone-change host wiring verification
- editable quiet-hours controls
- Health Connect long-history permission handling and supported read/write symmetry
- CycleVault byte-level cryptographic round-trip, wrong-passphrase, tamper, unsupported-format and atomic-failure verification
- adjacent `1→2`, adjacent `2→3`, skipped `1→3`, and rollback migration verification
- leap-year and year-boundary reminder verification
- stale-reminder and notification-privacy verification
- diagnostics strict allowlist and health-payload exclusion
- prediction calibration including over/under-confidence signals
- deterministic local-assistant intent-family verification
- ephemeral non-debug Android release-signing path verification
- signed release AAB build
- signed release APK build
- AAB cryptographic integrity plus expected-signer verification
- APK cryptographic integrity plus expected-signer verification
- iOS release compile without code signing

## Verified feature-branch evidence

Run `34989149967` on `be21114372fdb6167ef2869c668c666dc57ff41e` completed successfully at the time recorded:

- `flutter-core`: **SUCCESS**
- `ios-no-codesign`: **SUCCESS**
- `android-release-verification`: **SUCCESS**
- Flutter tests: **41 passed**
- Python reference/closure tests: **37 passed**
- mobile v1 traceability: **22/22 passed**
- release backlog scan: **SUCCESS**
- privacy scan: **SUCCESS**
- committed-secret scan: **SUCCESS**
- OSV dependency scan: **SUCCESS**
- CycloneDX SBOM generation: **SUCCESS**
- Android Kotlin release tests: **SUCCESS**
- signed AAB + APK build: **SUCCESS**
- AAB + APK expected-signer verification: **SUCCESS**
- iOS unsigned release build: **SUCCESS**

Evidence artifacts recorded from this run:

- `sreva-android-v1-ci-test-signed`, artifact `10405223701`, digest `sha256:fc7f8f3d0a3511bd1dd82ee6ebaee8d3cdf9358d168967bebf87eaaaad5aa290`
- `sreva-security-evidence`, artifact `10405021312`, digest `sha256:09a0408193b5dd293679f0900c553314fad3e1359d3caa012653f207512725ff`
- `sreva-ios-unsigned-release`, artifact `10404729118`, digest `sha256:123ee653bb6cdaaac997327e1eb8caa7b597d756dc15233cf13c28a6dd99f2ee`

## Verified `main` evidence before sealing the historical record

Run `34993055457` on `f90159000874e936186c8e2fc7eea7252a770ba7` completed successfully at the time recorded:

- `flutter-core`: **SUCCESS**
- `ios-no-codesign`: **SUCCESS**
- `android-release-verification`: **SUCCESS**
- all recorded core format/analyze/test/traceability/backlog/privacy/secret/OSV/SBOM gates: **SUCCESS**
- Android Kotlin release tests: **SUCCESS**
- ephemeral production-signing-path verification: **SUCCESS**
- signed Android release AAB + APK build: **SUCCESS**
- AAB + APK expected-signer verification: **SUCCESS**
- iOS release build without code signing: **SUCCESS**

Evidence artifacts recorded from this run:

- `sreva-android-v1-ci-test-signed`, artifact `10407137792`, digest `sha256:d0284a562a749170de1401cd99ea3f26bac1d72b86b00294b2cafac687ba9d54`
- `sreva-security-evidence`, artifact `10406931304`, digest `sha256:6d20424d71b900c93a0231fd80db8b202654a48452ec0636c24d732fda93208a`
- `sreva-ios-unsigned-release`, artifact `10406338673`, digest `sha256:8d39e5adf454c3d282e18f34ce996f2422394e3e6f57f78d95122b79dbb10a8d`

## Repository/release boundary recorded by this ledger

The stable mobile CI and Android production workflows are authoritative for the recorded native release pipeline. Android production release is manually dispatched from canonical `main`, requires publisher upload-key secrets, reruns applicable closure gates, builds/verifies AAB/APK artifacts and preserves checksums/SBOM according to the current public-repository hardening policy.

Later documentation branches, Web/PWA work, shared contracts and optional sync-service code do not inherit this closure automatically.

## Publisher credential boundary

Actual Google Play upload requires publisher Google Play account access and real upload-key secrets. Those credentials are intentionally outside this repository and this closure record. Ephemeral CI signing proves mechanism only; it does not claim Play publication.

Native iOS App Store/TestFlight distribution similarly remains outside this mobile closure until Apple signing/account requirements are satisfied.

## Evidence law

A feature is not closed because code exists or because this document says so. Closure exists only when executable gates are green for the exact immutable SHA and declared scope. Any later source change, failed gate, missing verification, branch divergence, signer mismatch, or expansion of scope invalidates any broader inference until the appropriate closure sequence is repeated.

For C2, the relevant future closure target is the 258-ID cross-platform traceability and verification programme—not this 22-family historical mobile ledger.
