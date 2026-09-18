from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]

PRIVACY_ARCHITECTURE = ROOT / "PRIVACY.md"
SECURITY_POLICY = ROOT / "SECURITY.md"
ANDROID_PUBLIC_POLICY = ROOT / "docs" / "android" / "privacy-policy.html"
ANDROID_COMPLIANCE = ROOT / "docs" / "android" / "PLAY_COMPLIANCE_CHECKLIST.md"
ANDROID_RUNBOOK = ROOT / "docs" / "android" / "PLAY_PRODUCTION_RUNBOOK.md"
MOBILE_IN_APP_POLICY = (
    ROOT / "lib" / "features" / "privacy" / "presentation" / "privacy_policy_screen.dart"
)
WEB_POLICY_SOURCE = ROOT / "web" / "src" / "content" / "privacy-policy.ts"
WEB_PUBLIC_PAGE = ROOT / "web" / "src" / "app" / "(public)" / "[...slug]" / "page.tsx"
WEB_ROUTES = ROOT / "web" / "src" / "content" / "routes.ts"

USER_FACING_POLICIES = (
    ANDROID_PUBLIC_POLICY,
    MOBILE_IN_APP_POLICY,
    WEB_POLICY_SOURCE,
)



def _text(path: Path) -> str:
    assert path.is_file(), f"missing Task 26 policy surface: {path.relative_to(ROOT)}"
    return path.read_text(encoding="utf-8").lower()



def _assert_all(path: Path, fragments: tuple[str, ...]) -> None:
    text = _text(path)
    for fragment in fragments:
        assert fragment in text, f"{path.relative_to(ROOT)} missing required policy truth: {fragment!r}"



def test_user_facing_policies_describe_shipping_optional_e2ee_truthfully() -> None:
    required = (
        "account-free",
        "optional",
        "encrypted before leaving",
        "ciphertext",
        "minimum operational metadata",
        "does not possess the health-vault decryption key",
        "email or sms",
        "trusted device",
        "recovery key",
    )

    for path in USER_FACING_POLICIES:
        _assert_all(path, required)



def test_user_facing_policies_preserve_account_free_equality_and_local_core() -> None:
    required = (
        "account-free",
        "core health",
        "without an account",
        "disabling sync",
        "local",
    )

    for path in USER_FACING_POLICIES:
        _assert_all(path, required)



def test_user_facing_policies_explain_truthful_retention_and_deletion_boundary() -> None:
    required = (
        "server-side",
        "account",
        "ciphertext",
        "former device",
        "export",
        "cannot remotely erase",
    )

    for path in USER_FACING_POLICIES:
        _assert_all(path, required)



def test_shipping_policy_surfaces_do_not_keep_obsolete_future_only_wording() -> None:
    forbidden = (
        "approved future architecture is not current data flow",
        "future optional end-to-end encrypted continuity architecture",
        "sreadya v1 does not send your reproductive-health records to a developer health server",
        "sreadya shares nothing through its own developer server",
    )

    for path in (PRIVACY_ARCHITECTURE, *USER_FACING_POLICIES):
        text = _text(path)
        for fragment in forbidden:
            assert fragment not in text, (
                f"{path.relative_to(ROOT)} still presents implemented continuity as future-only: "
                f"{fragment!r}"
            )



def test_security_policy_makes_policy_and_store_truth_a_release_blocker() -> None:
    _assert_all(
        SECURITY_POLICY,
        (
            "sync-enabled release",
            "release blocker",
            "privacy policy",
            "store declaration",
            "exact release binary",
            "dependency",
            "ciphertext",
            "minimum operational metadata",
            "health-vault decryption key",
        ),
    )



def test_android_store_gate_is_for_real_sync_enabled_release_candidates() -> None:
    for path in (ANDROID_COMPLIANCE, ANDROID_RUNBOOK):
        _assert_all(
            path,
            (
                "sync-enabled",
                "exact",
                "binary",
                "dependenc",
                "data safety",
                "health app",
                "ciphertext",
                "recovery",
                "external",
            ),
        )



def test_web_privacy_policy_is_dedicated_content_not_a_one_line_route_summary() -> None:
    source = _text(WEB_POLICY_SOURCE)
    assert "privacy policy" in source
    assert "last updated" in source
    assert "retention and deletion" in source
    assert "account and encrypted continuity" in source

    page = _text(WEB_PUBLIC_PAGE)
    assert "privacypolicysections" in page
    assert "privacypolicylastupdated" in page

    routes = _text(WEB_ROUTES)
    assert "privacy-policy" in routes
    assert "optional end-to-end encrypted continuity" in routes



def test_task26_policy_date_is_current_for_changed_user_facing_surfaces() -> None:
    for path in USER_FACING_POLICIES:
        _assert_all(path, ("17 september 2026",))
