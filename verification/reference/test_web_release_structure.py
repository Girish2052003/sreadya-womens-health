from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CI = (ROOT / '.github' / 'workflows' / 'ci.yml').read_text(encoding='utf-8')
PAGES_PATH = ROOT / '.github' / 'workflows' / 'web-pages.yml'
PRIVACY_SCAN = (ROOT / 'tool' / 'privacy_scan.py').read_text(encoding='utf-8')
SECRET_SCAN = (ROOT / 'tool' / 'secret_scan.py').read_text(encoding='utf-8')


def test_existing_mobile_release_jobs_are_preserved():
    for job in [
        'flutter-core:',
        'android-release-verification:',
        'android-family-preview-verification:',
        'ios-no-codesign:',
    ]:
        assert job in CI


def test_ci_has_shared_web_core_e2e_and_security_gates():
    for job in ['shared-contracts:', 'web-core:', 'web-e2e:', 'web-security:']:
        assert job in CI

    for required in [
        "node-version: '24.21.0'",
        'npm ci --ignore-scripts',
        'npm run lint',
        'npm run typecheck',
        'npm test -- --run',
        'npm run build',
        'playwright install --with-deps chromium firefox webkit',
        'navigation.spec.ts',
        'accessibility-i18n.spec.ts',
        'pwa.spec.ts',
        'python tool/privacy_scan.py',
        'python tool/secret_scan.py',
        'npm audit --audit-level=high',
        'npm sbom --sbom-format cyclonedx',
    ]:
        assert required in CI

    for vector_test in [
        'test/conformance/shared_prediction_vectors_test.dart',
        'test/conformance/shared_reminder_vectors_test.dart',
        'test/conformance/cyclevault_vectors_test.dart',
    ]:
        assert vector_test in CI


def test_pages_deployment_is_static_secret_free_and_least_privilege():
    assert PAGES_PATH.exists()
    pages = PAGES_PATH.read_text(encoding='utf-8')

    for required in [
        'name: Sreva Web Pages',
        'pull_request:',
        'push:',
        'branches: [main]',
        'contents: read',
        'pages: write',
        'id-token: write',
        "node-version: '24.21.0'",
        'npm ci --ignore-scripts',
        'npm run build',
        'SREVA_BASE_PATH: /${{ github.event.repository.name }}',
        'path: web/out',
        'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
        'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
        'actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b',
        'actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e',
        "if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'",
    ]:
        assert required in pages

    assert 'secrets.' not in pages
    assert 'NEXT_PUBLIC_SREVA_VAULT_TEST_HARNESS' not in pages
    assert 'NEXT_PUBLIC_SREVA_CYCLEVAULT_TEST_HARNESS' not in pages


def test_privacy_scan_covers_web_health_logging_transport_cache_and_analytics_packages():
    assert "ROOT / 'web' / 'src'" in PRIVACY_SCAN
    assert "ROOT / 'web' / 'public'" in PRIVACY_SCAN
    for extension in ["'.ts'", "'.tsx'", "'.js'", "'.mjs'"]:
        assert extension in PRIVACY_SCAN
    for signal in ['URLSearchParams', 'caches', 'fetch', 'FORBIDDEN_ANALYTICS_PACKAGES']:
        assert signal in PRIVACY_SCAN
    for package in ['@vercel/analytics', 'mixpanel-browser', 'posthog-js', '@amplitude/analytics-browser']:
        assert package in PRIVACY_SCAN


def test_secret_scan_includes_modern_web_source_extensions():
    for extension in ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']:
        assert f'"{extension}"' in SECRET_SCAN
