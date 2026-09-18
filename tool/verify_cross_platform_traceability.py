#!/usr/bin/env python3
"""Fail closed unless the explicit 258-ID / 1,032-cell Task 25 ledger is valid."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "shared" / "capabilities" / "sreadya-capabilities.v1.json"
LEDGER = ROOT / "shared" / "capabilities" / "evidence.v1.json"
PLATFORMS = ("android", "ios", "web", "pwa")
ALLOWED_APPLICABILITY = {"full", "adapted", "na"}
ALLOWED_STATUSES = {"verified", "implemented", "na"}
EVIDENCE_PREFIXES = (
    "test/",
    "verification/reference/",
    "web/",
    ".github/workflows/",
    "platform_templates/",
    "sync_service/",
)


def fail(message: str) -> None:
    raise SystemExit(f"Cross-platform traceability failed: {message}")


def load_object(path: Path) -> dict:
    if not path.is_file() or path.stat().st_size == 0:
        fail(f"missing or empty artifact: {path.relative_to(ROOT)}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"cannot parse {path.relative_to(ROOT)}: {error}")
    if not isinstance(value, dict):
        fail(f"{path.relative_to(ROOT)} must contain a JSON object")
    return value


def safe_file(relative: object, capability_id: str, platform: str) -> str:
    if not isinstance(relative, str) or not relative or relative.startswith("/"):
        fail(f"{capability_id}/{platform} contains an invalid path")
    candidate = Path(relative)
    if ".." in candidate.parts:
        fail(f"{capability_id}/{platform} path escapes the repository: {relative}")
    target = (ROOT / candidate).resolve()
    try:
        target.relative_to(ROOT.resolve())
    except ValueError:
        fail(f"{capability_id}/{platform} path escapes the repository: {relative}")
    if not target.is_file() or target.stat().st_size == 0:
        fail(f"{capability_id}/{platform} target missing or empty: {relative}")
    return relative


def main() -> None:
    registry = load_object(REGISTRY)
    ledger = load_object(LEDGER)

    if ledger.get("contract") != "SREADYA C2 Cross-Platform Evidence Ledger":
        fail("ledger contract identifier changed")
    if ledger.get("version") != 1:
        fail("ledger version must be 1")
    if ledger.get("registry") != "shared/capabilities/sreadya-capabilities.v1.json":
        fail("ledger registry pointer changed")

    records = registry.get("capabilities")
    rows = ledger.get("capabilities")
    if not isinstance(records, list):
        fail("registry capabilities must be a list")
    if not isinstance(rows, list):
        fail("ledger capabilities must be a list")

    launch = [
        record
        for record in records
        if isinstance(record, dict)
        and isinstance(record.get("id"), str)
        and not record["id"].startswith("FUT-")
    ]
    if len(launch) != 258:
        fail(f"registry must contain exactly 258 launch IDs, got {len(launch)}")
    registry_ids = [record["id"] for record in launch]
    if len(set(registry_ids)) != 258:
        fail("registry launch IDs must be unique")

    if len(rows) != 258:
        fail(f"ledger must contain exactly 258 rows, got {len(rows)}")
    ledger_ids = [row.get("id") if isinstance(row, dict) else None for row in rows]
    if ledger_ids != registry_ids:
        fail("ledger IDs/order must exactly match the frozen registry")
    if len(set(ledger_ids)) != 258:
        fail("ledger IDs must be unique")

    registry_by_id = {record["id"]: record for record in launch}
    status_counts: Counter[str] = Counter()
    applicability_counts: Counter[str] = Counter()

    for row in rows:
        capability_id = row["id"]
        if set(row) != {"id", "platforms"}:
            fail(f"{capability_id} row must contain only id and platforms")
        platform_cells = row["platforms"]
        if not isinstance(platform_cells, dict) or set(platform_cells) != set(PLATFORMS):
            fail(f"{capability_id} must contain exactly android/ios/web/pwa cells")

        expected_platforms = registry_by_id[capability_id].get("platforms")
        if not isinstance(expected_platforms, dict) or set(expected_platforms) != set(PLATFORMS):
            fail(f"{capability_id} registry platform contract is invalid")

        for platform in PLATFORMS:
            cell = platform_cells[platform]
            if not isinstance(cell, dict):
                fail(f"{capability_id}/{platform} cell must be an object")
            required = {"applicability", "status", "implementation", "evidence", "rationale"}
            if set(cell) != required:
                fail(f"{capability_id}/{platform} cell fields changed")

            applicability = cell["applicability"]
            status = cell["status"]
            implementation = cell["implementation"]
            evidence = cell["evidence"]
            rationale = cell["rationale"]

            if applicability not in ALLOWED_APPLICABILITY:
                fail(f"{capability_id}/{platform} has invalid applicability {applicability!r}")
            if applicability != expected_platforms[platform]:
                fail(
                    f"{capability_id}/{platform} applicability mismatch: "
                    f"ledger={applicability!r}, registry={expected_platforms[platform]!r}"
                )
            if status not in ALLOWED_STATUSES:
                fail(f"{capability_id}/{platform} has invalid status {status!r}")
            if not isinstance(implementation, list):
                fail(f"{capability_id}/{platform} implementation must be a list")
            if not isinstance(evidence, list):
                fail(f"{capability_id}/{platform} evidence must be a list")
            if not isinstance(rationale, str):
                fail(f"{capability_id}/{platform} rationale must be a string")

            applicability_counts[applicability] += 1
            status_counts[status] += 1

            if applicability == "na":
                if status != "na":
                    fail(f"{capability_id}/{platform} N/A applicability requires status=na")
                if implementation or evidence:
                    fail(f"{capability_id}/{platform} N/A cell must not claim implementation/evidence")
                if not rationale.strip():
                    fail(f"{capability_id}/{platform} N/A cell lacks rationale")
                continue

            if status not in {"implemented", "verified"}:
                fail(f"{capability_id}/{platform} applicable cell lacks implementation status")
            if not implementation:
                fail(f"{capability_id}/{platform} has no implementation trace")
            if not evidence:
                fail(f"{capability_id}/{platform} has no evidence trace")
            if applicability == "adapted" and not rationale.strip():
                fail(f"{capability_id}/{platform} adapted cell lacks rationale")

            for relative in implementation:
                safe_file(relative, capability_id, platform)
            for relative in evidence:
                path = safe_file(relative, capability_id, platform)
                if not path.startswith(EVIDENCE_PREFIXES):
                    fail(
                        f"{capability_id}/{platform} evidence is outside approved evidence homes: {path}"
                    )

    if sum(status_counts.values()) != 1032:
        fail("platform-cell accounting is incomplete")
    if sum(applicability_counts.values()) != 1032:
        fail("applicability accounting is incomplete")

    print(
        "cross-platform traceability: "
        "258/258 launch IDs explicit; 1032/1032 platform cells explicit; "
        f"implemented={status_counts['implemented']}; "
        f"verified={status_counts['verified']}; "
        f"na={status_counts['na']}; "
        f"adapted={applicability_counts['adapted']}"
    )


if __name__ == "__main__":
    main()
