from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

LEDGER = ROOT / "shared/acceptance/task28-acceptance.v1.json"
VERIFIER = ROOT / "tool/verify_task28_acceptance.py"
WORKFLOW = ROOT / ".github/workflows/c2-task28-staged-acceptance.yml"
DOC = ROOT / "docs/verification/C2_TASK28_STAGED_ACCEPTANCE.md"

EXPECTED_STAGE_ORDER = [
    "web_pwa_wife_alpha",
    "android_wife_alpha_regression",
    "ios_native_distribution",
    "multi_device_e2ee_acceptance",
    "private_beta",
    "staged_production",
]

EXPECTED_PARITY_DIMENSIONS = {
    "terminology",
    "data",
    "predictions",
    "privacy",
    "reports",
    "reminders",
    "life_stage_behavior",
    "recovery_semantics",
    "sync_results",
}

EXPECTED_PRODUCTION_GATES = {
    "privacy",
    "migration",
    "reminder",
    "recovery",
    "ciphertext_authorization",
    "data_loss",
}


def _text(path: Path) -> str:
    assert path.is_file(), f"missing Task 28 surface: {path.relative_to(ROOT)}"
    return path.read_text(encoding="utf-8")


def test_task28_acceptance_ledger_has_ordered_external_stages_and_blocks_rollout() -> None:
    assert LEDGER.is_file(), f"missing {LEDGER.relative_to(ROOT)}"
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))

    assert ledger.get("version") == 1
    assert ledger.get("task") == 28
    assert ledger.get("release_state") == "blocked_external_acceptance"

    stages = ledger.get("stages")
    assert isinstance(stages, list)
    assert [stage.get("id") for stage in stages] == EXPECTED_STAGE_ORDER

    for stage in stages[:-1]:
        assert stage.get("kind") == "external"
        assert stage.get("status") == "external_pending"
        assert isinstance(stage.get("evidence_required"), list) and stage["evidence_required"]
        assert stage.get("evidence") == []

    production = stages[-1]
    assert production.get("kind") == "external"
    assert production.get("status") == "blocked"
    assert isinstance(production.get("evidence_required"), list) and production["evidence_required"]
    assert production.get("evidence") == []


def test_task28_ledger_covers_user_visible_parity_and_production_stop_gates() -> None:
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))

    parity = ledger.get("user_visible_parity")
    assert isinstance(parity, list)
    assert {item.get("id") for item in parity} == EXPECTED_PARITY_DIMENSIONS
    for item in parity:
        assert item.get("repository_preflight") in {"covered", "adapted"}
        assert isinstance(item.get("evidence"), list) and item["evidence"]

    gates = ledger.get("production_stop_gates")
    assert isinstance(gates, list)
    assert {item.get("id") for item in gates} == EXPECTED_PRODUCTION_GATES
    for item in gates:
        assert item.get("status") == "repository_green"
        assert isinstance(item.get("evidence"), list) and item["evidence"]


def test_task28_verifier_is_fail_closed_for_external_acceptance() -> None:
    text = _text(VERIFIER).lower()
    for fragment in (
        "blocked_external_acceptance",
        "external_pending",
        "staged_production",
        "evidence_required",
        "production_stop_gates",
        "user_visible_parity",
        "cannot mark production ready",
    ):
        assert fragment in text


def test_task28_workflow_runs_acceptance_verifier_and_preserves_stronger_gates() -> None:
    text = _text(WORKFLOW)
    for fragment in (
        "python -m pytest -q verification/reference/test_task28_staged_acceptance.py",
        "python tool/verify_task28_acceptance.py",
        "python tool/verify_cross_platform_traceability.py",
        "python tool/verify_v1_traceability.py",
        "python tool/release_backlog_scan.py",
        "python tool/privacy_scan.py",
        "python tool/secret_scan.py",
    ):
        assert fragment in text


def test_task28_acceptance_document_never_fabricates_human_or_store_acceptance() -> None:
    text = _text(DOC).lower()
    for fragment in (
        "wife alpha",
        "external_pending",
        "real-device",
        "private beta",
        "staged production",
        "no production rollout",
        "repository preflight is not human acceptance",
        "no real health data",
        "ios signing",
    ):
        assert fragment in text

    assert "wife alpha: passed" not in text
    assert "private beta: passed" not in text
    assert "staged production: passed" not in text
