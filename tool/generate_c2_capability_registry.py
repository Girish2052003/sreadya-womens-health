#!/usr/bin/env python3
"""Generate the SREVA C2 capability registry from the approved architecture spec.

The architecture specification is the human-auditable source for capability
IDs and names. This generator adds explicit machine lifecycle/applicability
metadata without claiming that a contract-only capability is implemented.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md"
OUT = ROOT / "shared/capabilities/sreva-capabilities.v1.json"

EXPECTED = {
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

FAMILY_NAMES = {
    "CYC": "Cycle and periods",
    "PRED": "Predictions",
    "REM": "Reminders",
    "LOG": "Daily logging",
    "REPRO": "Reproductive observations",
    "LIFE": "Life stages",
    "INS": "Insights",
    "RPT": "Reports",
    "INT": "Interaction / assistant",
    "PART": "Partner sharing",
    "HEALTH": "Health integrations",
    "A11Y": "Accessibility / worldwide",
    "PRIV": "Privacy",
    "VAULT": "Vault / backup / migration",
    "DIAG": "Diagnostics",
    "ID": "Identity / recovery",
    "SYNC": "E2EE sync / devices",
    "WEB": "Web / PWA",
}


def _platforms(capability_id: str) -> dict[str, str]:
    family, number_text = capability_id.split("-")
    number = int(number_text)
    result = {"android": "full", "ios": "full", "web": "full", "pwa": "full"}

    if family == "WEB":
        return {"android": "na", "ios": "na", "web": "full", "pwa": "full"}

    if family == "HEALTH":
        if number == 1:
            return {"android": "na", "ios": "full", "web": "na", "pwa": "na"}
        if number == 2:
            return {"android": "full", "ios": "na", "web": "na", "pwa": "na"}
        if number in {3, 4, 5}:
            return {"android": "full", "ios": "full", "web": "na", "pwa": "na"}
        if number == 7:
            return {"android": "full", "ios": "full", "web": "adapted", "pwa": "adapted"}

    if family == "REM" and (number <= 18 or number in {23, 24}):
        result["web"] = "adapted"
        result["pwa"] = "adapted"

    if family == "PRIV" and number in {1, 15, 17}:
        result["web"] = "adapted"
        result["pwa"] = "adapted"

    if family == "ID" and number in {7, 8}:
        result["android"] = "adapted"
        result["ios"] = "adapted"

    return result


def _offline(family: str) -> str:
    return {
        "ID": "networked",
        "SYNC": "networked",
        "WEB": "mixed",
        "HEALTH": "platform-adapter",
    }.get(family, "required-core")


def _sync(family: str) -> str:
    return {
        "SYNC": "e2ee-continuity",
        "ID": "identity",
        "WEB": "optional",
        "A11Y": "not-required",
        "DIAG": "not-required",
    }.get(family, "optional-e2ee")


def _privacy(family: str) -> str:
    if family in {"CYC", "PRED", "REM", "LOG", "REPRO", "LIFE", "INS", "RPT", "INT", "PART", "HEALTH", "VAULT"}:
        return "health-sensitive"
    if family in {"PRIV", "SYNC"}:
        return "security-sensitive"
    if family == "ID":
        return "identity-sensitive"
    if family == "DIAG":
        return "operational-no-health-payload"
    if family == "WEB":
        return "public-or-local-private"
    return "product-accessibility"


def _extract(spec: str) -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    """Extract only approved Section 1 atomic rows.

    The frozen spec contains two historical spacing styles: early rows use two
    spaces after the ID while later rows use one. Accept horizontal whitespace
    without relying on Markdown examples elsewhere in the document.
    """
    atomic_start = spec.index("## 1.1 Cycle and period tracking")
    future_start = spec.index("## 1.19 Future/optional", atomic_start)
    section_two = spec.index("# SECTION 2", future_start)
    row = r"^([A-Z0-9]+-\d{3})[ \t]+(.+?)[ \t]*$"
    launch = re.findall(row, spec[atomic_start:future_start], flags=re.MULTILINE)
    future = re.findall(row, spec[future_start:section_two], flags=re.MULTILINE)
    future = [(item_id, name) for item_id, name in future if item_id.startswith("FUT-")]
    return launch, future


def main() -> None:
    launch, future = _extract(SPEC.read_text(encoding="utf-8"))
    counts = Counter(item_id.split("-")[0] for item_id, _ in launch)
    if len(launch) != 258 or counts != Counter(EXPECTED):
        raise SystemExit(f"Approved capability source changed: count={len(launch)}, families={dict(counts)}")
    if len(future) != 11:
        raise SystemExit(f"Approved future-capability source changed: count={len(future)}")

    records: list[dict[str, object]] = []
    for capability_id, name in launch:
        family = capability_id.split("-")[0]
        records.append(
            {
                "id": capability_id,
                "name": name,
                "family": family,
                "launch_status": "contract",
                "platforms": _platforms(capability_id),
                "offline": _offline(family),
                "sync": _sync(family),
                "privacy_class": _privacy(family),
                "tests_required": ["contract", "platform-conformance", "privacy"],
                "marketing_eligible": False,
            }
        )

    for capability_id, name in future:
        records.append(
            {
                "id": capability_id,
                "name": name,
                "family": "FUT",
                "launch_status": "future",
                "platforms": {"android": "na", "ios": "na", "web": "na", "pwa": "na"},
                "offline": "future-review",
                "sync": "future-review",
                "privacy_class": "future-review",
                "tests_required": ["design-review"],
                "marketing_eligible": False,
            }
        )

    payload = {
        "contract": "SREVA C2 Capability Registry",
        "version": 1,
        "source": "docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md#section-1--master-capability-contract",
        "launch_requirement_count": 258,
        "launch_family_count": 18,
        "families": [
            {"prefix": prefix, "name": FAMILY_NAMES[prefix], "count": EXPECTED[prefix]}
            for prefix in EXPECTED
        ],
        "capabilities": records,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"generated {len(launch)} launch requirements + {len(future)} future capabilities -> {OUT}")


if __name__ == "__main__":
    main()
