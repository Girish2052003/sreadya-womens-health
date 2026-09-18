#!/usr/bin/env python3
"""Generate the explicit 258-ID Web/PWA user-surface ledger and public catalogue."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "shared/capabilities/sreva-capabilities.v1.json"
LEDGER = ROOT / "shared/capabilities/web-surfaces.v2.json"
CATALOG = ROOT / "web/src/content/capabilities.generated.json"

ROUTES = {
    "CYC": "/app/cycle",
    "PRED": "/app/predictions",
    "REM": "/app/reminders",
    "LOG": "/app/log",
    "REPRO": "/app/reproductive-health",
    "LIFE": "/app/life-stage",
    "INS": "/app/insights",
    "RPT": "/app/reports",
    "INT": "/app/assistant",
    "PART": "/app/sharing",
    "HEALTH": "/app/settings",
    "A11Y": "/app/settings",
    "PRIV": "/app/privacy",
    "VAULT": "/app/vault",
    "DIAG": "/app/diagnostics",
    "ID": "/app/account",
    "SYNC": "/app/sync",
    "WEB": "/app/more"
}
IMPLEMENTATION = {
    "CYC": [
        "web/src/features/cycle/CycleCorePanel.tsx"
    ],
    "PRED": [
        "web/src/features/predictions/PredictionWorkspace.tsx"
    ],
    "REM": [
        "web/src/features/reminders/ReminderWorkspace.tsx"
    ],
    "LOG": [
        "web/src/features/logging/StructuredObservationWorkspace.tsx"
    ],
    "REPRO": [
        "web/src/features/logging/ReproductiveHealthWorkspace.tsx"
    ],
    "LIFE": [
        "web/src/features/life-stage/LifeStageWorkspace.tsx"
    ],
    "INS": [
        "web/src/features/insights/InsightsWorkspace.tsx"
    ],
    "RPT": [
        "web/src/features/reports/ReportsWorkspace.tsx"
    ],
    "INT": [
        "web/src/features/assistant/AssistantWorkspace.tsx"
    ],
    "PART": [
        "web/src/features/sharing/SharingWorkspace.tsx"
    ],
    "HEALTH": [
        "web/src/features/settings/SettingsWorkspace.tsx"
    ],
    "A11Y": [
        "web/src/features/settings/SettingsWorkspace.tsx"
    ],
    "PRIV": [
        "web/src/features/privacy/PrivacyWorkspace.tsx"
    ],
    "VAULT": [
        "web/src/features/vault/CycleVaultWorkspace.tsx"
    ],
    "DIAG": [
        "web/src/features/diagnostics/DiagnosticsWorkspace.tsx"
    ],
    "ID": [
        "web/src/features/account/AccountWorkspace.tsx"
    ],
    "SYNC": [
        "web/src/features/sync/SyncWorkspace.tsx"
    ],
    "WEB": [
        "web/src/app/app/more/page.tsx"
    ]
}


def route_for(capability_id: str, family: str) -> str:
    number = int(capability_id.split("-", 1)[1])
    if family == "ID":
        if number == 8:
            return "/app/devices"
        if number >= 9:
            return "/app/recovery"
    if family == "SYNC" and 6 <= number <= 8:
        return "/app/devices"
    if family == "PRIV":
        overrides = {
            7: "/app/account",
            8: "/app/vault",
            10: "/app/devices",
            11: "/app/sharing",
            12: "/app/sharing",
            13: "/app/devices",
            18: "/app/reminders",
        }
        if number in overrides:
            return overrides[number]
    if family == "LOG":
        if number <= 10:
            return "/app/symptoms"
        if number <= 24:
            return "/app/wellness"
        return "/app/log"
    if family == "REM" and 6 <= number <= 10:
        return "/app/medication"
    return ROUTES[family]


def implementation_for(capability_id: str, family: str) -> list[str]:
    route = route_for(capability_id, family)
    overrides = {
        "/app/devices": "web/src/features/account/DevicesWorkspace.tsx",
        "/app/recovery": "web/src/features/account/RecoveryWorkspace.tsx",
        "/app/account": "web/src/features/account/AccountWorkspace.tsx",
        "/app/symptoms": "web/src/features/logging/SymptomsWorkspace.tsx",
        "/app/wellness": "web/src/features/logging/WellnessWorkspace.tsx",
        "/app/medication": "web/src/features/logging/MedicationWorkspace.tsx",
    }
    if route in overrides:
        return [overrides[route]]
    return list(IMPLEMENTATION[family])


def surface_type(record: dict) -> str:
    if record["platforms"]["web"] == "na":
        return "platform-adapted"
    if record["family"] == "PRIV":
        return "protection"
    if record["family"] in {"PRED", "INS", "DIAG", "HEALTH", "WEB"}:
        return "status"
    return "interaction"


def render() -> tuple[str, str]:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    launch = [record for record in registry["capabilities"] if not record["id"].startswith("FUT-")]
    future = [record for record in registry["capabilities"] if record["id"].startswith("FUT-")]
    if len(launch) != 258:
        raise SystemExit(f"expected 258 launch requirements, got {len(launch)}")

    rows = []
    for record in launch:
        capability_id = record["id"]
        family = record["family"]
        rows.append({
            "id": capability_id,
            "name": record["name"],
            "family": family,
            "route": route_for(capability_id, family),
            "surface_type": surface_type(record),
            "web_applicability": record["platforms"]["web"],
            "implementation": implementation_for(capability_id, family),
            "evidence": ["web/e2e/product-completeness.spec.ts"],
            "user_promise": record["name"],
        })

    ledger = {
        "contract": "SREVA Web Product Surface Ledger",
        "version": 2,
        "registry": "shared/capabilities/sreva-capabilities.v1.json",
        "launch_requirement_count": 258,
        "claim_boundary": "A surface row proves discoverability/ownership and user-facing routing. It does not turn provider-dependent or native-only capabilities into fake browser behavior.",
        "capabilities": rows,
    }
    catalog = {
        "generated_from": "shared/capabilities/sreva-capabilities.v1.json",
        "launch_requirement_count": 258,
        "future_requirement_count": len(future),
        "families": registry["families"],
        "launch": [
            {
                "id": row["id"],
                "name": row["name"],
                "family": row["family"],
                "route": row["route"],
                "surface_type": row["surface_type"],
                "web_applicability": row["web_applicability"],
            }
            for row in rows
        ],
        "future": [
            {"id": record["id"], "name": record["name"], "family": record["family"]}
            for record in future
        ],
    }
    return (
        json.dumps(ledger, ensure_ascii=False, indent=2) + "\n",
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    ledger, catalog = render()
    if args.check:
        if LEDGER.read_text(encoding="utf-8") != ledger:
            raise SystemExit("Web product-surface ledger is stale")
        if CATALOG.read_text(encoding="utf-8") != catalog:
            raise SystemExit("Web public capability catalogue is stale")
        print("Web product surfaces: 258/258 launch IDs reproducible")
        return
    LEDGER.write_text(ledger, encoding="utf-8")
    CATALOG.write_text(catalog, encoding="utf-8")
    print("generated Web product surfaces: 258 launch IDs")


if __name__ == "__main__":
    main()
