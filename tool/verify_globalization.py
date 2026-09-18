#!/usr/bin/env python3
"""Fail-closed SREADYA globalization contract verification."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "shared/i18n/source/en.json"
TRANSLATIONS = ROOT / "shared/i18n/translations"
WEB = ROOT / "web/src"
WEB_MANIFEST = ROOT / "web/public/i18n/manifest.json"
ARCH = ROOT / "docs/architecture/SREADYA_GLOBALIZATION_ARCHITECTURE.md"
OPERATIONS = ROOT / "docs/architecture/SREADYA_TRANSLATION_OPERATIONS.md"
GOOGLE_BASELINE = ROOT / "shared/i18n/providers/google-nmt-baseline.json"
GOOGLE_DISCOVERY = ROOT / "shared/i18n/providers/google-discovered.json"
GOOGLE_BASELINE_COUNT = 194
GOOGLE_PROVIDER = "google-cloud-translation"

LITERAL_TEXT = re.compile(
    r"<(?:span|p|button|label|h[1-6]|strong|small|li|dt|dd|legend|a)\b[^>]*>\s*([A-Za-z][^<>{}\n]*)\s*</",
    flags=re.IGNORECASE,
)
INPUT_HINT_ATTR = re.compile(r"\b(?:aria-label|place" + "holder|title|alt)=['\"]([A-Za-z][^'\"]{1,})['\"]")
STATE_LITERAL = re.compile(r"\b(?:setError|setStatus)\(\s*['\"]([A-Za-z][^'\"]{2,})['\"]")
CARD_LITERAL = re.compile(r"\b(?:eyebrow|title)=['\"]([A-Za-z][^'\"]{2,})['\"]")
MESSAGE_VARIABLE = re.compile(r"\{([A-Za-z0-9_.-]+)\}")

EXEMPT_FILES = {
    "web/src/components/vault/VaultLocalOnlyPanel.tsx",
}
STATIC_SOURCE_EXEMPT = {
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


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def source_value_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def locale_key(locale: str) -> str:
    return locale.strip().replace("_", "-").lower()


def strip_test_regions(text: str) -> str:
    text = re.sub(
        r"/\* i18n-test-harness-start \*/.*?/\* i18n-test-harness-end \*/",
        "",
        text,
        flags=re.DOTALL,
    )
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return re.sub(r"(^|\s)//[^\n]*", r"\1", text)


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


def check_google_baseline() -> list[str]:
    failures: list[str] = []
    if not GOOGLE_BASELINE.exists():
        return ["missing frozen Google NMT baseline"]
    parsed = json.loads(GOOGLE_BASELINE.read_text("utf-8"))
    languages = parsed.get("languages")
    if parsed.get("minimumLogicalLanguageCount") != GOOGLE_BASELINE_COUNT:
        failures.append("Google NMT minimumLogicalLanguageCount must be 194")
    if not isinstance(languages, list) or len(languages) != GOOGLE_BASELINE_COUNT:
        actual = len(languages) if isinstance(languages, list) else "invalid"
        failures.append(f"Google NMT frozen baseline must contain exactly 194 logical rows, got {actual}")
        return failures

    canonical: set[str] = set()
    alias_owner: dict[str, str] = {}
    for row in languages:
        if not isinstance(row, dict):
            failures.append("Google NMT baseline contains a non-object row")
            continue
        code = str(row.get("code", "")).strip()
        name = str(row.get("englishName", "")).strip()
        if not code or not name:
            failures.append("Google NMT baseline row missing code/englishName")
            continue
        key = locale_key(code)
        if key in canonical:
            failures.append(f"duplicate Google NMT baseline code: {code}")
        canonical.add(key)
        for alias in row.get("aliases", []):
            alias_key = locale_key(str(alias))
            if alias_key in alias_owner and alias_owner[alias_key] != code:
                failures.append(f"Google NMT alias reused by multiple rows: {alias}")
            alias_owner[alias_key] = code
    return failures


def check_hardcoded_copy() -> list[str]:
    failures: list[str] = []
    for path in sorted(WEB.rglob("*.tsx")):
        rel = path.relative_to(ROOT).as_posix()
        if ".test." in path.name or rel in EXEMPT_FILES or rel in STATIC_SOURCE_EXEMPT:
            continue
        text = strip_test_regions(path.read_text("utf-8"))
        if "cause.message" in text:
            failures.append(f"{rel}: raw internal exception message can reach translated UI")
        matches: list[str] = []
        for regex in (LITERAL_TEXT, INPUT_HINT_ATTR, STATE_LITERAL, CARD_LITERAL):
            matches.extend(regex.findall(text))
        allow_tokens = {
            "FORGE", "NC CORP", "Sreadya", "SREADYA", "CycleVault",
            "GitHub", "WebCrypto", "IndexedDB", "PIN", "UTC", "by NC CORP",
            "S", "×",
        }
        normalized: list[str] = []
        for value in matches:
            value = value.strip()
            if not value or value in allow_tokens:
                continue
            if value.startswith("http") or value.startswith("data-"):
                continue
            if rel == "web/src/app/page.tsx" and "Prakritim" in value and "Avashtabhya." in value:
                continue
            normalized.append(value)
        if normalized:
            sample = " | ".join(dict.fromkeys(normalized[:4]))
            failures.append(f"{rel}: hard-coded user-visible copy -> {sample}")
    return failures


def check_generated_copy_boundaries() -> list[str]:
    failures: list[str] = []
    report_path = ROOT / "web/src/features/reports/report-builder.ts"
    sharing_path = ROOT / "web/src/features/sharing/partner-sharing.ts"
    report = report_path.read_text("utf-8")
    sharing = sharing_path.read_text("utf-8")

    report_forbidden = (
        "Report date range must use calendar dates.",
        "Report start date cannot be after end date.",
        "Select at least one report category.",
        "Unsupported report category.",
        "'Sreadya cycle history report'",
        "'Generated locally on this device. This report is not a diagnosis.'",
        "'Selected observations'",
    )
    sharing_forbidden = (
        "Partner grant timestamp must be UTC.",
        "Select at least one partner-sharing category.",
        "Unsupported partner-sharing category.",
        "Partner grant id is required.",
        "Partner grant cannot be revoked before it was created.",
        "Partner grant is revoked.",
        "'Sreadya shared summary'",
        "'Shared intentionally by the Sreadya user.'",
        "Expected period window:",
        "Reminder:",
        "Wellness:",
    )
    for value in report_forbidden:
        if value in report:
            failures.append(f"{report_path.relative_to(ROOT)}: generated report copy bypasses catalogue -> {value}")
    for value in sharing_forbidden:
        if value in sharing:
            failures.append(f"{sharing_path.relative_to(ROOT)}: generated share copy bypasses catalogue -> {value}")
    if "ReportCopy" not in report or "report_pdf_font_unsupported" not in report:
        failures.append("report generator lacks localized-copy / non-Unicode-font fail-closed contract")
    if "PartnerShareCopy" not in sharing:
        failures.append("partner-share generator lacks localized-copy contract")
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
        OPERATIONS,
        GOOGLE_BASELINE,
        ROOT / "shared/i18n/schema/source-catalog-v1.schema.json",
        ROOT / "shared/i18n/schema/translation-artifact-v1.schema.json",
        ROOT / "web/src/i18n/I18nProvider.tsx",
        ROOT / "web/src/i18n/locale-registry.ts",
        ROOT / "tool/i18n_pipeline.py",
    ]
    failures = [
        f"missing globalization contract file: {path.relative_to(ROOT)}"
        for path in required
        if not path.exists()
    ]
    if ARCH.exists():
        architecture = ARCH.read_text("utf-8")
        required_phrases = [
            "authoritative architecture v2",
            "194 logical language rows",
            "Google Cloud Translation",
            "Public support means complete support",
            "Layout direction and text direction are separate",
            "Private health data never enters the translation pipeline",
        ]
        for phrase in required_phrases:
            if phrase not in architecture:
                failures.append(f"architecture v2 missing required invariant: {phrase}")
    return failures


def check_client_provider_boundary() -> list[str]:
    failures: list[str] = []
    forbidden = (
        "SREADYA_GOOGLE_TRANSLATE_API_KEY",
        "translation.googleapis.com",
        "SREADYA_TRANSLATION_API_KEY",
    )
    for path in sorted(WEB.rglob("*")):
        if not path.is_file() or path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        text = path.read_text("utf-8")
        for token in forbidden:
            if token in text:
                failures.append(
                    f"{path.relative_to(ROOT)}: translation provider credential/endpoint leaked into client source"
                )

    provider = (ROOT / "web/src/i18n/I18nProvider.tsx").read_text("utf-8")
    if "document.documentElement.dir = localeDirection" in provider:
        failures.append("I18nProvider still mirrors the entire layout for RTL locales")
    if "document.documentElement.dir = 'ltr'" not in provider:
        failures.append("I18nProvider must pin layout direction independently from text direction")
    if "data-sreadya-text-direction" not in provider:
        failures.append("I18nProvider does not expose locale-aware text direction")

    chooser = (ROOT / "web/src/components/navigation/LanguageChooser.tsx").read_text("utf-8")
    for forbidden_text in ("English fallback", "language.fallback", "CLDR_LANGUAGE_CODES", "translationAvailability"):
        if forbidden_text in chooser:
            failures.append(f"LanguageChooser contains forbidden fallback/raw-universe behavior: {forbidden_text}")
    return failures


def check_translation_artifacts() -> list[str]:
    failures: list[str] = []
    source_raw = SOURCE.read_bytes()
    source = json.loads(source_raw)
    source_version = git_blob_sha(source_raw)

    if not TRANSLATIONS.exists():
        return failures

    for path in sorted(TRANSLATIONS.glob("*.json")):
        parsed = json.loads(path.read_text("utf-8"))
        meta = parsed.get("meta", {})
        messages = parsed.get("messages", {})
        hashes = parsed.get("sourceHashes", {})
        if meta.get("sourceVersion") != source_version:
            failures.append(f"{path.relative_to(ROOT)}: stale sourceVersion")
            continue
        if not isinstance(messages, dict):
            failures.append(f"{path.relative_to(ROOT)}: invalid messages object")
            continue
        for key, value in messages.items():
            if key not in source:
                failures.append(f"{path.relative_to(ROOT)}: unknown message key {key}")
                continue
            if not isinstance(value, str) or not value.strip():
                failures.append(f"{path.relative_to(ROOT)}: empty/non-string translation {key}")
                continue
            if set(MESSAGE_VARIABLE.findall(value)) != set(MESSAGE_VARIABLE.findall(source[key])):
                failures.append(f"{path.relative_to(ROOT)}: message-variable mismatch {key}")
            if isinstance(hashes, dict) and key in hashes and hashes[key] != source_value_hash(source[key]):
                failures.append(f"{path.relative_to(ROOT)}: stale source hash {key}")
    return failures


def check_global_closure() -> list[str]:
    failures: list[str] = []
    if not GOOGLE_DISCOVERY.exists():
        return ["formal closure: Google provider discovery snapshot is missing"]
    if not WEB_MANIFEST.exists():
        return ["formal closure: generated Web i18n manifest is missing"]

    baseline = json.loads(GOOGLE_BASELINE.read_text("utf-8"))
    discovery = json.loads(GOOGLE_DISCOVERY.read_text("utf-8"))
    discovered_rows = discovery.get("languages", [])
    if not isinstance(discovered_rows, list) or len(discovered_rows) < GOOGLE_BASELINE_COUNT:
        failures.append("formal closure: discovered Google logical-language set is below 194")
        discovered_rows = []

    baseline_codes = {locale_key(row["code"]) for row in baseline["languages"]}
    discovered_codes = {locale_key(row["code"]) for row in discovered_rows if isinstance(row, dict) and row.get("code")}
    missing = sorted(baseline_codes - discovered_codes)
    if missing:
        failures.append("formal closure: frozen Google baseline missing from discovery: " + ", ".join(missing[:12]))

    manifest = json.loads(WEB_MANIFEST.read_text("utf-8"))
    public_locales = manifest.get("publicLocales", [])
    artifacts = manifest.get("artifacts", {})
    if not isinstance(public_locales, list):
        failures.append("formal closure: manifest publicLocales is invalid")
        public_locales = []
    if len(public_locales) < GOOGLE_BASELINE_COUNT:
        failures.append(
            f"formal closure: only {len(public_locales)} public locales; require at least {GOOGLE_BASELINE_COUNT}"
        )

    source = json.loads(SOURCE.read_text("utf-8"))
    source_count = len(source)
    public_tags: set[str] = set()
    for row in public_locales:
        if not isinstance(row, dict) or not row.get("tag"):
            failures.append("formal closure: malformed public locale row")
            continue
        tag = str(row["tag"])
        key = locale_key(tag)
        public_tags.add(key)
        if row.get("coverage") not in {"source", "complete"}:
            failures.append(f"formal closure: public locale {tag} is not complete/source")
        artifact = artifacts.get(key)
        if not isinstance(artifact, dict):
            failures.append(f"formal closure: public locale {tag} has no artifact")
            continue
        if artifact.get("messageCount") != source_count or artifact.get("sourceMessageCount") != source_count:
            failures.append(f"formal closure: public locale {tag} does not have 100% catalogue coverage")
        if key != "en" and artifact.get("provider") != GOOGLE_PROVIDER:
            failures.append(f"formal closure: public locale {tag} is not Google-provider generated")

    missing_public = sorted(baseline_codes - public_tags)
    if missing_public:
        failures.append(
            "formal closure: frozen Google baseline not fully public: " + ", ".join(missing_public[:12])
        )

    for path in sorted(TRANSLATIONS.glob("*.json")):
        parsed = json.loads(path.read_text("utf-8"))
        meta = parsed.get("meta", {})
        locale = str(meta.get("locale", path.stem))
        if locale_key(locale) in public_tags and locale_key(locale) != "en":
            messages = parsed.get("messages", {})
            hashes = parsed.get("sourceHashes", {})
            if meta.get("provider") != GOOGLE_PROVIDER:
                failures.append(f"formal closure: {locale} artifact is not Google-provider generated")
            if not isinstance(messages, dict) or set(messages) != set(source):
                failures.append(f"formal closure: {locale} translation file is not complete")
            if not isinstance(hashes, dict) or set(hashes) != set(source):
                failures.append(f"formal closure: {locale} translation memory hashes are incomplete")

    return failures


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-global-closure", action="store_true")
    args = parser.parse_args()

    failures = (
        check_catalogue()
        + check_google_baseline()
        + check_flutter_parity()
        + check_contract_files()
        + check_hardcoded_copy()
        + check_generated_copy_boundaries()
        + check_client_provider_boundary()
        + check_translation_artifacts()
    )
    if args.require_global_closure:
        failures += check_global_closure()

    if failures:
        print("SREADYA GLOBALIZATION CONTRACT FAILED", file=sys.stderr)
        for failure in failures:
            print(f" - {failure}", file=sys.stderr)
        raise SystemExit(1)

    if args.require_global_closure:
        print("SREADYA GLOBALIZATION FORMAL CLOSURE PASS")
    else:
        print("SREADYA GLOBALIZATION CONTRACT PASS")


if __name__ == "__main__":
    main()
