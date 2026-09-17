from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "shared" / "capabilities" / "sreva-capabilities.v1.json"
EVIDENCE = ROOT / "shared" / "capabilities" / "evidence.v1.json"
VERIFIER = ROOT / "tool" / "verify_cross_platform_traceability.py"
CI_WORKFLOW = ROOT / ".github" / "workflows" / "ci.yml"
PLATFORMS = {"android", "ios", "web", "pwa"}
EVIDENCE_PREFIXES = (
    "test/",
    "verification/reference/",
    "web/",
    ".github/workflows/",
    "platform_templates/",
    "sync_service/",
)


def _load(path: Path) -> dict:
    assert path.is_file(), f"missing Task 25 traceability artifact: {path}"
    return json.loads(path.read_text(encoding="utf-8"))


def _launch_registry() -> list[dict]:
    registry = _load(REGISTRY)
    return [
        record
        for record in registry["capabilities"]
        if not record["id"].startswith("FUT-")
    ]


def _evidence_rows() -> list[dict]:
    return _load(EVIDENCE)["capabilities"]


def test_evidence_ledger_exactly_accounts_for_all_258_launch_ids() -> None:
    registry = _launch_registry()
    evidence = _evidence_rows()

    assert len(registry) == 258
    assert len(evidence) == 258
    assert [row["id"] for row in evidence] == [row["id"] for row in registry]
    assert len({row["id"] for row in evidence}) == 258


def test_every_platform_cell_is_explicit_and_matches_registry_applicability() -> None:
    registry_by_id = {row["id"]: row for row in _launch_registry()}

    for row in _evidence_rows():
        capability_id = row["id"]
        assert set(row) == {"id", "platforms"}, capability_id
        assert set(row["platforms"]) == PLATFORMS, capability_id

        for platform, cell in row["platforms"].items():
            expected_applicability = registry_by_id[capability_id]["platforms"][platform]
            assert cell["applicability"] == expected_applicability, (
                capability_id,
                platform,
            )
            assert cell["status"] in {"verified", "implemented", "na"}, (
                capability_id,
                platform,
            )
            assert isinstance(cell["implementation"], list), (capability_id, platform)
            assert isinstance(cell["evidence"], list), (capability_id, platform)
            assert isinstance(cell["rationale"], str), (capability_id, platform)

            if expected_applicability == "na":
                assert cell["status"] == "na", (capability_id, platform)
                assert not cell["implementation"], (capability_id, platform)
                assert not cell["evidence"], (capability_id, platform)
                assert cell["rationale"].strip(), (capability_id, platform)
                continue

            assert cell["status"] in {"verified", "implemented"}, (
                capability_id,
                platform,
            )
            assert cell["implementation"], (capability_id, platform)
            assert cell["evidence"], (capability_id, platform)
            if expected_applicability == "adapted":
                assert cell["rationale"].strip(), (capability_id, platform)

            for relative in [*cell["implementation"], *cell["evidence"]]:
                target = ROOT / relative
                assert target.is_file() and target.stat().st_size > 0, (
                    capability_id,
                    platform,
                    relative,
                )

            for relative in cell["evidence"]:
                assert relative.startswith(EVIDENCE_PREFIXES), (
                    capability_id,
                    platform,
                    relative,
                )


def test_release_verifier_passes_and_legacy_mobile_gate_remains_compatible() -> None:
    assert VERIFIER.is_file(), f"missing Task 25 verifier: {VERIFIER}"

    for command in (
        [sys.executable, "tool/verify_v1_traceability.py"],
        [sys.executable, "tool/verify_cross_platform_traceability.py"],
    ):
        result = subprocess.run(
            command,
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        assert result.returncode == 0, (
            command,
            result.stdout,
            result.stderr,
        )


def test_cross_platform_traceability_is_release_enforced_in_ci() -> None:
    workflow = CI_WORKFLOW.read_text(encoding="utf-8")
    assert "python tool/verify_cross_platform_traceability.py" in workflow
