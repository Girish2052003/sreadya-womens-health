#!/usr/bin/env python3
"""Fail-closed SREADYA globalization contract verification."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "shared/i18n/source/en.json"
WEB = ROOT / "web/src"
ARCH = ROOT / "docs/architecture/SREADYA_GLOBALIZATION_ARCHITECTURE.md"

LITERAL_TEXT = re.compile(r">\s*([A-Za-z][^<>{}\n]{2,})\s*<")
INPUT_HINT_ATTR = re.compile(r"\b(?:aria-label|place" + "holder|title|alt)=['\"]([A-Za-z][^'\"]{1,})['\"]")
STATE_LITERAL = re.compile(r"\b(?:setError|setStatus)\(\s*['\"]([A-Za-z][^'\"]{2,})['\"]")
CARD_LITERAL = re.compile(r"\b(?:eyebrow|title)=['\"]([A-Za-z][^'\"]{2,})['\"]")

EXEMPT_FILES = {
    # Test-only component enabled exclusively by NEXT_PUBLIC_SREADYA_VAULT_TEST_HARNESS.
    "web/src/components/vault/VaultLocalOnlyPanel.tsx",
}
STATIC_SOURCE_EXEMPT = {
    # Static single-route source-language metadata. Locale-specific SEO routes are a future hosting concern.
    "web/src/app/layout.tsx",
}

FLUTTER_MAP = {
    "appName": "brand.name",
    "home": "common.home",
    "calendar": "common.calendar",
    "logToday": "today.log",
    "insights": "workspace.title.insights",
    "more": "common.more",
    "privacyPromise": "flutter.privacyPromise",
}


def strip_test_regions(text: str) -> str:
    return re.sub(
        r"/\* i18n-test-harness-start \*/.*?/\* i18n-test-harness-end \*/",
        "",
        text,
        flags=re.DOTALL,
    )


def check_catalogue() -> list[str]:
    failures: list[str] = []
    source = json.loads(SOURCE.read_text("utf-8"))
    if len(source) < 500:
        failures.append(f"canonical catalogue unexpectedly small: {len(source)} messages")
    for key, value in source.items():
        if not re.fullmatch(r"[a-z0-9][A-Za-z0-9_.-]*", key):
            failures.append(f"invalid message id: {key}")
        if not isinstance(value, str) or not value.strip():
            failures.append(f"empty/non-string source message: {key}")
    if len(source) != len(set(source)):
        failures.append("duplicate canonical message ids")
    return failures


def check_hardcoded_copy() -> list[str]:
    failures: list[str] = []
    for path in sorted(WEB.rglob("*.tsx")):
        rel = path.relative_to(ROOT).as_posix()
        if ".test." in path.name or rel in EXEMPT_FILES or rel in STATIC_SOURCE_EXEMPT:
            continue
        text = strip_test_regions(path.read_text("utf-8"))
        # Files that only receive text through props do not need useI18n themselves.
        matches = []
        for regex in (LITERAL_TEXT, INPUT_HINT_ATTR, STATE_LITERAL, CARD_LITERAL):
            matches.extend(regex.findall(text))
        allow_tokens = {
            "FORGE", "NC CORP", "Sreadya", "SREADYA", "CycleVault",
            "GitHub", "WebCrypto", "IndexedDB", "PIN", "UTC",
        }
        normalized = []
        for value in matches:
            value = value.strip()
            if not value or value in allow_tokens:
                continue
            if value.startswith("http") or value.startswith("data-"):
                continue
            normalized.append(value)
        if normalized:
            sample = " | ".join(dict.fromkeys(normalized[:4]))
            failures.append(f"{rel}: hard-coded user-visible copy -> {sample}")
    return failures


def check_flutter_parity() -> list[str]:
    failures: list[str] = []
    source = json.loads(SOURCE.read_text("utf-8"))
    arb = json.loads((ROOT / "lib/l10n/app_en.arb").read_text("utf-8"))
    for flutter_key, source_key in FLUTTER_MAP.items():
        if source_key not in source:
            failures.append(f"missing canonical source key for Flutter parity: {source_key}")
        elif arb.get(flutter_key) != source[source_key]:
            failures.append(f"Flutter ARB drift: {flutter_key} != {source_key}")
    return failures


def check_contract_files() -> list[str]:
    required = [
        ARCH,
        ROOT / "shared/i18n/schema/source-catalog-v1.schema.json",
        ROOT / "web/src/i18n/I18nProvider.tsx",
        ROOT / "web/src/i18n/locale-registry.ts",
        ROOT / "tool/i18n_pipeline.py",
    ]
    return [f"missing globalization contract file: {p.relative_to(ROOT)}" for p in required if not p.exists()]


def main() -> None:
    failures = check_catalogue() + check_flutter_parity() + check_contract_files() + check_hardcoded_copy()
    if failures:
        print("SREADYA GLOBALIZATION CONTRACT FAILED", file=sys.stderr)
        for failure in failures:
            print(f" - {failure}", file=sys.stderr)
        raise SystemExit(1)
    print("SREADYA GLOBALIZATION CONTRACT PASS")


if __name__ == "__main__":
    main()
