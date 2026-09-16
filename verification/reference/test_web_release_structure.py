from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CI = (ROOT / '.github' / 'workflows' / 'ci.yml').read_text(encoding='utf-8')
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
