# Sreva Worldwide v1 Formal Closure Ledger

> **C2 scope notice — 16 September 2026:** The historical evidence ledger below is preserved verbatim in substance for the Flutter/mobile v1 baseline and Android production pipeline. It does **not** prove the later Web/PWA, account, passkey, E2EE sync, trusted-device, or recovery-key capabilities. Those require the separate C2 258-ID cross-platform closure programme. This scope notice narrows future interpretation; it does not rewrite the evidence that was recorded.

Status: **FORMAL CLOSURE — evidence-backed and fail-closed.**

Release candidate: Sreva `1.0.0+1`

Verified feature implementation SHA: `be21114372fdb6167ef2869c668c666dc57ff41e`

Verified feature evidence run: GitHub Actions `34989149967`

Verified pre-seal `main` SHA: `f90159000874e936186c8e2fc7eea7252a770ba7`

Verified pre-seal `main` evidence run: GitHub Actions `34993055457`

This ledger is itself subject to the evidence law at the end of this file: the final `main` commit containing this record is valid only if its own complete mandatory CI run is green. A red, skipped, missing, or unevaluated mandatory gate invalidates the closure claim automatically.

## Frozen product laws

1. The user's device is the authoritative health datastore.
2. Core functionality requires no account.
3. Core functionality requires no Internet.
4. Predictions execute locally.
5. Insights execute locally.
6. Period reminders use local OS scheduling.
7. Sreva operates no developer reproductive-health database.
8. Health integrations require granular explicit permission.
9. Sensitive health data never enters ordinary logs or analytics.
10. Application updates use signed distribution channels.
11. Database migrations preserve and validate existing history or fail safely.
12. Medical/contraceptive claims remain outside v1 unless separately validated and regulated.

> **C2 interpretation of law 7:** for the recorded v1 release, no Sreva reproductive-health sync backend existed. The later approved C2 extension still prohibits a plaintext or developer-decryptable reproductive-health database; optional future infrastructure may hold ciphertext plus minimum operational metadata only after its own security/release gates pass.

## Worldwide v1.0 capability contract

The machine-enforced release gate reads `Sreva Master Product Specification v1.0` and requires exactly Sections `4.1` through `4.22`. Every capability family must map to concrete implementation and executable verification evidence. The verifier additionally checks the complete health-observation model, every life-stage mode, reminder families and privacy modes, and the regulatory firewall.

Required verifier result:

`22/22 worldwide v1.0 capability families traced to implementation and evidence.`

> After C2, that historical output is evidence for the 22-family mobile baseline only. It is not a substitute for the future 258-ID Android/iOS/Web/PWA closure.

## Mandatory source and product evidence

- Encrypted local SQLite/SQLCipher-class Health Vault with device-protected key material.
- Safe database migration coordinator with recovery and integrity validation.
- Local period/cycle history and structured observations.
- Local versioned prediction engine with uncertainty and prediction-history evaluation.
- Local reminder policy with three-day-before support, privacy modes, quiet hours and stale-reminder filtering.
- Android native reminder scheduling with DST/timezone wall-clock preservation and host lifecycle wiring.
- Optional Android Health Connect adapter behind explicit permissions and provenance/de-duplication boundaries.
- Local insights and local doctor-report generation with preview-before-share.
- User-controlled authenticated encrypted CycleVault export/restore.
- App lock, PIN fallback, sensitive-screen protection, privacy center, and full local wipe.
- Local natural-language logging and offline voice boundary.
- Manual privacy-controlled partner sharing only; no developer relay in v1.
- Publishable and in-app privacy policy.
- No advertising/behavioral analytics SDK or developer health-payload telemetry.

## Mandatory automated verification gates

Every item below must be green on the immutable release tree:

- canonical `dart format --set-exit-if-changed`
- `flutter analyze`
- complete `flutter test`
- Python tool syntax checks
- complete reference/structural closure tests
- exhaustive 22/22 worldwide-v1 traceability
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

Run `34989149967` on `be21114372fdb6167ef2869c668c666dc57ff41e` completed successfully:

