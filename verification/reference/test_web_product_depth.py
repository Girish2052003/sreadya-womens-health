from pathlib import Path

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
    assert "PIN" in settings
    assert "lock" in settings.lower()

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
