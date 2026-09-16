#!/usr/bin/env python3
"""Fail CI on obvious health-data logging/transport, forbidden analytics, or secrets."""
from __future__ import annotations

import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SCANNED = [
    ROOT / 'lib',
    ROOT / 'platform_templates',
    ROOT / 'android',
    ROOT / 'ios',
    ROOT / 'web' / 'src',
    ROOT / 'web' / 'public',
]
TEXT_EXTENSIONS = {
    '.dart', '.swift', '.kt', '.kts', '.java', '.xml', '.plist', '.yaml', '.yml',
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.html', '.css',
}
HEALTH_TERMS = r'(?:period|symptom|sexual|pregnan|fertility|temperature|medication|note)'
FORBIDDEN_LOG = re.compile(
    rf"(?:print|debugPrint|log|logger\.[a-zA-Z]+|console\.(?:log|debug|info|warn|error))\s*\([^\n]*{HEALTH_TERMS}",
    re.I,
)
WEB_TRANSPORT = re.compile(
    rf"(?:fetch\s*\(|URLSearchParams|caches(?:\.|\s)|new\s+Request\s*\()[^\n]*{HEALTH_TERMS}",
    re.I,
)
SECRET = re.compile(
    r"(?:AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-[A-Za-z0-9_-]{20,})"
)
FORBIDDEN_ANALYTICS_PACKAGES = {
    '@vercel/analytics',
    '@vercel/speed-insights',
    'mixpanel-browser',
    'posthog-js',
    '@amplitude/analytics-browser',
    '@segment/analytics-next',
    'react-ga4',
    '@sentry/nextjs',
}


def scan_source() -> list[str]:
    violations: list[str] = []
    for base in SCANNED:
        if not base.exists():
            continue
        for path in base.rglob('*'):
            if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
                continue
            text = path.read_text(encoding='utf-8', errors='replace')
            for lineno, line in enumerate(text.splitlines(), 1):
                if FORBIDDEN_LOG.search(line):
                    violations.append(
                        f'{path.relative_to(ROOT)}:{lineno}: reproductive-health payload near logging API'
                    )
                if path.parts[-3:-1] == ('web', 'src') or 'web' in path.parts:
                    if WEB_TRANSPORT.search(line):
                        violations.append(
                            f'{path.relative_to(ROOT)}:{lineno}: reproductive-health payload near Web transport/cache API'
                        )
                if SECRET.search(line):
                    violations.append(f'{path.relative_to(ROOT)}:{lineno}: obvious committed secret')
    return violations


def scan_web_dependencies() -> list[str]:
    package_json = ROOT / 'web' / 'package.json'
    if not package_json.exists():
        return []
    try:
        manifest = json.loads(package_json.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError) as exc:
        return [f'web/package.json: unable to inspect dependencies: {exc}']

    installed = set()
    for section in ('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'):
        values = manifest.get(section, {})
        if isinstance(values, dict):
            installed.update(values)

    return [
        f'web/package.json: forbidden analytics/telemetry package: {package}'
        for package in sorted(FORBIDDEN_ANALYTICS_PACKAGES & installed)
    ]


def main() -> None:
    violations = scan_source() + scan_web_dependencies()
    if violations:
        print('Privacy/secret scan FAILED:')
        print('\n'.join(violations))
        raise SystemExit(1)
    print(
        'Privacy/secret scan PASS: no forbidden reproductive-health logging/transport, '
        'unreviewed analytics packages, or obvious committed secrets found.'
    )


if __name__ == '__main__':
    main()
