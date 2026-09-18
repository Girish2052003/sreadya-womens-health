from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "shared" / "capabilities" / "sreadya-capabilities.v1.json"
SPEC = ROOT / "docs" / "superpowers" / "specs" / "2026-09-16-sreadya-web-product-architecture-design.md"

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


def _approved_rows() -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    text = SPEC.read_text(encoding="utf-8")
    start = text.index("## 1.1 Cycle and period tracking")
    future_start = text.index("## 1.19 Future/optional", start)
    end = text.index("# SECTION 2", future_start)
    row = r"^([A-Z0-9]+-\d{3})[ \t]+(.+?)[ \t]*$"
    launch = re.findall(row, text[start:future_start], flags=re.MULTILINE)
    future = [
        (item_id, name)
        for item_id, name in re.findall(row, text[future_start:end], flags=re.MULTILINE)
        if item_id.startswith("FUT-")
    ]
    return launch, future


def test_registry_has_exact_258_launch_requirements_across_18_families() -> None:
    payload = _load()
    records = payload["capabilities"]
    launch = [record for record in records if not record["id"].startswith("FUT-")]

    assert payload["launch_requirement_count"] == 258
    assert payload["launch_family_count"] == 18
    assert len(EXPECTED_FAMILIES) == 18
    assert len(launch) == 258
    assert Counter(record["family"] for record in launch) == Counter(EXPECTED_FAMILIES)


def test_registry_exactly_matches_frozen_spec_ids_and_names() -> None:
    payload = _load()
    launch_records = [record for record in payload["capabilities"] if not record["id"].startswith("FUT-")]
    future_records = [record for record in payload["capabilities"] if record["id"].startswith("FUT-")]
    launch, future = _approved_rows()

    assert [(record["id"], record["name"]) for record in launch_records] == launch
    assert [(record["id"], record["name"]) for record in future_records] == future


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
    assert len(future) == 11
    for record in future:
        assert record["launch_status"] == "future"
        assert record["marketing_eligible"] is False
