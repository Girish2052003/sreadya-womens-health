import base64
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ICON_SHA256 = "4964588e6f2c23c07bb62c6213d5292b75ea9963c93cea3cc3db7e1344f8af55"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_sreadya_brand_asset_is_immutable_and_declared() -> None:
    chunks = [
        read(f"assets/brand/sreadya_app_icon.webp.b64.{index:02d}").strip()
        for index in range(1, 5)
    ]
    payload = base64.b64decode("".join(chunks), validate=True)
    assert payload.startswith(b"RIFF")
    assert b"WEBP" in payload[:16]
    assert hashlib.sha256(payload).hexdigest() == ICON_SHA256
    assert "- assets/brand/" in read("pubspec.yaml")


def test_bootstrap_uses_branded_bloom_instead_of_white_spinner() -> None:
    bootstrap = read("lib/app/bootstrap.dart")
    bloom = read("lib/app/sreadya_bloom.dart")

    assert "SreadyaBloom" in bootstrap
    assert "Duration(milliseconds: 1500)" in bootstrap
    assert "Scaffold(body: Center(child: CircularProgressIndicator()))" not in bootstrap
    assert "SREADYA" in bloom
    assert "SreadyaBrandIcon" in bloom
    assert "disableAnimations" in bloom


def test_android_generated_host_uses_brand_icon_and_nonwhite_launch_theme() -> None:
    platform = read("tool/configure_platforms.py")

    assert 'android:icon="@drawable/sreadya_app_icon"' in platform
    assert 'android:roundIcon="@drawable/sreadya_app_icon"' in platform
    assert "android:windowSplashScreenAnimatedIcon" in platform
    assert "android:windowSplashScreenBackground" in platform
    assert "#B80F4B" in platform
    assert "_brand_icon_bytes" in platform


def test_permissions_are_contextual_and_contacts_are_not_requested() -> None:
    onboarding = read("lib/features/onboarding/presentation/onboarding_screen.dart")
    platform = read("tool/configure_platforms.py")
    native = read("platform_templates/android/MainActivity.kt")

    assert "bool _enableReminders = false;" in onboarding
    assert "if (_enableReminders)" in onboarding
    assert ".requestPermission()" in onboarding
    assert "if (_importHealth && _healthPreview != null)" in onboarding
    assert "if (_healthPreview == null) await _previewHealth();" not in onboarding

    assert "android.permission.POST_NOTIFICATIONS" in platform
    assert "android.permission.RECORD_AUDIO" in platform
    assert '<uses-permission android:name="android.permission.READ_CONTACTS"' not in platform
    assert '<uses-permission android:name="android.permission.WRITE_CONTACTS"' not in platform

    assert "microphonePermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)" in native
    assert '"transcribeOnce"' in native
    on_create = native.split("override fun onCreate", 1)[1].split(
        "override fun configureFlutterEngine", 1
    )[0]
    assert "microphonePermissionLauncher.launch" not in on_create
    assert "healthPermissionLauncher.launch" not in on_create
    assert "notificationPermissionLauncher.launch" not in on_create


def test_health_connect_stays_granular_and_partner_sharing_is_contact_free() -> None:
    health = read(
        "lib/features/health_integration/presentation/health_integration_screen.dart"
    )
    platform = read("platform_templates/android/MainActivity.kt")
    partner = read("lib/features/partner/presentation/partner_screen.dart")

    assert "_selected = {HealthDataCategory.menstrualFlow}" in health
    assert "Sexual activity is off unless you explicitly select it." in health
    assert "requestAuthorization(_selected" in health
    assert 'HealthConnectClient' in platform
    assert 'credentials-play-services-auth' in read("tool/configure_platforms.py")

    assert "Sreadya never reads your Contacts or address book." in partner
    assert "SharePlus.instance.share" in partner
    assert "Review before sharing" in partner


def test_android_v2_release_identity_is_consistent() -> None:
    pubspec = read("pubspec.yaml")
    versions = read("lib/core/version/app_versions.dart")
    manifest = read("release/android-production.json")
    workflow = read(".github/workflows/android-production.yml")

    assert "version: 1.1.0+2" in pubspec
    assert "static const String app = '1.1.0';" in versions
    assert '"version": "1.1.0+2"' in manifest
    assert '"release_tag": "android-v1.1.0+2"' in manifest
    assert "sreadya-1.1.0+2-production.apk" in workflow
