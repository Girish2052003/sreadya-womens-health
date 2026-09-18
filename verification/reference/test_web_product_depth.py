from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]

def read(relative: str) -> str:
    path = ROOT / relative
    assert path.is_file(), f"missing Web product-depth surface: {relative}"
    return path.read_text(encoding="utf-8")

def test_web_pin_gate_and_automatic_lock_are_real_private_workspace_controls() -> None:
    lock = read("web/src/privacy/app-lock.ts")
    gate = read("web/src/privacy/WebAppLockGate.tsx")
    layout = read("web/src/app/app/layout.tsx")
    settings = read("web/src/features/settings/SettingsWorkspace.tsx")
    assert "verifyPin" in lock
    assert "visibilitychange" in gate
    assert "automatic" in gate.lower()
    assert "WebAppLockGate" in layout
    assert "AppLockSettings" in settings
    app_lock_settings = read("web/src/privacy/AppLockSettings.tsx")
    assert "PIN" in app_lock_settings
    assert "automatic lock" in app_lock_settings.lower()

def test_cycle_workspace_supports_period_notes() -> None:
    cycle = read("web/src/features/cycle/CycleCorePanel.tsx")
    core = read("web/src/features/core/AccountFreeWorkspace.tsx")
    assert "Cycle / period note" in cycle
    assert "onSaveCycleNote" in cycle
    assert "onSaveCycleNote" in core

def test_insights_expose_the_promised_pattern_families_and_accuracy() -> None:
    workspace = read("web/src/features/insights/InsightsWorkspace.tsx")
    for label in ("Flow patterns", "PMS patterns", "Pain trends", "Sleep patterns", "Prediction accuracy"):
        assert label in workspace

def test_diagnostics_expose_all_version_and_migration_fields_from_contract() -> None:
    diagnostic = read("web/src/diagnostics/diagnostic-report.ts")
    workspace = read("web/src/features/diagnostics/DiagnosticsWorkspace.tsx")
    for field in ("predictionEngine", "reminderEngine", "healthAdapter", "lastMigration"):
        assert field in diagnostic
        assert field in workspace

def test_assistant_can_search_historical_records_not_only_periods() -> None:
    parser = read("web/src/features/assistant/local-intent-parser.ts")
    workspace = read("web/src/features/assistant/AssistantWorkspace.tsx")
    assert "'searchHistory'" in parser
    assert "searchHistory" in workspace

def test_privacy_center_has_real_data_control_navigation_and_storage_transparency() -> None:
    privacy = read("web/src/features/privacy/PrivacyWorkspace.tsx")
    for route in ("/app/vault", "/app/devices", "/app/sharing", "/app/account", "/app/diagnostics"):
        assert route in privacy
    assert "Why is this stored?" in privacy
    assert "PIN" in privacy


def test_default_cycle_reminder_matches_frozen_three_day_contract() -> None:
    settings = read("web/src/features/reminders/reminder-settings-repository.ts")
    panel = read("web/src/features/reminders/ReminderSettingsPanel.tsx")
    assert "enabledOffsetsDays: [3]" in settings
    assert "3-day" in panel or "3 day" in panel.lower()
    assert "all cycle reminders off" not in panel.lower()

def test_easy_language_and_rtl_are_real_user_preferences() -> None:
    preferences = read("web/src/accessibility/preferences.ts")
    panel = read("web/src/accessibility/AccessibilityPreferencesPanel.tsx")
    layout = read("web/src/app/app/layout.tsx")
    settings = read("web/src/features/settings/SettingsWorkspace.tsx")
    guide = read("web/src/accessibility/EasyLanguageGuide.tsx")
    assert "easyLanguage" in preferences
    assert "data-sreva-language-mode" in preferences
    assert "Easy language" in panel
    assert "EasyLanguageGuide" in layout
    assert "localeDirection" in settings
    assert "document.documentElement.dir" in settings
    assert "easy" in guide.lower()

def test_public_architecture_pages_have_topic_specific_content() -> None:
    content = read("web/src/content/public-topic-content.ts")
    component = read("web/src/components/PublicTopicContent.tsx")
    public_page = read("web/src/app/(public)/[...slug]/page.tsx")
    for key in (
        "cycle-tracking", "predictions", "reminders", "insights", "life-stages",
        "doctor-reports", "privacy", "security", "sync", "accessibility",
        "download", "help",
    ):
        assert f'"{key}"' in content or f"'{key}'" in content
    assert "PublicTopicContent" in public_page
    assert "topic.sections" in component or "sections.map" in component

def test_provider_dependent_capabilities_are_not_marketed_as_live_local_interactions() -> None:
    import json
    ledger = json.loads(read("shared/capabilities/web-surfaces.v2.json"))
    by_id = {row["id"]: row for row in ledger["capabilities"]}
    for capability_id in ("ID-002", "ID-007", "ID-008", "SYNC-001", "SYNC-006", "SYNC-014", "PART-010"):
        assert by_id[capability_id]["surface_type"] == "provider-dependent", capability_id
    assert by_id["INT-003"]["surface_type"] == "platform-adapted"


def test_public_topic_links_resolve_to_real_routes() -> None:
    content = read("web/src/content/public-topic-content.ts")
    routes = read("web/src/content/routes.ts")
    public_routes = {
        "/" + "/".join(re.findall(r"'([^']+)'", body))
        for body in re.findall(r"slug:\s*\[([^\]]+)\]", routes)
    }
    workspace_match = re.search(r"export const workspaceSections = \[([\s\S]*?)\] as const;", routes)
    assert workspace_match is not None
    workspace_routes = {
        "/app/" + section
        for section in re.findall(r"'([^']+)'", workspace_match.group(1))
    }
    valid = {"/", "/app"} | public_routes | workspace_routes
    hrefs = set(re.findall(r'href:\s*"([^"]+)"', content))
    missing = sorted(hrefs - valid)
    assert not missing, f"public topic content has dead internal routes: {missing}"
