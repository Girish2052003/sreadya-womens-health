#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "shared/acceptance/task28-acceptance.v1.json"

EXPECTED_STAGE_ORDER = [
    "web_pwa_wife_alpha",
    "android_wife_alpha_regression",
    "ios_native_distribution",
    "multi_device_e2ee_acceptance",
    "private_beta",
    "staged_production",
]
EXPECTED_PARITY = {
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
EXPECTED_STOP_GATES = {
    "privacy",
    "migration",
    "reminder",
    "recovery",
    "ciphertext_authorization",
    "data_loss",
}


def fail(message: str) -> None:
    raise SystemExit(f"Task 28 acceptance verification failed: {message}")


def require_paths(paths: list[str], label: str) -> None:
    if not paths:
        fail(f"{label} has no repository evidence")
    for raw in paths:
        if not isinstance(raw, str) or not raw.strip():
            fail(f"{label} contains an empty evidence path")
        path = ROOT / raw
        if not path.exists():
            fail(f"{label} references missing repository evidence: {raw}")


def main() -> int:
    if not LEDGER.is_file():
        fail("missing Task 28 acceptance ledger")

    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    if ledger.get("version") != 1 or ledger.get("task") != 28:
        fail("unexpected ledger version/task")

    parity = ledger.get("user_visible_parity")
    if not isinstance(parity, list) or {x.get("id") for x in parity} != EXPECTED_PARITY:
        fail("user_visible_parity does not match the approved Task 28 dimensions")
    for item in parity:
        if item.get("repository_preflight") not in {"covered", "adapted"}:
            fail(f"parity dimension {item.get('id')} lacks repository preflight coverage")
        require_paths(item.get("evidence", []), f"parity:{item.get('id')}")

    gates = ledger.get("production_stop_gates")
    if not isinstance(gates, list) or {x.get("id") for x in gates} != EXPECTED_STOP_GATES:
        fail("production_stop_gates do not match the approved Task 28 safety gates")
    for gate in gates:
        if gate.get("status") != "repository_green":
            fail(f"production stop gate is not repository_green: {gate.get('id')}")
        require_paths(gate.get("evidence", []), f"gate:{gate.get('id')}")

    stages = ledger.get("stages")
    if not isinstance(stages, list) or [x.get("id") for x in stages] != EXPECTED_STAGE_ORDER:
        fail("staged acceptance order does not match the approved Task 28 sequence")

    for stage in stages:
        if stage.get("kind") != "external":
            fail(f"Task 28 external stage misclassified: {stage.get('id')}")
        require_paths(stage.get("repository_preflight", []), f"stage-preflight:{stage.get('id')}")
        required = stage.get("evidence_required")
        if not isinstance(required, list) or not required:
            fail(f"stage has no evidence_required contract: {stage.get('id')}")
        evidence = stage.get("evidence")
        if not isinstance(evidence, list):
            fail(f"stage evidence must be a list: {stage.get('id')}")

        status = stage.get("status")
        if stage.get("id") == "staged_production":
            if status not in {"blocked", "accepted"}:
                fail("staged_production must be blocked or accepted")
        elif status not in {"external_pending", "accepted"}:
            fail(f"invalid external stage status for {stage.get('id')}: {status}")

        if status == "accepted" and not evidence:
            fail(f"accepted external stage has no evidence: {stage.get('id')}")
        if status in {"external_pending", "blocked"} and evidence:
            fail(f"pending/blocked external stage must not carry fabricated evidence: {stage.get('id')}")

    prior = stages[:-1]
    production = stages[-1]
    all_external_accepted = all(stage.get("status") == "accepted" for stage in prior)

    if ledger.get("release_state") == "ready_for_staged_production":
        if not all_external_accepted or production.get("status") != "accepted":
            fail("cannot mark production ready until every external acceptance stage has evidence")
    elif ledger.get("release_state") == "blocked_external_acceptance":
        if production.get("status") != "blocked":
            fail("blocked_external_acceptance requires staged_production to remain blocked")
    else:
        fail("unknown release_state")

    if not all_external_accepted and ledger.get("release_state") != "blocked_external_acceptance":
        fail("cannot mark production ready while external_pending stages remain")

    print("Task 28 staged acceptance verifier: PASS")
    print("Repository preflight is green; external wife-alpha/beta/production evidence remains authoritative outside CI.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
