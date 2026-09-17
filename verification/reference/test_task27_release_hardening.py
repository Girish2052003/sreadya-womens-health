from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

WORKFLOW = ROOT / ".github/workflows/c2-task27-release-hardening.yml"
GO_HARDENING = ROOT / "sync_service/internal/sync/task27_hardening_test.go"
WEB_HARDENING = ROOT / "web/e2e/task27-release-hardening.spec.ts"
WEB_QUEUE_TEST = ROOT / "web/src/sync/queue.test.ts"
RECOVERY_HARDENING = ROOT / "test/hardening/task27_recovery_hardening_test.dart"
PERF_CONFIG = ROOT / "web/performance-budget.json"
PERF_TOOL = ROOT / "tool/verify_web_performance_budget.py"
SECURITY_REVIEW = ROOT / "docs/security/C2_TASK27_WEB_SECURITY_REVIEW.md"
CLOSURE = ROOT / "docs/verification/C2_CROSS_PLATFORM_RELEASE_CLOSURE.md"


def _text(path: Path) -> str:
    assert path.is_file(), f"missing Task 27 hardening surface: {path.relative_to(ROOT)}"
    return path.read_text(encoding="utf-8").lower()


def _assert_all(path: Path, fragments: tuple[str, ...]) -> None:
    text = _text(path)
    for fragment in fragments:
        assert fragment.lower() in text, (
            f"{path.relative_to(ROOT)} missing Task 27 evidence requirement: {fragment!r}"
        )


def test_task27_dedicated_workflow_runs_release_hardening_gates() -> None:
    _assert_all(
        WORKFLOW,
        (
            "python -m pytest -q verification/reference/test_task27_release_hardening.py",
            "go test -race ./...",
            "-fuzz",
            "task27-release-hardening.spec.ts",
            "verify_web_performance_budget.py",
            "task27_recovery_hardening_test.dart",
        ),
    )


def test_sync_service_has_task27_authorization_concurrency_replay_revocation_and_fuzz() -> None:
    _assert_all(
        GO_HARDENING,
        (
            "testtask27authorizationisolation",
            "testtask27concurrentsameobject",
            "testtask27revokeddevice",
            "testtask27replay",
            "fuzztask27syncenvelope",
        ),
    )


def test_web_release_hardening_covers_wcag_routes_targets_errors_and_cache_privacy() -> None:
    _assert_all(
        WEB_HARDENING,
        (
            "@axe-core/playwright",
            "wcag22aa",
            "/app/home/",
            "/app/recovery/",
            "/app/settings/",
            "/app/sync/",
            "44",
            "aria-live",
            "service worker",
            "cache",
        ),
    )


def test_web_security_review_records_xss_csp_service_worker_and_host_limitations() -> None:
    _assert_all(
        SECURITY_REVIEW,
        (
            "xss",
            "csp",
            "github pages",
            "service worker",
            "cache storage",
            "clickjacking",
            "csrf",
            "malicious browser extension",
            "limitation",
        ),
    )


def test_sync_queue_records_thirty_day_offline_reconnect_without_silent_loss() -> None:
    _assert_all(
        WEB_QUEUE_TEST,
        (
            "30-day offline",
            "reconnect",
            "no silent loss",
        ),
    )


def test_recovery_hardening_exercises_truncation_corruption_future_schema_and_rollback() -> None:
    _assert_all(
        RECOVERY_HARDENING,
        (
            "truncated",
            "corrupt",
            "future schema",
            "rollback",
            "existing information",
        ),
    )


def test_performance_budget_is_deterministic_and_checks_public_shell_and_workspace() -> None:
    assert PERF_CONFIG.is_file(), f"missing {PERF_CONFIG.relative_to(ROOT)}"
    config = json.loads(PERF_CONFIG.read_text(encoding="utf-8"))
    assert config.get("version") == 1
    budgets = config.get("budgets")
    assert isinstance(budgets, dict)
    for key in ("total_static_bytes", "public_html_bytes", "app_shell_html_bytes", "largest_static_asset_bytes"):
        assert isinstance(budgets.get(key), int) and budgets[key] > 0, f"invalid performance budget {key!r}"

    _assert_all(
        PERF_TOOL,
        (
            "total_static_bytes",
            "public_html_bytes",
            "app_shell_html_bytes",
            "largest_static_asset_bytes",
            "budget",
            "fail",
        ),
    )


def test_cross_platform_release_closure_records_task27_scope_and_no_real_health_data() -> None:
    _assert_all(
        CLOSURE,
        (
            "task 27",
            "security",
            "accessibility",
            "performance",
            "recovery",
            "wcag 2.2 aa",
            "synthetic",
            "no real health data",
            "external",
        ),
    )