- `flutter-core`: **SUCCESS**
- `ios-no-codesign`: **SUCCESS**
- `android-release-verification`: **SUCCESS**
- Flutter tests: **41 passed**
- Python reference/closure tests: **37 passed**
- worldwide-v1 traceability: **22/22 passed**
- release backlog scan: **SUCCESS**
- privacy scan: **SUCCESS**
- committed-secret scan: **SUCCESS**
- OSV dependency scan: **SUCCESS**
- CycloneDX SBOM generation: **SUCCESS**
- Android Kotlin release tests: **SUCCESS**
- signed AAB + APK build: **SUCCESS**
- AAB + APK expected-signer verification: **SUCCESS**
- iOS unsigned release build: **SUCCESS**

Evidence artifacts from this run include:

- `sreva-android-v1-ci-test-signed`, artifact `10405223701`, digest `sha256:fc7f8f3d0a3511bd1dd82ee6ebaee8d3cdf9358d168967bebf87eaaaad5aa290`
- `sreva-security-evidence`, artifact `10405021312`, digest `sha256:09a0408193b5dd293679f0900c553314fad3e1359d3caa012653f207512725ff`
- `sreva-ios-unsigned-release`, artifact `10404729118`, digest `sha256:123ee653bb6cdaaac997327e1eb8caa7b597d756dc15233cf13c28a6dd99f2ee`

## Verified `main` evidence before sealing this record

Run `34993055457` on `f90159000874e936186c8e2fc7eea7252a770ba7` completed successfully:

- `flutter-core`: **SUCCESS**
- `ios-no-codesign`: **SUCCESS**
- `android-release-verification`: **SUCCESS**
- all core format/analyze/test/traceability/backlog/privacy/secret/OSV/SBOM gates: **SUCCESS**
- Android Kotlin release tests: **SUCCESS**
- ephemeral production-signing-path verification: **SUCCESS**
- signed Android release AAB + APK build: **SUCCESS**
- AAB + APK expected-signer verification: **SUCCESS**
- iOS release build without code signing: **SUCCESS**

Evidence artifacts from this run include:

- `sreva-android-v1-ci-test-signed`, artifact `10407137792`, digest `sha256:d0284a562a749170de1401cd99ea3f26bac1d72b86b00294b2cafac687ba9d54`
- `sreva-security-evidence`, artifact `10406931304`, digest `sha256:6d20424d71b900c93a0231fd80db8b202654a48452ec0636c24d732fda93208a`
- `sreva-ios-unsigned-release`, artifact `10406338673`, digest `sha256:8d39e5adf454c3d282e18f34ce996f2422394e3e6f57f78d95122b79dbb10a8d`

## Repository closure

The repository default branch is `main`. The verified branch-cleanup operation removed every other remote branch, and a fresh branch inventory showed only `main`.

The one-shot branch-cleanup workflow is not part of the permanent release surface after cleanup. The stable CI and Android production workflows remain authoritative.

`.github/workflows/android-production.yml`:

- is manually dispatched for production release;
- checks out `main` explicitly;
- requires the real publisher upload-key secrets;
- does not store the production keystore in source control;
- reruns the closure gates;
- builds the Play-ready AAB and production-signed APK;
- verifies artifact signer identity;
- emits SHA-256 checksums, CycloneDX SBOM, `pubspec.lock`, and release artifacts.

## Publisher credential boundary

Actual Google Play upload requires the publisher's real Google Play account access and real upload-key secrets. Those credentials are intentionally outside this repository and outside this closure certificate. CI verification with an ephemeral upload key proves the release-signing mechanism without pretending that a real Play Console publication has occurred.

## Evidence law

A feature is not closed because code exists or because this document says so. Closure exists only when executable gates are green for the exact immutable SHA being released. The final `main` commit containing this ledger must itself pass the complete CI suite. Any later source change, failed gate, missing verification, branch divergence, or signer mismatch invalidates this record until the complete closure sequence is repeated.

> **C2 non-projection rule:** The evidence law above remains binding. The later C2 Web/PWA/account/sync scope must obtain its own 258-ID cross-platform closure and cannot borrow this historical 22-family ledger as proof.
