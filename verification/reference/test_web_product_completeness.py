from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

REGISTRY = ROOT / "shared/capabilities/sreva-capabilities.v1.json"
SURFACES = ROOT / "shared/capabilities/web-surfaces.v2.json"
ROUTES = ROOT / "web/src/content/routes.ts"
NAV = ROOT / "web/src/components/navigation/WorkspaceNav.tsx"
HEADER = ROOT / "web/src/components/navigation/WorkspaceHeader.tsx"
MORE = ROOT / "web/src/app/app/more/page.tsx"
DYNAMIC = ROOT / "web/src/app/app/[section]/page.tsx"
BACKLOG_SCAN = ROOT / "tool/release_backlog_scan.py"

REQUIRED_DEDICATED = {
    "symptoms": "SymptomsWorkspace",
    "wellness": "WellnessWorkspace",
    "medication": "MedicationWorkspace",
    "reproductive-health": "ReproductiveHealthWorkspace",
    "diagnostics": "DiagnosticsWorkspace",
}

ACCOUNT_SURFACES = {
    "account": "AccountWorkspace",
    "devices": "DevicesWorkspace",
    "recovery": "RecoveryWorkspace",
    "sync": "SyncWorkspace",
}

ALLOWED_SURFACE_TYPES = {
    "interaction",
    "status",
    "protection",
    "platform-adapted",
}


def read(path: Path) -> str:
    assert path.is_file(), f"missing product-completeness surface: {path.relative_to(ROOT)}"
    return path.read_text(encoding="utf-8")


def test_more_is_a_real_feature_hub_not_a_settings_shortcut() -> None:
    nav = read(NAV)
    assert "['more', 'More', '/app/more']" in nav
    more = read(MORE)
    for route in (
        "/app/cycle",
        "/app/predictions",
        "/app/reminders",
        "/app/symptoms",
        "/app/wellness",
        "/app/medication",
        "/app/reproductive-health",
        "/app/life-stage",
        "/app/insights",
        "/app/reports",
        "/app/assistant",
        "/app/sharing",
        "/app/vault",
        "/app/sync",
        "/app/devices",
        "/app/privacy",
        "/app/account",
        "/app/recovery",
        "/app/diagnostics",
        "/app/settings",
    ):
        assert route in more, f"More hub missing {route}"


def test_workspace_has_explicit_back_and_brand_home_actions() -> None:
    header = read(HEADER)
    assert "router.back()" in header
    assert 'href="/app/home"' in header
    assert "Back" in header
    nav = read(NAV)
    assert 'href="/app/home"' in nav
    assert 'aria-label="Sreva workspace home"' in nav


def test_former_shell_routes_are_dedicated_real_workspaces() -> None:
    dynamic = read(DYNAMIC)
    assert "ready for the capability implementation assigned to this route" not in dynamic.lower()
    for section, component in REQUIRED_DEDICATED.items():
        page = ROOT / f"web/src/app/app/{section}/page.tsx"
        text = read(page)
        assert component in text, f"{section} must render {component}"


def test_identity_and_sync_routes_render_action_workspaces() -> None:
    for section, component in ACCOUNT_SURFACES.items():
        text = read(ROOT / f"web/src/app/app/{section}/page.tsx")
        assert component in text, f"{section} must render {component}"


def test_release_backlog_scan_covers_web_production_source() -> None:
    scan = read(BACKLOG_SCAN)
    assert '"web/src"' in scan or "'web/src'" in scan


def test_258_launch_ids_have_explicit_web_user_surfaces() -> None:
    registry = json.loads(read(REGISTRY))
    launch = [record for record in registry["capabilities"] if not record["id"].startswith("FUT-")]
    assert len(launch) == 258

    ledger = json.loads(read(SURFACES))
    rows = ledger["capabilities"]
    assert len(rows) == 258
    assert [row["id"] for row in rows] == [record["id"] for record in launch]
    assert len({row["id"] for row in rows}) == 258

    for row in rows:
        assert row["route"].startswith("/"), row["id"]
        assert row["surface_type"] in ALLOWED_SURFACE_TYPES, row["id"]
        assert row["implementation"], row["id"]
        assert row["evidence"], row["id"]
        for relative in row["implementation"] + row["evidence"]:
            target = ROOT / relative
            assert target.is_file(), f"{row['id']} missing trace: {relative}"


def test_workspace_routes_include_more_and_diagnostics() -> None:
    routes = read(ROUTES)
    assert "'more'" in routes
    assert "'diagnostics'" in routes
