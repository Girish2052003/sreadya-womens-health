from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "shared/capabilities/sreva-capabilities.v1.json"
LEDGER = ROOT / "shared/capabilities/evidence.v1.json"
VERIFIER = ROOT / "tool/verify_cross_platform_traceability.py"
WORKFLOW_DIR = ROOT / ".github" / "workflows"


def _load(path: Path) -> dict:
    assert path.is_file(), f"missing Task 25 traceability artifact: {path}"
    return json.loads(path.read_text(encoding="utf-8"))


def test_ledger_is_conservative_and_registry_anchored() -> None:
    registry = _load(REGISTRY)
    ledger = _load(LEDGER)
    launch = [row for row in registry["capabilities"] if not row["id"].startswith("FUT-")]
    assert len(launch) == 258
    assert len({row["id"] for row in launch}) == 258
    assert ledger["registry"] == "shared/capabilities/sreva-capabilities.v1.json"
    assert ledger["applicable_status"] == "implemented"
    assert isinstance(ledger["profiles"], dict) and ledger["profiles"]
    assert isinstance(ledger["overrides"], dict)
    assert isinstance(ledger["adapted_rationales"], dict)
    assert isinstance(ledger["na_rationales"], dict)


def test_release_verifier_resolves_all_258_ids_and_legacy_gate_still_passes() -> None:
    assert VERIFIER.is_file(), f"missing Task 25 verifier: {VERIFIER}"
    commands = ([sys.executable, "tool/verify_v1_traceability.py"], [sys.executable, "tool/verify_cross_platform_traceability.py"])
    outputs = []
    for command in commands:
        result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
        assert result.returncode == 0, (command, result.stdout, result.stderr)
        outputs.append(result.stdout)
    assert "258/258 launch IDs resolved" in outputs[1]
    assert "1032/1032 platform cells explicit" in outputs[1]


def test_cross_platform_traceability_is_release_enforced_in_ci() -> None:
    workflows = "\n".join(path.read_text(encoding="utf-8") for path in sorted(WORKFLOW_DIR.glob("*.yml")))
    assert "python tool/verify_cross_platform_traceability.py" in workflows
