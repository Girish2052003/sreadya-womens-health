#!/usr/bin/env python3
"""Fail closed unless every frozen worldwide-v1 capability is traced to code and evidence."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "docs/superpowers/specs/2026-09-15-sreva-master-design.md"
SPEC_TITLE = "Sreva Master Product Specification v1.0"

# Each frozen Section 4 capability family has at least one concrete
# implementation location and one executable evidence location. Shared
# acceptance/native tests may legitimately support more than one family.
CAPABILITIES = {
    "4.1": {
        "name": "Home and onboarding",
        "implementation": [
            "lib/features/onboarding/presentation/onboarding_screen.dart",
            "lib/features/home/presentation/home_screen.dart",
        ],
        "evidence": ["verification/reference/test_v1_closure_structure.py"],
    },
    "4.2": {
        "name": "Cycle and period tracking",
        "implementation": [
            "lib/features/cycle/domain/cycle_models.dart",
            "lib/features/calendar/presentation/calendar_screen.dart",
            "lib/features/logging/presentation/log_screen.dart",
        ],
        "evidence": [
            "test/domain/cycle_predictor_test.dart",
            "verification/reference/test_v1_closure_structure.py",
        ],
    },
    "4.3": {
        "name": "Prediction engine",
        "implementation": [
            "lib/features/predictions/domain/cycle_predictor.dart",
            "lib/features/predictions/domain/prediction_history.dart",
            "lib/features/predictions/data/prediction_history_store.dart",
        ],
        "evidence": [
            "test/domain/cycle_predictor_test.dart",
            "test/predictions/prediction_history_test.dart",
        ],
    },
    "4.4": {
        "name": "Reminder engine",
        "implementation": [
            "lib/features/reminders/domain/reminder_models.dart",
            "lib/features/reminders/domain/reminder_policy.dart",
            "lib/features/reminders/presentation/reminders_screen.dart",
            "platform_templates/android/MainActivity.kt",
        ],
        "evidence": [
            "test/reminders/reminder_policy_test.dart",
            "platform_templates/android/ReminderWallClockTest.kt",
        ],
    },
    "4.5": {
        "name": "Daily health logging",
        "implementation": [
            "lib/features/cycle/domain/cycle_models.dart",
            "lib/features/logging/presentation/log_screen.dart",
        ],
        "evidence": ["verification/reference/test_v1_closure_structure.py"],
    },
    "4.6": {
        "name": "Reproductive observations",
        "implementation": [
            "lib/features/cycle/domain/cycle_models.dart",
            "lib/features/logging/presentation/log_screen.dart",
            "platform_templates/android/MainActivity.kt",
        ],
        "evidence": [
            "verification/reference/test_v1_closure_structure.py",
            "test/life_stage/life_stage_test.dart",
        ],
    },
    "4.7": {
        "name": "Life-stage modes",
        "implementation": [
            "lib/features/life_stage/domain/life_stage.dart",
            "lib/features/life_stage/presentation/life_stage_screen.dart",
        ],
        "evidence": ["test/life_stage/life_stage_test.dart"],
    },
    "4.8": {
        "name": "Insights",
        "implementation": [
            "lib/features/insights/domain/insight_engine.dart",
            "lib/features/insights/presentation/insights_screen.dart",
        ],
        "evidence": ["test/domain/insight_engine_test.dart"],
    },
    "4.9": {
        "name": "Doctor reports",
        "implementation": [
            "lib/features/reports/data/doctor_report_service.dart",
            "lib/features/reports/presentation/reports_screen.dart",
        ],
        "evidence": ["test/reports/report_selection_test.dart"],
    },
    "4.10": {
        "name": "Ultra-easy interaction",
        "implementation": [
            "lib/features/assistant/domain/local_intent_parser.dart",
            "lib/features/assistant/data/voice_platform.dart",
            "lib/features/assistant/presentation/assistant_screen.dart",
        ],
        "evidence": ["test/domain/local_intent_parser_test.dart"],
    },
    "4.11": {
        "name": "Partner sharing",
        "implementation": [
            "lib/features/partner/domain/partner_share.dart",
            "lib/features/partner/domain/partner_transport.dart",
            "lib/features/partner/presentation/partner_screen.dart",
        ],
        "evidence": ["verification/reference/test_v1_closure_structure.py"],
    },
    "4.12": {
        "name": "Platform health integration",
        "implementation": [
            "lib/features/health_integration/data/health_platform.dart",
            "lib/features/health_integration/data/health_import_service.dart",
            "platform_templates/android/MainActivity.kt",
            "platform_templates/ios/SrevaPlatformBridge.swift",
        ],
        "evidence": ["verification/reference/test_v1_closure_structure.py"],
    },
    "4.13": {
        "name": "Accessibility and worldwide readiness",
        "implementation": [
            "lib/core/settings/user_formatters.dart",
            "lib/features/settings/presentation/settings_screen.dart",
            "lib/l10n/app_en.arb",
        ],
        "evidence": [
            "test/settings/user_formatters_test.dart",
            "platform_templates/android/ReminderWallClockTest.kt",
            "verification/reference/test_v1_closure_structure.py",
        ],
    },
    "4.14": {
        "name": "Privacy center and app lock",
        "implementation": [
            "lib/features/privacy/data/app_lock_service.dart",
            "lib/features/privacy/data/pin_lock_service.dart",
            "lib/features/privacy/presentation/privacy_center_screen.dart",
        ],
        "evidence": [
            "test/privacy/diagnostic_report_builder_test.dart",
            "verification/reference/test_v1_closure_structure.py",
        ],
    },
    "4.15": {
        "name": "CycleVault backup and restore",
        "implementation": ["lib/features/backup/data/cycle_vault_service.dart"],
        "evidence": ["test/backup/cycle_vault_restore_test.dart"],
    },
    "4.16": {
        "name": "Database migrations",
        "implementation": [
            "lib/core/database/health_vault.dart",
            "lib/core/database/migration_coordinator.dart",
        ],
        "evidence": ["test/database/migration_coordinator_test.dart"],
    },
    "4.17": {
        "name": "Diagnostics and crash support",
        "implementation": [
            "lib/core/diagnostics/diagnostic_report_builder.dart",
            "lib/features/diagnostics/data/diagnostic_service.dart",
        ],
        "evidence": ["test/privacy/diagnostic_report_builder_test.dart"],
    },
    "4.18": {
        "name": "Update and release system",
        "implementation": [
            ".github/workflows/ci.yml",
            ".github/workflows/android-production.yml",
            "lib/core/version/app_versions.dart",
        ],
        "evidence": ["verification/reference/test_v1_closure_structure.py"],
    },
    "4.19": {
        "name": "Supply-chain security",
        "implementation": [
            "pubspec.lock",
            "tool/secret_scan.py",
            "tool/generate_sbom.py",
            "tool/verify_android_signatures.py",
        ],
        "evidence": [
            "verification/reference/test_android_signature_verification.py",
            "verification/reference/test_v1_closure_structure.py",
        ],
    },
    "4.20": {
        "name": "Prediction laboratory",
        "implementation": ["lib/features/predictions/domain/prediction_history.dart"],
        "evidence": [
            "test/domain/cycle_predictor_test.dart",
            "test/predictions/prediction_history_test.dart",
            "verification/reference/test_sreva_reference.py",
        ],
    },
    "4.21": {
        "name": "Reminder laboratory",
        "implementation": [
            "lib/features/reminders/domain/reminder_policy.dart",
            "platform_templates/android/MainActivity.kt",
        ],
        "evidence": [
            "test/reminders/reminder_policy_test.dart",
            "platform_templates/android/ReminderWallClockTest.kt",
            "verification/reference/test_sreva_reference.py",
        ],
    },
    "4.22": {
        "name": "Regulatory firewall",
        "implementation": [
            "lib/features/insights/domain/insight_engine.dart",
            "lib/features/life_stage/domain/life_stage.dart",
            "lib/features/privacy/presentation/privacy_policy_screen.dart",
        ],
        "evidence": [
            "test/domain/insight_engine_test.dart",
            "test/life_stage/life_stage_test.dart",
        ],
    },
}

# Positive medical/contraceptive claims are release blockers. These are kept
# deliberately narrow so transparent disclaimers such as "not diagnostic" are
# allowed while product copy that claims to diagnose/treat/prevent is rejected.
forbidden_claims = (
    "sreva diagnoses",
    "diagnose disease",
    "diagnoses disease",
    "treats disease",
    "treatment decision provided by sreva",
    "prevents pregnancy",
    "guaranteed contraception",
    "guaranteed contraceptive effectiveness",
    "clinically guarantees ovulation",
)


def require_nonempty(path: str) -> None:
    target = ROOT / path
    if not target.is_file() or target.stat().st_size == 0:
        raise SystemExit(f"Traceability target missing or empty: {path}")


def main() -> None:
    spec = SPEC.read_text(encoding="utf-8")
    if SPEC_TITLE not in spec:
        raise SystemExit(f"Expected specification title missing: {SPEC_TITLE}")

    headings = set(re.findall(r"^### (4\.\d+)\b", spec, flags=re.MULTILINE))
    expected = {f"4.{index}" for index in range(1, 23)}
    if headings != expected:
        raise SystemExit(
            f"Frozen capability sections changed: expected {sorted(expected)}, got {sorted(headings)}"
        )
    if set(CAPABILITIES) != expected:
        raise SystemExit("Traceability map does not exactly cover frozen Sections 4.1-4.22.")

    for section in sorted(expected, key=lambda value: int(value.split(".")[1])):
        record = CAPABILITIES[section]
        implementation = record["implementation"]
        evidence = record["evidence"]
        if not implementation or not evidence:
            raise SystemExit(f"{section} has incomplete implementation/evidence mapping.")
        for path in [*implementation, *evidence]:
            require_nonempty(path)

    # Intensive capability completeness checks for the broadest enumerations.
    cycle_model = (ROOT / "lib/features/cycle/domain/cycle_models.dart").read_text(
        encoding="utf-8"
    )
    required_observations = (
        "cramps", "headache", "migraine", "backPain", "breastTenderness",
        "bloating", "acne", "nausea", "digestion", "fatigue", "dizziness",
        "appetite", "cravings", "sleep", "energy", "stress", "mood",
        "anxiety", "irritability", "libido", "vaginalDischarge",
        "cervicalMucus", "basalBodyTemperature", "weight", "exercise",
        "water", "custom", "ovulationTest", "pregnancyTest", "sexualActivity",
        "protection", "contraception", "medication", "supplement", "dailyNote",
    )
    missing_observations = [item for item in required_observations if item not in cycle_model]
    if missing_observations:
        raise SystemExit(f"Observation model missing: {missing_observations}")

    life_stage = (ROOT / "lib/features/life_stage/domain/life_stage.dart").read_text(
        encoding="utf-8"
    )
    required_life_stages = (
        "cycleTracking", "tryingToConceive", "pregnancy", "postpartum",
        "breastfeeding", "perimenopause", "menopauseTransition",
        "hormonalContraception",
    )
    missing_stages = [item for item in required_life_stages if item not in life_stage]
    if missing_stages:
        raise SystemExit(f"Life-stage model missing: {missing_stages}")

    reminder_model = (ROOT / "lib/features/reminders/domain/reminder_models.dart").read_text(
        encoding="utf-8"
    )
    required_reminders = (
        "periodSevenDays", "periodThreeDays", "periodOneDay",
        "periodExpectedDay", "periodLate", "medication", "contraception",
        "supplement", "ovulationTest", "pregnancyTest",
        "maximum", "balanced", "detailed",
    )
    missing_reminders = [item for item in required_reminders if item not in reminder_model]
    if missing_reminders:
        raise SystemExit(f"Reminder model missing: {missing_reminders}")

    production_copy = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore").lower()
        for path in (ROOT / "lib").rglob("*.dart")
    )
    claim_hits = [claim for claim in forbidden_claims if claim in production_copy]
    if claim_hits:
        raise SystemExit(
            "Regulatory firewall violation (diagnose/contraceptive effectiveness claim): "
            + ", ".join(claim_hits)
        )

    print("22/22 worldwide v1.0 capability families traced to implementation and evidence.")
    print("Regulatory firewall scan passed: no forbidden diagnostic/treatment/contraceptive claims.")


if __name__ == "__main__":
    main()
