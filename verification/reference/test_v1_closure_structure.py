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
    tests = read("platform_templates/android/ReminderWallClockTest.kt")
    assert "targetLocalYear" in src
    assert "targetLocalHour" in src
    assert "ZonedDateTime" in src
    assert "plusDays(1)" in src
    assert "24 * 60 * 60 * 1000L" not in src
    assert "dailyReminderKeepsEightAmAcrossSpringDstChange" in tests
    assert "dailyReminderKeepsEightAmAcrossAutumnDstChange" in tests
    assert "dailyReminderKeepsEightAmInEveryAvailableTimeZone" in tests
    assert "oneShotReminderKeepsWallClockAfterTimeZoneChange" in tests


def test_android_release_hardening_targets_play_and_forbids_debug_signing():
    src = read("tool/configure_android_release.py")
    assert "TARGET_API = 36" in src
    assert "targetSdk = {TARGET_API}" in src
    assert "compileSdk = {TARGET_API}" in src
    assert "SREVA_ANDROID_KEYSTORE_PATH" in src
    assert "--require-signing" in src
    assert 'signingConfigs.getByName(\"debug\")' in src
    assert "debug signing key" in src


def test_release_ci_builds_android_installable_and_store_artifacts_and_sbom():
    ci = read(".github/workflows/ci.yml")
    android_tests = read("tool/configure_android_tests.py")
    assert ":app:testReleaseUnitTest" in ci
    assert "android.onlyEnableUnitTestForTheTestedBuildType=false" in android_tests
    assert "configure_android_tests.py" in ci
    assert "configure_android_release.py" in ci
    assert "flutter build appbundle --release" in ci
    assert "flutter build apk --release" in ci
    assert "jarsigner -verify -strict" in ci
    assert "apksigner" in ci
    assert "actions/upload-artifact" in ci
    assert "tool/secret_scan.py" in ci
    assert "SBOM" in ci or "sbom" in ci.lower()
    assert "osv-scanner" in ci.lower()
    assert "dependency" in ci.lower()


def test_secret_scanner_covers_high_signal_credentials():
    scanner = read("tool/secret_scan.py")
    assert "PRIVATE KEY" in scanner
    assert "github_pat_" in scanner
    assert "AWS access key" in scanner
    assert "Google API key" in scanner
    assert "OpenAI-style API key" in scanner


def test_production_workflow_requires_real_upload_key_secrets():
    workflow = read(".github/workflows/android-production.yml")
    assert "workflow_dispatch" in workflow
    assert "ref: main" in workflow
    assert "android-production" in workflow
    assert "SREVA_ANDROID_UPLOAD_KEYSTORE_B64" in workflow
    assert "SREVA_ANDROID_KEYSTORE_PASSWORD" in workflow
    assert "SREVA_ANDROID_KEY_ALIAS" in workflow
    assert "SREVA_ANDROID_KEY_PASSWORD" in workflow
    assert "tool/secret_scan.py" in workflow
    assert ":app:testReleaseUnitTest" in workflow
    assert "--require-signing" in workflow
    assert "SHA256SUMS.txt" in workflow


def test_privacy_policy_is_available_in_app_and_as_publishable_page_source():
    app = read("lib/app/sreva_app.dart")
    center = read("lib/features/privacy/presentation/privacy_center_screen.dart")
    policy = read("lib/features/privacy/presentation/privacy_policy_screen.dart")
    public_page = read("docs/android/privacy-policy.html")
    assert "/more/privacy-policy" in app
    assert "Read full privacy policy" in center
    assert "Sreva Privacy Policy" in policy
    assert "Sreva Privacy Policy" in public_page
    assert "reproductive-health" in public_page


def test_release_version_is_worldwide_v1():
    pubspec = read("pubspec.yaml")
    versions = read("lib/core/version/app_versions.dart")
    assert "version: 1.0.0+1" in pubspec
    assert "static const String app = '1.0.0';" in versions


def test_reminder_quiet_hours_are_user_editable():
    reminders = read("lib/features/reminders/presentation/reminders_screen.dart")
    assert "_editQuietHours" in reminders
    assert "Edit quiet hours" in reminders
    assert "quietStartHour" in reminders
    assert "quietEndHour" in reminders


def test_android_health_connect_historical_and_sexual_activity_write_are_complete():
    platform = read("tool/configure_platforms.py")
    native = read("platform_templates/android/MainActivity.kt")
    assert "android.permission.health.READ_HEALTH_DATA_HISTORY" in platform
    assert "android.permission.health.WRITE_SEXUAL_ACTIVITY" in platform
    assert "HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY" in native
    assert "getWritePermission(SexualActivityRecord::class)" in native
    assert "PROTECTION_USED_PROTECTED" in native
    assert "PROTECTION_USED_UNPROTECTED" in native


def test_dependency_lockfile_is_committed():
    assert (ROOT / "pubspec.lock").is_file()
