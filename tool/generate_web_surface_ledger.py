#!/usr/bin/env python3
"""Generate the explicit 258-ID Web/PWA user-surface ledger and public catalogue."""

from __future__ import annotations
import argparse, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "shared/capabilities/sreadya-capabilities.v1.json"
LEDGER = ROOT / "shared/capabilities/web-surfaces.v2.json"
CATALOG = ROOT / "web/src/content/capabilities.generated.json"

BASE_ROUTES = {
    "PRED": "/app/predictions", "REPRO": "/app/reproductive-health",
    "LIFE": "/app/life-stage", "INS": "/app/insights", "RPT": "/app/reports",
    "INT": "/app/assistant", "PART": "/app/sharing", "HEALTH": "/app/settings",
    "A11Y": "/app/settings", "VAULT": "/app/vault", "DIAG": "/app/diagnostics",
}
IMPLEMENTATION_BY_ROUTE = {
    "/app/cycle": "web/src/features/cycle/CycleCorePanel.tsx",
    "/app/calendar": "web/src/features/calendar/CalendarCorePanel.tsx",
    "/app/reproductive-health": "web/src/features/logging/ReproductiveHealthWorkspace.tsx",
    "/app/insights": "web/src/features/insights/InsightsWorkspace.tsx",
    "/app/predictions": "web/src/features/predictions/PredictionWorkspace.tsx",
    "/app/reminders": "web/src/features/reminders/ReminderWorkspace.tsx",
    "/app/symptoms": "web/src/features/logging/SymptomsWorkspace.tsx",
    "/app/wellness": "web/src/features/logging/WellnessWorkspace.tsx",
    "/app/log": "web/src/features/logging/StructuredObservationWorkspace.tsx",
    "/app/life-stage": "web/src/features/life-stage/LifeStageWorkspace.tsx",
    "/app/reports": "web/src/features/reports/ReportsWorkspace.tsx",
    "/app/assistant": "web/src/features/assistant/AssistantWorkspace.tsx",
    "/app/sharing": "web/src/features/sharing/SharingWorkspace.tsx",
    "/app/settings": "web/src/features/settings/SettingsWorkspace.tsx",
    "/app/privacy": "web/src/features/privacy/PrivacyWorkspace.tsx",
    "/app/vault": "web/src/features/vault/CycleVaultWorkspace.tsx",
    "/app/diagnostics": "web/src/features/diagnostics/DiagnosticsWorkspace.tsx",
    "/app/account": "web/src/features/account/AccountWorkspace.tsx",
    "/app/devices": "web/src/features/account/DevicesWorkspace.tsx",
    "/app/recovery": "web/src/features/account/RecoveryWorkspace.tsx",
    "/app/sync": "web/src/features/sync/SyncWorkspace.tsx",
    "/app/more": "web/src/app/app/more/page.tsx",
    "/install/pwa": "web/src/components/pwa/InstallGuide.tsx",
    "/install/iphone": "web/src/components/pwa/InstallGuide.tsx",
    "/install/android": "web/src/components/pwa/InstallGuide.tsx",
    "/download": "web/src/components/PublicTopicContent.tsx",
    "/features": "web/src/components/CapabilityCatalogue.tsx",
    "/": "web/src/app/page.tsx"
}
EVIDENCE_BY_FAMILY = {
    "CYC": "web/e2e/account-free-core.spec.ts",
    "PRED": "web/e2e/prediction-local.spec.ts",
    "REM": "web/e2e/reminder-health.spec.ts",
    "LOG": "web/e2e/product-completeness.spec.ts",
    "REPRO": "web/e2e/product-completeness.spec.ts",
    "LIFE": "web/e2e/task13-local-intelligence.spec.ts",
    "INS": "web/e2e/task13-local-intelligence.spec.ts",
    "RPT": "web/e2e/task13-local-intelligence.spec.ts",
    "INT": "web/e2e/task13-local-intelligence.spec.ts",
    "PART": "web/e2e/task13-local-intelligence.spec.ts",
    "HEALTH": "web/e2e/accessibility-i18n.spec.ts",
    "A11Y": "web/e2e/accessibility-i18n.spec.ts",
    "PRIV": "web/e2e/task13-local-intelligence.spec.ts",
    "VAULT": "web/e2e/cyclevault-production.spec.ts",
    "DIAG": "web/e2e/product-completeness.spec.ts",
    "ID": "web/e2e/product-completeness.spec.ts",
    "SYNC": "web/e2e/product-completeness.spec.ts",
    "WEB": "web/e2e/navigation.spec.ts"
}

