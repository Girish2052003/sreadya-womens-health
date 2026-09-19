from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    target = ROOT / path
    assert target.is_file(), f"missing mobile continuity surface: {path}"
    return target.read_text(encoding="utf-8")


def test_mobile_router_exposes_every_continuity_workspace() -> None:
    app = read("lib/app/sreadya_app.dart")
    for route, screen in (
        ("/more/account", "AccountScreen"),
        ("/more/sync", "SyncScreen"),
        ("/more/devices", "DevicesScreen"),
        ("/more/recovery", "RecoveryScreen"),
    ):
        assert route in app
        assert screen in app


def test_mobile_more_is_a_complete_user_facing_continuity_hub() -> None:
    more = read("lib/features/more/presentation/more_screen.dart")
    for label, route in (
        ("Account & continuity", "/more/account"),
        ("Encrypted sync", "/more/sync"),
        ("Trusted devices", "/more/devices"),
        ("Recovery", "/more/recovery"),
    ):
        assert label in more
        assert route in more

    assert "CYC-" not in more
    assert "258" not in more
    assert "launch requirement" not in more.lower()


def test_mobile_account_surface_preserves_account_free_equality_and_passkeys() -> None:
    account = read("lib/features/account/presentation/account_screen.dart")
    service = read("lib/features/account/data/mobile_continuity_service.dart")
    native = read("lib/features/account/data/native_passkey_adapter.dart")

    assert "Account-free stays complete" in account
    assert "SREADYA_SYNC_BASE_URL" in service
    assert "https" in service
    assert "Create / link identity" in account
    assert "Add passkey" in account
    assert "Sign in with passkey" in account
    assert "Use this device account-free" in account
    assert "sreadya/account" in native


def test_mobile_devices_and_recovery_are_local_first_and_fail_closed() -> None:
    devices = read("lib/features/account/presentation/devices_screen.dart")
    recovery = read("lib/features/account/presentation/recovery_screen.dart")

    assert "SREADYA-TRANSFER-1" in devices
    assert "never treats a pasted QR as automatic consent" in devices
    assert "transfer secret stayed in memory only" in devices

    assert "Verify locally" in recovery
    assert "recoveryEnvelopeAad" in recovery
    assert "deriveRecoveryWrappingKey" in recovery
    assert "was not displayed, logged or uploaded" in recovery
    assert "fillRange" in recovery


def test_mobile_sync_surface_never_fakes_remote_success() -> None:
    sync = read("lib/features/sync/presentation/sync_screen.dart")
    store = read("lib/features/sync/data/mobile_sync_control_store.dart")
    adapter = read("lib/features/sync/data/encrypted_sync_adapter.dart")

    for label in ("Pause sync", "Resume sync", "Disable sync"):
        assert label in sync
    assert "Remote upload/download is never simulated" in sync
    assert "not configured for this build" in sync
    assert "FlutterSecureStorage" in store
    assert "encryptSyncJson" in adapter
    assert "decryptSyncJson" in adapter


def test_mobile_continuity_trace_generator_points_to_user_surfaces() -> None:
    generator = read("tool/generate_cross_platform_evidence.py")
    for path in (
        "lib/features/account/presentation/account_screen.dart",
        "lib/features/account/presentation/devices_screen.dart",
        "lib/features/account/presentation/recovery_screen.dart",
        "lib/features/sync/presentation/sync_screen.dart",
        "verification/reference/test_mobile_continuity_surfaces.py",
    ):
        assert path in generator

def test_web_and_mobile_continuity_hubs_expose_the_same_core_destinations() -> None:
    mobile = read("lib/features/more/presentation/more_screen.dart")
    web = read("web/src/app/app/more/page.tsx")

    pairs = (
        ("/more/account", "/app/account"),
        ("/more/sync", "/app/sync"),
        ("/more/devices", "/app/devices"),
        ("/more/recovery", "/app/recovery"),
    )
    for mobile_route, web_route in pairs:
        assert mobile_route in mobile
        assert web_route in web

    for internal_term in ("CYC-", "FUT-", "258", "launch requirement"):
        assert internal_term.lower() not in mobile.lower()
        assert internal_term.lower() not in web.lower()

