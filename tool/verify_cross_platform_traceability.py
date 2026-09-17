#!/usr/bin/env python3
"""Fail closed unless every Sreva C2 launch capability resolves to platform evidence."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "shared/capabilities/sreva-capabilities.v1.json"
LEDGER = ROOT / "shared/capabilities/evidence.v1.json"
PLATFORMS = ("android", "ios", "web", "pwa")
STATUSES = {"implemented", "verified"}
EVIDENCE_PREFIXES = ("test/", "verification/reference/", "web/", ".github/workflows/", "platform_templates/", "sync_service/")


def fail(message: str) -> None:
    raise SystemExit(f"Cross-platform traceability failed: {message}")


def load(path: Path) -> dict:
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


def trace_for(ledger: dict, capability_id: str, family: str, platform: str) -> dict:
    overrides = ledger.get("overrides")
    profiles = ledger.get("profiles")
    if not isinstance(overrides, dict) or not isinstance(profiles, dict):
        fail("ledger profiles/overrides must be objects")
    capability_override = overrides.get(capability_id, {})
    if not isinstance(capability_override, dict):
        fail(f"{capability_id} override must be an object")
    candidate = capability_override.get(platform)
    if candidate is None:
        family_profile = profiles.get(family)
        if not isinstance(family_profile, dict):
            fail(f"{capability_id} has no family trace profile")
        surface = "mobile" if platform in {"android", "ios"} else "web"
        candidate = family_profile.get(surface)
    if not isinstance(candidate, dict):
        fail(f"{capability_id}/{platform} has no trace profile")
    if set(candidate) != {"implementation", "evidence"}:
        fail(f"{capability_id}/{platform} trace must define implementation and evidence")
    return candidate


def main() -> None:
    registry = load(REGISTRY)
    ledger = load(LEDGER)
    if ledger.get("registry") != "shared/capabilities/sreva-capabilities.v1.json":
        fail("ledger registry pointer changed")
    status = ledger.get("applicable_status")
    if status not in STATUSES:
        fail("ledger applicable_status must be implemented or verified")
    records = registry.get("capabilities")
    if not isinstance(records, list):
        fail("registry capabilities must be a list")
    launch = [record for record in records if isinstance(record, dict) and isinstance(record.get("id"), str) and not record["id"].startswith("FUT-")]
    if len(launch) != 258 or len({record["id"] for record in launch}) != 258:
        fail("registry must contain exactly 258 unique launch IDs")
    adapted_rationales = ledger.get("adapted_rationales")
    na_rationales = ledger.get("na_rationales")
    if not isinstance(adapted_rationales, dict) or not isinstance(na_rationales, dict):
        fail("ledger adapted_rationales/na_rationales must be objects")
    status_counts: Counter[str] = Counter()
    applicability_counts: Counter[str] = Counter()
    for record in launch:
        capability_id = record["id"]
        family = capability_id.split("-", 1)[0]
        platforms = record.get("platforms")
        if not isinstance(platforms, dict) or set(platforms) != set(PLATFORMS):
            fail(f"{capability_id} registry platform contract is invalid")
        for platform in PLATFORMS:
            applicability = platforms[platform]
            applicability_counts[str(applicability)] += 1
            if applicability == "na":
                rationale = na_rationales.get(capability_id, na_rationales.get(family, ""))
                if not isinstance(rationale, str) or not rationale.strip():
                    fail(f"{capability_id}/{platform} N/A cell lacks rationale")
                status_counts["na"] += 1
                continue
            if applicability not in {"full", "adapted"}:
                fail(f"{capability_id}/{platform} has invalid applicability {applicability!r}")
            trace = trace_for(ledger, capability_id, family, platform)
            implementation = trace["implementation"]
            evidence = trace["evidence"]
            if not isinstance(implementation, list) or not implementation:
                fail(f"{capability_id}/{platform} has no implementation trace")
            if not isinstance(evidence, list) or not evidence:
                fail(f"{capability_id}/{platform} has no executable evidence trace")
            for relative in implementation:
                safe_file(relative, capability_id, platform)
            for relative in evidence:
                path = safe_file(relative, capability_id, platform)
                if not path.startswith(EVIDENCE_PREFIXES):
                    fail(f"{capability_id}/{platform} evidence is outside approved evidence homes: {path}")
            if applicability == "adapted":
                rationale = adapted_rationales.get(family, "")
                if not isinstance(rationale, str) or not rationale.strip():
                    fail(f"{capability_id}/{platform} adapted cell lacks rationale")
            status_counts[status] += 1
    if sum(status_counts.values()) != 1032:
        fail("platform-cell accounting is incomplete")
    print("cross-platform traceability: " f"258/258 launch IDs resolved; 1032/1032 platform cells explicit; " f"implemented={status_counts['implemented']}; verified={status_counts['verified']}; " f"na={status_counts['na']}; adapted={applicability_counts['adapted']}")


if __name__ == "__main__":
    main()
