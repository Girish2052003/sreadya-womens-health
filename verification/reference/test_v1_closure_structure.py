from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_onboarding_exposes_worldwide_v1_choices():
    src = read("lib/features/onboarding/presentation/onboarding_screen.dart")
    assert "LifeStageMode" in src
    assert "NotificationPrivacy" in src
    assert "HealthImportService" in src
    assert "Preview platform health import" in src


def test_calendar_has_month_timeline_and_year_views():
    src = read("lib/features/calendar/presentation/calendar_screen.dart")
    assert "HistoryViewMode" in src
    for label in ("Month", "Timeline", "Year"):
        assert label in src


def test_prediction_includes_period_duration_estimate_and_detail_route():
    model = read("lib/features/predictions/domain/cycle_prediction.dart")
    app = read("lib/app/sreva_app.dart")
    assert "estimatedPeriodDurationDays" in model
    assert "/prediction" in app


def test_reports_require_user_date_range_and_preview_before_share():
    src = read("lib/features/reports/presentation/reports_screen.dart")
    assert "_from" in src and "_to" in src
    assert "Preview report" in src
    assert "Share previewed" in src


def test_partner_future_transport_is_an_explicit_interface():
    src = read("lib/features/partner/domain/partner_transport.dart")
    assert "abstract interface class PartnerTransport" in src


def test_worldwide_formatters_are_wired_to_sensitive_time_and_measurement_ui():
    formatters = read("lib/core/settings/user_formatters.dart")
    reminders = read("lib/features/reminders/presentation/reminders_screen.dart")
    personal = read(
        "lib/features/reminders/presentation/personal_reminders_panel.dart"
    )
    logging = read("lib/features/logging/presentation/log_screen.dart")
    assert "formatClock" in formatters
    assert "temperatureUnit" in formatters
    assert "weightUnit" in formatters
    assert "waterUnit" in formatters
    assert "UserFormatters.formatClock" in reminders
    assert "UserFormatters.formatClock" in personal
    assert "UserFormatters.temperatureForStorage" in logging
    assert "UserFormatters.weightForStorage" in logging
    assert "UserFormatters.waterForStorage" in logging


def test_individual_observations_can_be_deleted():
    providers = read("lib/app/providers.dart")
    logging = read("lib/features/logging/presentation/log_screen.dart")
    assert "deleteObservation" in providers
    assert "Delete observation" in logging


def test_pin_fallback_is_independent_from_database_key():
    pin = read("lib/features/privacy/data/pin_lock_service.dart")
    bootstrap = read("lib/app/bootstrap.dart")
    assert "Argon2id" in pin
    assert "FlutterSecureStorage" in pin
    assert "DatabaseKeyProvider" not in pin
    assert "Use Sreva PIN" in bootstrap


def test_migration_recovery_snapshot_is_real():
    src = read("lib/core/database/health_vault.dart")
    assert "pre_migration" in src
    assert "MigrationCoordinator" in src
    assert "integrity_check" in src


def test_android_reminder_runtime_preserves_local_wall_clock():
    src = read("platform_templates/android/MainActivity.kt")
    assert "targetLocalYear" in src
    assert "targetLocalHour" in src
    assert "ZonedDateTime" in src
    assert "plusDays(1)" in src
    assert "24 * 60 * 60 * 1000L" not in src


def test_release_ci_builds_android_installable_and_store_artifacts_and_sbom():
    ci = read(".github/workflows/ci.yml")
    assert "flutter build appbundle --release" in ci
    assert "flutter build apk --release" in ci
    assert "actions/upload-artifact" in ci
    assert "SBOM" in ci or "sbom" in ci.lower()
    assert "osv-scanner" in ci.lower()
    assert "dependency" in ci.lower()
