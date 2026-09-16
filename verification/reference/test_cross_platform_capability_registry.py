from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "shared" / "capabilities" / "sreva-capabilities.v1.json"

EXPECTED_FAMILIES = {
    "CYC": 15,
    "PRED": 14,
    "REM": 24,
    "LOG": 26,
    "REPRO": 10,
    "LIFE": 9,
    "INS": 16,
    "RPT": 13,
    "INT": 9,
    "PART": 10,
    "HEALTH": 9,
    "A11Y": 15,
    "PRIV": 21,
    "VAULT": 14,
    "DIAG": 11,
    "ID": 13,
    "SYNC": 15,
    "WEB": 14,
}

REQUIRED_FIELDS = {
    "id",
    "name",
    "family",
    "launch_status",
    "platforms",
    "offline",
    "sync",
    "privacy_class",
    "tests_required",
    "marketing_eligible",
}


def _load() -> dict:
    assert REGISTRY.exists(), f"missing capability registry: {REGISTRY}"
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def test_registry_has_exact_258_launch_requirements_across_18_families() -> None:
    payload = _load()
    records = payload["capabilities"]
    launch = [record for record in records if not record["id"].startswith("FUT-")]

    assert len(EXPECTED_FAMILIES) == 18
    assert len(launch) == 258

    counts = Counter(record["family"] for record in launch)
    assert counts == Counter(EXPECTED_FAMILIES)


def test_registry_ids_are_unique_and_records_are_explicit() -> None:
    payload = _load()
    records = payload["capabilities"]
    ids = [record["id"] for record in records]

    assert len(ids) == len(set(ids)), "capability IDs must be unique"

    for record in records:
        assert REQUIRED_FIELDS <= set(record), record.get("id")
        assert record["launch_status"] in {"contract", "implemented", "verified", "future"}
        assert set(record["platforms"]) == {"android", "ios", "web", "pwa"}
        assert set(record["platforms"].values()) <= {"full", "adapted", "na"}
        assert isinstance(record["tests_required"], list) and record["tests_required"]
        assert isinstance(record["marketing_eligible"], bool)


def test_future_entries_do_not_count_toward_launch_contract() -> None:
    payload = _load()
    records = payload["capabilities"]
    launch = [record for record in records if not record["id"].startswith("FUT-")]
    future = [record for record in records if record["id"].startswith("FUT-")]

    assert len(launch) == 258
    for record in future:
        assert record["launch_status"] == "future"
        assert record["marketing_eligible"] is False
