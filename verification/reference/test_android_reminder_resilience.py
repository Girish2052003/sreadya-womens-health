from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_android_host_rebuilds_reminders_after_system_time_and_update_events():
    platform = read("tool/configure_platforms.py")
    native = read("platform_templates/android/MainActivity.kt")

    for action in (
        "android.intent.action.BOOT_COMPLETED",
        "android.intent.action.MY_PACKAGE_REPLACED",
        "android.intent.action.TIME_SET",
        "android.intent.action.TIMEZONE_CHANGED",
    ):
        assert action in platform

    assert "class SrevaBootReceiver" in native
    assert "SrevaReminderRuntime.rescheduleAll(context)" in native


def test_android_reminders_are_os_scheduled_and_do_not_require_network_push():
    native = read("platform_templates/android/MainActivity.kt")
    platform = read("tool/configure_platforms.py")

    assert "AlarmManager.RTC_WAKEUP" in native
    assert "setAndAllowWhileIdle" in native
    assert "NotificationManager" in native
    assert "POST_NOTIFICATIONS" in platform
    for forbidden in ("FirebaseMessaging", "OneSignal", "FCM token"):
        assert forbidden not in native


def test_android_native_storage_uses_keystore_backed_aes_gcm():
    native = read("platform_templates/android/MainActivity.kt")
    assert "AndroidKeyStore" in native
    assert "AES/GCM/NoPadding" in native
    assert "KeyProperties.PURPOSE_ENCRYPT" in native
    assert "KeyProperties.PURPOSE_DECRYPT" in native
