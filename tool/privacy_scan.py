#!/usr/bin/env python3
"""Fail CI if source logging contains obvious reproductive-health payloads or secrets."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SCANNED = [ROOT / 'lib', ROOT / 'platform_templates', ROOT / 'android', ROOT / 'ios']
FORBIDDEN_LOG = re.compile(r"(?:print|debugPrint|log|logger\.[a-zA-Z]+)\s*\([^\n]*(?:period|symptom|sexual|pregnan|fertility|temperature|medication|note)", re.I)
SECRET = re.compile(r"(?:AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-[A-Za-z0-9_-]{20,})")
violations = []
for base in SCANNED:
    if not base.exists():
        continue
    for path in base.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in {'.dart', '.swift', '.kt', '.java', '.xml', '.plist', '.yaml', '.yml'}:
            continue
        text = path.read_text(encoding='utf-8', errors='replace')
        for lineno, line in enumerate(text.splitlines(), 1):
            if FORBIDDEN_LOG.search(line) or SECRET.search(line):
                violations.append(f'{path.relative_to(ROOT)}:{lineno}: {line.strip()}')
if violations:
    print('Privacy/secret scan FAILED:')
    print('\n'.join(violations))
    sys.exit(1)
print('Privacy/secret scan PASS: no forbidden health logging or obvious committed secrets found.')