def route_for(capability_id: str, family: str) -> str:
    n = int(capability_id.split("-", 1)[1])
    if family == "CYC":
        if n == 4: return "/app/reproductive-health"
        if n in {7, 9, 10, 11, 12}: return "/app/calendar"
        if n == 14: return "/app/insights"
        return "/app/cycle"
    if family == "ID":
        if n == 8: return "/app/devices"
        if n >= 9: return "/app/recovery"
        return "/app/account"
    if family == "SYNC":
        return "/app/devices" if n in {6, 7, 8, 14} else "/app/sync"
    if family == "PRIV":
        return {7:"/app/account",8:"/app/vault",9:"/app/privacy",10:"/app/devices",11:"/app/sharing",12:"/app/sharing",13:"/app/devices",18:"/app/reminders"}.get(n, "/app/privacy")
    if family == "LOG":
        if n <= 10 or n in {24, 25}: return "/app/symptoms"
        if 18 <= n <= 20: return "/app/reproductive-health"
        if 11 <= n <= 23: return "/app/wellness"
        return "/app/log"
    if family == "REM": return "/app/reminders"
    if family == "WEB":
        return {1:"/app/more",2:"/install/pwa",3:"/install/pwa",4:"/install/pwa",5:"/app/vault",6:"/app/reminders",7:"/app/reminders",8:"/install/iphone",9:"/install/android",10:"/",11:"/features",12:"/",13:"/download",14:"/download"}.get(n, "/features")
    return BASE_ROUTES.get(family, "/app/more")

def surface_type(record: dict) -> str:
    capability_id, family = record["id"], record["family"]
    if record["platforms"]["web"] == "na": return "platform-adapted"
    if capability_id in {"INT-003", "WEB-006"}: return "platform-adapted"
    if family == "SYNC": return "provider-dependent"
    if family == "ID" and capability_id not in {"ID-001", "ID-013"}: return "provider-dependent"
    if capability_id in {"PART-010", "PRIV-007", "PRIV-013"}: return "provider-dependent"
    if family == "PRIV": return "protection"
    if family in {"PRED", "INS", "DIAG", "HEALTH", "WEB"}: return "status"
    return "interaction"

def render() -> tuple[str, str]:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    launch = [r for r in registry["capabilities"] if not r["id"].startswith("FUT-")]
    future = [r for r in registry["capabilities"] if r["id"].startswith("FUT-")]
    if len(launch) != 258: raise SystemExit(f"expected 258 launch requirements, got {len(launch)}")
    rows = []
    for record in launch:
        route = route_for(record["id"], record["family"])
        rows.append({
            "id": record["id"], "name": record["name"], "family": record["family"],
            "route": route, "surface_type": surface_type(record),
            "web_applicability": record["platforms"]["web"],
            "implementation": [IMPLEMENTATION_BY_ROUTE.get(route, "web/src/app/app/more/page.tsx")],
            "evidence": [EVIDENCE_BY_FAMILY.get(record["family"], "web/e2e/product-completeness.spec.ts")],
            "user_promise": record["name"],
        })
    ledger = {
        "contract": "SREADYA Web Product Surface Ledger", "version": 2,
        "registry": "shared/capabilities/sreadya-capabilities.v1.json",
        "launch_requirement_count": 258,
        "claim_boundary": "A surface row proves discoverability/ownership and user-facing routing. Provider-dependent and platform-adapted rows remain visible without pretending that an optional backend or native-only mechanism is active on a static Web deployment.",
        "capabilities": rows,
    }
    catalog = {
        "generated_from": "shared/capabilities/sreadya-capabilities.v1.json",
        "launch_requirement_count": 258, "future_requirement_count": len(future),
        "families": registry["families"],
        "launch": [{k:r[k] for k in ("id","name","family","route","surface_type","web_applicability")} for r in rows],
        "future": [{"id":r["id"],"name":r["name"],"family":r["family"]} for r in future],
    }
    return json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    ledger, catalog = render()
    if args.check:
        if LEDGER.read_text(encoding="utf-8") != ledger: raise SystemExit("Web product-surface ledger is stale")
        if CATALOG.read_text(encoding="utf-8") != catalog: raise SystemExit("Web public capability catalogue is stale")
        print("Web product surfaces: 258/258 launch IDs reproducible")
        return
    LEDGER.write_text(ledger, encoding="utf-8")
    CATALOG.write_text(catalog, encoding="utf-8")
    print("generated Web product surfaces: 258 launch IDs")

if __name__ == "__main__":
    main()
