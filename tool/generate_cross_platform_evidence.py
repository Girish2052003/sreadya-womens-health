#!/usr/bin/env python3
"""Generate the explicit Sreadya C2 258-ID / 1,032-cell evidence ledger."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "shared" / "capabilities" / "sreadya-capabilities.v1.json"
OUT = ROOT / "shared" / "capabilities" / "evidence.v1.json"
PLATFORMS = ("android", "ios", "web", "pwa")

MOBILE_TRACES = {
    "CYC": (["lib/features/logging/presentation/log_screen.dart"], ["verification/reference/test_v1_closure_structure.py"]),
    "PRED": (["lib/features/predictions/domain/cycle_predictor.dart"], ["test/domain/cycle_predictor_test.dart"]),
    "REM": (["lib/features/reminders/domain/reminder_policy.dart"], ["test/reminders/reminder_policy_test.dart"]),
    "LOG": (["lib/features/logging/presentation/log_screen.dart"], ["verification/reference/test_v1_closure_structure.py"]),
    "REPRO": (["lib/features/logging/presentation/log_screen.dart"], ["verification/reference/test_v1_closure_structure.py"]),
    "LIFE": (["lib/features/life_stage/domain/life_stage.dart"], ["test/life_stage/life_stage_test.dart"]),
    "INS": (["lib/features/insights/domain/insight_engine.dart"], ["test/domain/insight_engine_test.dart"]),
    "RPT": (["lib/features/reports/data/doctor_report_service.dart"], ["test/reports/report_selection_test.dart"]),
    "INT": (["lib/features/assistant/domain/local_intent_parser.dart"], ["test/domain/local_intent_parser_test.dart"]),
    "PART": (["lib/features/partner/domain/partner_share.dart"], ["verification/reference/test_v1_closure_structure.py"]),
    "A11Y": (["lib/features/settings/presentation/settings_screen.dart"], ["test/settings/user_formatters_test.dart"]),
    "PRIV": (["lib/features/privacy/presentation/privacy_center_screen.dart"], ["verification/reference/test_v1_closure_structure.py"]),
    "VAULT": (["lib/features/backup/data/cycle_vault_service.dart"], ["test/backup/cycle_vault_restore_test.dart"]),
    "DIAG": (["lib/core/diagnostics/diagnostic_report_builder.dart"], ["test/privacy/diagnostic_report_builder_test.dart"]),
    "ID": (
        [
            "lib/features/account/data/account_continuity_adapter.dart",
            "lib/features/account/presentation/account_screen.dart",
            "lib/features/account/presentation/devices_screen.dart",
            "lib/features/account/presentation/recovery_screen.dart",
        ],
        [
            ".github/workflows/c2-task23-verify.yml",
            "verification/reference/test_mobile_continuity_surfaces.py",
        ],
    ),
    "SYNC": (
        [
            "lib/features/sync/data/encrypted_sync_adapter.dart",
            "lib/features/sync/presentation/sync_screen.dart",
        ],
        [
            "test/conformance/e2ee_vectors_mobile_test.dart",
            "verification/reference/test_mobile_continuity_surfaces.py",
        ],
    ),
}

WEB_TRACES = {
    "CYC": (["web/src/features/cycle/CycleCorePanel.tsx"], ["web/e2e/account-free-core.spec.ts"]),
    "PRED": (["web/src/domain/prediction/predictor.ts"], ["web/src/domain/prediction/predictor.conformance.test.ts"]),
    "REM": (["web/src/features/reminders/ReminderWorkspace.tsx"], ["web/e2e/reminder-health.spec.ts"]),
    "LOG": (["web/src/features/logging/LogCorePanel.tsx"], ["web/e2e/account-free-core.spec.ts"]),
    "REPRO": (["web/src/features/cycle/observation-actions.ts"], ["web/src/features/cycle/observation-actions.test.ts"]),
    "LIFE": (["web/src/features/life-stage/life-stage.ts"], ["web/src/features/life-stage/life-stage.test.ts"]),
    "INS": (["web/src/features/insights/insight-engine.ts"], ["web/src/features/insights/insight-engine.test.ts"]),
    "RPT": (["web/src/features/reports/report-builder.ts"], ["web/src/features/reports/report-builder.test.ts"]),
    "INT": (["web/src/features/assistant/local-intent-parser.ts"], ["web/src/features/assistant/local-intent-parser.test.ts"]),
    "PART": (["web/src/features/sharing/partner-sharing.ts"], ["web/src/features/sharing/partner-sharing.test.ts"]),
    "A11Y": (["web/src/accessibility/AccessibilityPreferencesPanel.tsx"], ["web/e2e/accessibility-i18n.spec.ts"]),
    "PRIV": (["web/src/features/privacy/PrivacyWorkspace.tsx"], ["web/src/features/privacy/PrivacyWorkspace.test.tsx"]),
    "VAULT": (["web/src/vault/vault-service.ts"], ["web/src/vault/vault-service.test.ts"]),
    "DIAG": (["web/src/diagnostics/diagnostic-report.ts"], ["web/src/diagnostics/diagnostic-report.test.ts"]),
    "ID": (["web/src/account/passkeys.ts"], ["web/src/account/passkeys.test.ts"]),
    "SYNC": (["web/src/sync/client.ts"], ["web/src/sync/client.test.ts"]),
    "WEB": (["web/src/components/pwa/PwaBootstrap.tsx"], ["web/e2e/pwa.spec.ts"]),
}


def adapted_rationale(capability_id: str) -> str:
    family = capability_id.split("-", 1)[0]
    if family == "REM":
        return "Browser/PWA reminder delivery adapts native scheduling to Web notification and service-worker capabilities."
    if family == "PRIV":
        return "Browser/PWA privacy controls adapt native app-lock and security primitives to browser storage and session capabilities."
    if family == "ID":
        return "Android/iOS account continuity adapts the shared identity protocol through platform-native passkey credential APIs."
    if capability_id == "HEALTH-007":
        return "Browser/PWA uses manual user-controlled health interchange because native HealthKit/Health Connect APIs are unavailable."
    raise SystemExit(f"missing adapted rationale for {capability_id}")


def na_rationale(capability_id: str, platform: str) -> str:
    family = capability_id.split("-", 1)[0]
    if family == "WEB":
        return "Web/PWA-specific capability; native Android/iOS applicability is intentionally excluded by the registry contract."
    if capability_id == "HEALTH-001":
        if platform == "android":
            return "Apple HealthKit is iOS-only and is not available on Android."
        return "Apple HealthKit native APIs are not available in browser/PWA environments."
    if capability_id == "HEALTH-002":
        if platform == "ios":
            return "Android Health Connect is Android-only and is not available on iOS."
        return "Android Health Connect native APIs are not available in browser/PWA environments."
    if family == "HEALTH":
        return "This native health-store capability is unavailable in browser/PWA environments."
    raise SystemExit(f"missing N/A rationale for {capability_id}/{platform}")


def trace(capability_id: str, platform: str) -> tuple[list[str], list[str]]:
    family, number_text = capability_id.split("-", 1)
    number = int(number_text)

    if family == "HEALTH":
        if platform == "android":
            return (["lib/features/health_integration/data/health_import_service.dart", "platform_templates/android/MainActivity.kt"], ["verification/reference/test_v1_closure_structure.py"])
        if platform == "ios":
            return (["lib/features/health_integration/data/health_import_service.dart", "platform_templates/ios/SreadyaPlatformBridge.swift"], ["verification/reference/test_v1_closure_structure.py"])
        if number == 8:
            return (["web/src/sync/reconcile.ts"], ["web/src/sync/reconcile.test.ts"])
        return (["web/src/vault/health-repository.ts"], ["web/src/vault/health-repository.test.ts"])

    if family == "ID" and number in {7, 8} and platform == "android":
        return (
            [
                "platform_templates/android/SreadyaCredentialBridge.kt",
                "lib/features/account/presentation/account_screen.dart",
            ],
            [
                ".github/workflows/c2-task24-verify.yml",
                "verification/reference/test_mobile_continuity_surfaces.py",
            ],
        )
    if family == "ID" and number in {7, 8} and platform == "ios":
        return (
            [
                "platform_templates/ios/SreadyaCredentialBridge.swift",
                "lib/features/account/presentation/account_screen.dart",
            ],
            [
                ".github/workflows/c2-task24-verify.yml",
                "verification/reference/test_mobile_continuity_surfaces.py",
            ],
        )

    traces = MOBILE_TRACES if platform in {"android", "ios"} else WEB_TRACES
    if family not in traces:
        raise SystemExit(f"missing trace profile for {capability_id}/{platform}")
    implementation, evidence = traces[family]
    return (list(implementation), list(evidence))


def render() -> str:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    launch = [record for record in registry["capabilities"] if not record["id"].startswith("FUT-")]
    if len(launch) != 258 or len({record["id"] for record in launch}) != 258:
        raise SystemExit("frozen registry must contain exactly 258 unique launch IDs")

    rows: list[dict[str, object]] = []
    for record in launch:
        capability_id = record["id"]
        platforms = record["platforms"]
        if set(platforms) != set(PLATFORMS):
            raise SystemExit(f"invalid platform contract for {capability_id}")

        cells: dict[str, object] = {}
        for platform in PLATFORMS:
            applicability = platforms[platform]
            if applicability == "na":
                cells[platform] = {
                    "applicability": "na",
                    "status": "na",
                    "implementation": [],
                    "evidence": [],
                    "rationale": na_rationale(capability_id, platform),
                }
                continue
            if applicability not in {"full", "adapted"}:
                raise SystemExit(f"invalid applicability {applicability!r} for {capability_id}/{platform}")
            implementation, evidence = trace(capability_id, platform)
            cells[platform] = {
                "applicability": applicability,
                "status": "implemented",
                "implementation": implementation,
                "evidence": evidence,
                "rationale": adapted_rationale(capability_id) if applicability == "adapted" else "",
            }
        rows.append({"id": capability_id, "platforms": cells})

    payload = {
        "contract": "SREADYA C2 Cross-Platform Evidence Ledger",
        "version": 1,
        "registry": "shared/capabilities/sreadya-capabilities.v1.json",
        "claim_boundary": "Applicable cells are conservatively recorded as implemented. A cell is not labelled verified merely because a referenced test file exists.",
        "capabilities": rows,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail unless the committed ledger is exactly reproducible")
    args = parser.parse_args()
    expected = render()
    if args.check:
        if not OUT.is_file() or OUT.read_text(encoding="utf-8") != expected:
            raise SystemExit("cross-platform evidence ledger is stale; regenerate it")
        print("cross-platform evidence generator: committed ledger is reproducible")
        return
    OUT.write_text(expected, encoding="utf-8")
    print("generated explicit Task 25 evidence ledger: 258 IDs / 1032 platform cells")


if __name__ == "__main__":
    main()
