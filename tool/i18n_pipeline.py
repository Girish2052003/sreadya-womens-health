#!/usr/bin/env python3
"""SREADYA provider-neutral globalization artifact pipeline."""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "shared/i18n/source/en.json"
TRANSLATIONS = ROOT / "shared/i18n/translations"
WEB_OUT = ROOT / "web/public/i18n"
TS_MANIFEST = ROOT / "web/src/i18n/translation-manifest.generated.ts"
WEB_SOURCE_TS = ROOT / "web/src/i18n/source.generated.ts"
FLUTTER_OUT = ROOT / "shared/i18n/generated/flutter/sreadya_global_en.generated.arb"
GOOGLE_BASELINE = ROOT / "shared/i18n/providers/google-nmt-baseline.json"
GOOGLE_DISCOVERY = ROOT / "shared/i18n/providers/google-discovered.json"

MESSAGE_VARIABLE = re.compile(r"\{([A-Za-z0-9_.-]+)\}")
PSEUDO_LOCALES = ("en-XA", "ar-XB")
GOOGLE_PROVIDER_ID = "google-cloud-translation"
GOOGLE_MODEL_ID = "nmt-v2"
GOOGLE_LANGUAGES_URL = "https://translation.googleapis.com/language/translate/v2/languages"
GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"
GOOGLE_BASELINE_COUNT = 194
PROTECTED_TERMS = (
    "SREADYA",
    "Sreadya",
    "CycleVault",
    "FORGE",
    "NC CORP",
    "WebCrypto",
    "IndexedDB",
    "E2EE",
    "PWA",
    "PIN",
)


def pretty_json(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()


def compact_json(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def source_value_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def message_variables(value: str) -> set[str]:
    return set(MESSAGE_VARIABLE.findall(value))


def locale_key(locale: str) -> str:
    return locale.strip().replace("_", "-").lower()


def source_state() -> tuple[dict[str, str], bytes, str]:
    raw = SOURCE.read_bytes()
    parsed = json.loads(raw)
    if not isinstance(parsed, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in parsed.items()):
        raise SystemExit("canonical source catalogue must be string->string JSON")
    return parsed, raw, git_blob_sha(raw)


def load_google_baseline() -> dict:
    parsed = json.loads(GOOGLE_BASELINE.read_text("utf-8"))
    languages = parsed.get("languages")
    minimum = parsed.get("minimumLogicalLanguageCount")
    if minimum != GOOGLE_BASELINE_COUNT:
        raise SystemExit(f"Google NMT baseline minimum must be {GOOGLE_BASELINE_COUNT}, got {minimum!r}")
    if not isinstance(languages, list) or len(languages) != GOOGLE_BASELINE_COUNT:
        raise SystemExit(f"Google NMT baseline must contain exactly {GOOGLE_BASELINE_COUNT} logical rows")
    seen: set[str] = set()
    for row in languages:
        if not isinstance(row, dict):
            raise SystemExit("Google NMT baseline row must be an object")
        code = str(row.get("code", "")).strip()
        name = str(row.get("englishName", "")).strip()
        if not code or not name:
            raise SystemExit("Google NMT baseline rows require code and englishName")
        key = locale_key(code)
        if key in seen:
            raise SystemExit(f"duplicate Google NMT baseline code: {code}")
        seen.add(key)
        aliases = row.get("aliases", [])
        if aliases is not None and (
            not isinstance(aliases, list) or not all(isinstance(alias, str) and alias.strip() for alias in aliases)
        ):
            raise SystemExit(f"invalid aliases for Google NMT baseline code: {code}")
    return parsed


def baseline_name_map() -> dict[str, str]:
    baseline = load_google_baseline()
    return {locale_key(row["code"]): str(row["englishName"]) for row in baseline["languages"]}


def load_discovery_name_map() -> dict[str, str]:
    names = baseline_name_map()
    if not GOOGLE_DISCOVERY.exists():
        return names
    parsed = json.loads(GOOGLE_DISCOVERY.read_text("utf-8"))
    languages = parsed.get("languages", [])
    if not isinstance(languages, list):
        return names
    for row in languages:
        if isinstance(row, dict):
            code = str(row.get("code", "")).strip()
            name = str(row.get("englishName", "")).strip()
            if code and name:
                names[locale_key(code)] = name
    return names


def pseudo_expand(text: str) -> str:
    table = str.maketrans(
        {"a": "á", "e": "ë", "i": "ï", "o": "ô", "u": "ü", "A": "Á", "E": "Ë", "I": "Ï", "O": "Ô", "U": "Ü"}
    )
    parts = re.split(r"(\{[A-Za-z0-9_.-]+\})", text)
    body = "".join(part if MESSAGE_VARIABLE.fullmatch(part) else part.translate(table) for part in parts)
    return f"［!! {body} ~~ !!］"


def pseudo_rtl(text: str) -> str:
    parts = re.split(r"(\{[A-Za-z0-9_.-]+\})", text)
    return "\u202b" + "".join(parts) + "\u202c"


@dataclass(frozen=True)
class Artifact:
    locale: str
    source_version: str
    method: str
    provider: str
    provider_model: str
    review_status: str
    risk: str
    messages: dict[str, str]
    source_hashes: dict[str, str]


class TranslationProvider(Protocol):
    provider_id: str
    model_id: str

    def translate(self, locale: str, messages: dict[str, str]) -> dict[str, str]:
        ...


class DryRunProvider:
    provider_id = "dry-run"
    model_id = "none"

    def translate(self, locale: str, messages: dict[str, str]) -> dict[str, str]:
        print(f"DRY-RUN locale={locale} messages={len(messages)}", file=sys.stderr)
        return {}


class HttpJsonProvider:
    provider_id = "http-json"

    def __init__(self) -> None:
        self.endpoint = os.environ.get("SREADYA_TRANSLATION_ENDPOINT", "").strip()
        self.api_key = os.environ.get("SREADYA_TRANSLATION_API_KEY", "").strip()
        self.model_id = os.environ.get("SREADYA_TRANSLATION_MODEL", "provider-default").strip()
        if not self.endpoint:
            raise SystemExit("SREADYA_TRANSLATION_ENDPOINT is required")

    def translate(self, locale: str, messages: dict[str, str]) -> dict[str, str]:
        payload = compact_json({"targetLocale": locale, "sourceLocale": "en", "messages": messages})
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        request = urllib.request.Request(self.endpoint, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(request, timeout=90) as response:
            parsed = json.loads(response.read())
        translated = parsed.get("messages")
        if not isinstance(translated, dict) or not all(
            isinstance(k, str) and isinstance(v, str) for k, v in translated.items()
        ):
            raise SystemExit("translation provider returned invalid messages")
        return translated


class GoogleCloudProvider:
    provider_id = GOOGLE_PROVIDER_ID
    model_id = GOOGLE_MODEL_ID

    def __init__(self) -> None:
        self.api_key = os.environ.get("SREADYA_GOOGLE_TRANSLATE_API_KEY", "").strip()
        if not self.api_key:
            raise SystemExit(
                "SREADYA_GOOGLE_TRANSLATE_API_KEY is required; configure it only in protected CI/build secrets"
            )

    def _request_json(self, request: urllib.request.Request) -> dict:
        for attempt in range(5):
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    parsed = json.loads(response.read())
                if not isinstance(parsed, dict):
                    raise SystemExit("Google Cloud Translation returned a non-object JSON response")
                return parsed
            except urllib.error.HTTPError as error:
                retryable = error.code in {429, 500, 502, 503, 504}
                if not retryable or attempt == 4:
                    detail = error.read().decode("utf-8", "replace")[:1000]
                    raise SystemExit(f"Google Cloud Translation HTTP {error.code}: {detail}") from error
            except urllib.error.URLError as error:
                if attempt == 4:
                    raise SystemExit(f"Google Cloud Translation network error: {error}") from error
            time.sleep(2**attempt)
        raise AssertionError("unreachable")

    def supported_languages(self) -> list[dict[str, str]]:
        query = urllib.parse.urlencode({"target": "en", "key": self.api_key})
        request = urllib.request.Request(f"{GOOGLE_LANGUAGES_URL}?{query}", method="GET")
        parsed = self._request_json(request)
        data = parsed.get("data", {})
        languages = data.get("languages", []) if isinstance(data, dict) else []
        if not isinstance(languages, list):
            raise SystemExit("Google Cloud Translation supported-languages response is invalid")
        out: list[dict[str, str]] = []
        for row in languages:
            if not isinstance(row, dict):
                continue
            code = str(row.get("language", "")).strip()
            name = str(row.get("name", "")).strip() or code
            if code:
                out.append({"code": code, "englishName": name})
        if not out:
            raise SystemExit("Google Cloud Translation returned no supported target languages")
        return out

    def translate(self, locale: str, messages: dict[str, str]) -> dict[str, str]:
        if not messages:
            return {}
        protected: list[tuple[str, str, dict[str, str]]] = []
        for key, value in messages.items():
            text, token_map = protect_text(value)
            protected.append((key, text, token_map))

        translated: dict[str, str] = {}
        for batch in message_batches(protected):
            query = urllib.parse.urlencode({"key": self.api_key})
            payload = {
                "q": [item[1] for item in batch],
                "source": "en",
                "target": locale,
                "format": "text",
                "model": "nmt",
            }
            request = urllib.request.Request(
                f"{GOOGLE_TRANSLATE_URL}?{query}",
                data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                headers={"Content-Type": "application/json; charset=utf-8"},
                method="POST",
            )
            parsed = self._request_json(request)
            data = parsed.get("data", {})
            rows = data.get("translations", []) if isinstance(data, dict) else []
            if not isinstance(rows, list) or len(rows) != len(batch):
                raise SystemExit("Google Cloud Translation returned the wrong translation count")
            for source_row, response_row in zip(batch, rows):
                key, _protected_text, token_map = source_row
                if not isinstance(response_row, dict) or not isinstance(response_row.get("translatedText"), str):
                    raise SystemExit(f"Google Cloud Translation returned invalid text for {key}")
                value = restore_text(html.unescape(response_row["translatedText"]), token_map, key)
                translated[key] = value

        return translated


def protect_text(value: str) -> tuple[str, dict[str, str]]:
    token_map: dict[str, str] = {}
    counter = 0

    def reserve(literal: str) -> str:
        nonlocal counter
        token = f"ZXQPROTECT{counter:04d}TOKEN"
        counter += 1
        token_map[token] = literal
        return token

    protected = re.sub(r"\{[A-Za-z0-9_.-]+\}", lambda match: reserve(match.group(0)), value)
    for term in sorted(PROTECTED_TERMS, key=len, reverse=True):
        protected = protected.replace(term, reserve(term)) if term in protected else protected
    return protected, token_map


def restore_text(value: str, token_map: dict[str, str], message_id: str) -> str:
    restored = value
    for token, literal in token_map.items():
        if token not in restored:
            raise SystemExit(f"translation provider altered protected token for {message_id}: {token}")
        restored = restored.replace(token, literal)
    if "ZXQPROTECT" in restored:
        raise SystemExit(f"unrestored translation token remains in {message_id}")
    return restored


def message_batches(
    rows: list[tuple[str, str, dict[str, str]]],
    *,
    max_items: int = 100,
    max_chars: int = 24000,
) -> list[list[tuple[str, str, dict[str, str]]]]:
    batches: list[list[tuple[str, str, dict[str, str]]]] = []
    current: list[tuple[str, str, dict[str, str]]] = []
    current_chars = 0
    for row in rows:
        row_chars = len(row[1])
        if current and (len(current) >= max_items or current_chars + row_chars > max_chars):
            batches.append(current)
            current = []
            current_chars = 0
        current.append(row)
        current_chars += row_chars
    if current:
        batches.append(current)
    return batches


def canonicalize_google_discovery(
    discovered: list[dict[str, str]], baseline: dict
) -> list[dict[str, str]]:
    baseline_rows = baseline["languages"]
    alias_to_canonical: dict[str, str] = {}
    baseline_by_key: dict[str, dict] = {}

    for row in baseline_rows:
        canonical = str(row["code"])
        key = locale_key(canonical)
        baseline_by_key[key] = row
        alias_to_canonical[key] = canonical
        for alias in row.get("aliases", []):
            alias_to_canonical[locale_key(alias)] = canonical

    discovered_by_key = {locale_key(row["code"]): row for row in discovered if row.get("code")}
    missing: list[str] = []
    canonical_rows: dict[str, dict[str, str]] = {}

    for key, baseline_row in baseline_by_key.items():
        canonical = str(baseline_row["code"])
        candidates = [canonical, *baseline_row.get("aliases", [])]
        provider_row = next(
            (discovered_by_key[locale_key(candidate)] for candidate in candidates if locale_key(candidate) in discovered_by_key),
            None,
        )
        if provider_row is None:
            missing.append(canonical)
            continue
        canonical_rows[key] = {
            "code": canonical,
            "englishName": str(baseline_row["englishName"]),
            "providerCode": str(provider_row["code"]),
        }

    if missing:
        raise SystemExit(
            "Google supported-language discovery dropped frozen baseline targets: " + ", ".join(sorted(missing))
        )

    for row in discovered:
        provider_code = str(row.get("code", "")).strip()
        if not provider_code:
            continue
        provider_key = locale_key(provider_code)
        if provider_key in alias_to_canonical:
            continue
        if provider_key not in canonical_rows:
            canonical_rows[provider_key] = {
                "code": provider_code,
                "englishName": str(row.get("englishName") or provider_code),
                "providerCode": provider_code,
            }

    out = sorted(canonical_rows.values(), key=lambda row: (row["englishName"].casefold(), row["code"].casefold()))
    if len(out) < GOOGLE_BASELINE_COUNT:
        raise SystemExit(
            f"Google supported-language discovery returned {len(out)} logical targets; expected at least {GOOGLE_BASELINE_COUNT}"
        )
    return out


def load_artifacts(source: dict[str, str], source_version: str) -> list[Artifact]:
    artifacts: list[Artifact] = []
    if not TRANSLATIONS.exists():
        return artifacts

    for path in sorted(TRANSLATIONS.glob("*.json")):
        parsed = json.loads(path.read_text("utf-8"))
        meta = parsed.get("meta", {})
        messages = parsed.get("messages", {})
        source_hashes = parsed.get("sourceHashes", {})

        locale = str(meta.get("locale", "")).strip()
        if not locale:
            raise SystemExit(f"{path}: missing meta.locale")
        if meta.get("sourceVersion") != source_version:
            raise SystemExit(f"{path}: stale sourceVersion")
        if not isinstance(messages, dict) or not all(
            isinstance(k, str) and isinstance(v, str) for k, v in messages.items()
        ):
            raise SystemExit(f"{path}: messages must be string->string")
        if not isinstance(source_hashes, dict) or not all(
            isinstance(k, str) and isinstance(v, str) for k, v in source_hashes.items()
        ):
            raise SystemExit(f"{path}: sourceHashes must be string->string")

        unknown = sorted(set(messages) - set(source))
        if unknown:
            raise SystemExit(f"{path}: unknown keys {unknown[:5]}")

        for key, value in messages.items():
            if message_variables(value) != message_variables(source[key]):
                raise SystemExit(f"{path}: message variable mismatch for {key}")
            if key in source_hashes and source_hashes[key] != source_value_hash(source[key]):
                raise SystemExit(f"{path}: stale per-message source hash for {key}")

        artifacts.append(
            Artifact(
                locale,
                source_version,
                str(meta.get("method", "machine")),
                str(meta.get("provider", "unknown")),
                str(meta.get("providerModel", "unknown")),
                str(meta.get("reviewStatus", "machine-unreviewed")),
                str(meta.get("risk", "standard-ui")),
                messages,
                source_hashes,
            )
        )
    return artifacts


def read_raw_translation(locale: str) -> dict:
    path = TRANSLATIONS / f"{locale_key(locale)}.json"
    if not path.exists():
        return {}
    parsed = json.loads(path.read_text("utf-8"))
    return parsed if isinstance(parsed, dict) else {}


def sync_google_locale(
    *,
    canonical_locale: str,
    provider_locale: str,
    provider: GoogleCloudProvider,
    source: dict[str, str],
    source_version: str,
) -> tuple[int, int]:
    if locale_key(canonical_locale) == "en":
        return 0, len(source)

    existing = read_raw_translation(canonical_locale)
    meta = existing.get("meta", {}) if isinstance(existing.get("meta"), dict) else {}
    existing_messages = existing.get("messages", {}) if isinstance(existing.get("messages"), dict) else {}
    existing_hashes = existing.get("sourceHashes", {}) if isinstance(existing.get("sourceHashes"), dict) else {}
    existing_is_google = str(meta.get("provider", "")) == GOOGLE_PROVIDER_ID

    messages: dict[str, str] = {}
    hashes: dict[str, str] = {}
    to_translate: dict[str, str] = {}

    for key, value in source.items():
        digest = source_value_hash(value)
        reusable = (
            existing_is_google
            and isinstance(existing_messages.get(key), str)
            and existing_hashes.get(key) == digest
            and message_variables(existing_messages[key]) == message_variables(value)
        )
        if reusable:
            messages[key] = existing_messages[key]
            hashes[key] = digest
        else:
            to_translate[key] = value

    groups: dict[str, list[str]] = {}
    for key, value in to_translate.items():
        groups.setdefault(value, []).append(key)
    representatives = {keys[0]: value for value, keys in groups.items()}
    translated_representatives = provider.translate(provider_locale, representatives)
    if set(translated_representatives) != set(representatives):
        missing = sorted(set(representatives) - set(translated_representatives))
        extra = sorted(set(translated_representatives) - set(representatives))
        raise SystemExit(
            f"{canonical_locale}: provider result mismatch missing={missing[:5]} extra={extra[:5]}"
        )

    translated: dict[str, str] = {}
    for source_value, keys in groups.items():
        representative = keys[0]
        translated_value = translated_representatives[representative]
        for key in keys:
            translated[key] = translated_value

    for key, value in translated.items():
        if not value.strip():
            raise SystemExit(f"{canonical_locale}: empty translation for {key}")
        if message_variables(value) != message_variables(source[key]):
            raise SystemExit(f"{canonical_locale}: message variable mismatch for {key}")
        messages[key] = value
        hashes[key] = source_value_hash(source[key])

    if set(messages) != set(source):
        raise SystemExit(f"{canonical_locale}: translation is not complete")

    artifact = {
        "meta": {
            "locale": canonical_locale,
            "sourceLocale": "en",
            "sourceVersion": source_version,
            "method": "machine",
            "provider": GOOGLE_PROVIDER_ID,
            "providerModel": provider.model_id,
            "reviewStatus": "machine-unreviewed",
            "risk": "mixed",
        },
        "messages": messages,
        "sourceHashes": hashes,
    }
    TRANSLATIONS.mkdir(parents=True, exist_ok=True)
    (TRANSLATIONS / f"{locale_key(canonical_locale)}.json").write_bytes(pretty_json(artifact))
    return len(to_translate), len(source) - len(to_translate)


def google_discovery(provider: GoogleCloudProvider) -> list[dict[str, str]]:
    baseline = load_google_baseline()
    discovered = provider.supported_languages()
    logical = canonicalize_google_discovery(discovered, baseline)
    payload = {
        "schemaVersion": 1,
        "provider": GOOGLE_PROVIDER_ID,
        "baselinePublishedDate": baseline["publishedDate"],
        "baselineLogicalLanguageCount": GOOGLE_BASELINE_COUNT,
        "discoveredLogicalLanguageCount": len(logical),
        "languages": logical,
    }
    GOOGLE_DISCOVERY.parent.mkdir(parents=True, exist_ok=True)
    GOOGLE_DISCOVERY.write_bytes(pretty_json(payload))
    return logical


def google_sync_plan(
    logical: list[dict[str, str]],
    source: dict[str, str],
) -> dict[str, int]:
    translated_messages = 0
    reused_messages = 0
    provider_input_characters = 0

    for row in logical:
        canonical = str(row["code"])
        if locale_key(canonical) == "en":
            continue

        existing = read_raw_translation(canonical)
        meta = existing.get("meta", {}) if isinstance(existing.get("meta"), dict) else {}
        existing_messages = existing.get("messages", {}) if isinstance(existing.get("messages"), dict) else {}
        existing_hashes = existing.get("sourceHashes", {}) if isinstance(existing.get("sourceHashes"), dict) else {}
        existing_is_google = str(meta.get("provider", "")) == GOOGLE_PROVIDER_ID

        pending_values: set[str] = set()
        for key, value in source.items():
            digest = source_value_hash(value)
            reusable = (
                existing_is_google
                and isinstance(existing_messages.get(key), str)
                and existing_hashes.get(key) == digest
                and message_variables(existing_messages[key]) == message_variables(value)
            )
            if reusable:
                reused_messages += 1
                continue
            translated_messages += 1
            pending_values.add(value)

        for value in pending_values:
            protected, _ = protect_text(value)
            provider_input_characters += len(protected)

    return {
        "logicalLanguages": len(logical),
        "sourceMessages": len(source),
        "translatedMessages": translated_messages,
        "reusedMessages": reused_messages,
        "providerInputCharacters": provider_input_characters,
    }


def enforce_translation_character_budget(plan: dict[str, int]) -> None:
    raw_limit = os.environ.get("SREADYA_TRANSLATION_MAX_CHARACTERS", "").strip()
    if not raw_limit:
        raise SystemExit(
            "SREADYA_TRANSLATION_MAX_CHARACTERS is required before provider translation. "
            "Set a reviewed per-run character ceiling in protected CI configuration."
        )
    try:
        limit = int(raw_limit)
    except ValueError as error:
        raise SystemExit("SREADYA_TRANSLATION_MAX_CHARACTERS must be an integer") from error
    if limit < 0:
        raise SystemExit("SREADYA_TRANSLATION_MAX_CHARACTERS must be non-negative")
    planned = plan["providerInputCharacters"]
    if planned > limit:
        raise SystemExit(
            f"translation plan requires {planned} provider input characters, exceeding approved limit {limit}"
        )


def sync_google_all(*, estimate_only: bool = False) -> None:
    provider = GoogleCloudProvider()
    source, _, source_version = source_state()
    logical = google_discovery(provider)
    allowed = {locale_key(row["code"]) for row in logical if locale_key(row["code"]) != "en"}
    plan = google_sync_plan(logical, source)
    print(json.dumps({"translationPlan": plan}, sort_keys=True))
    if estimate_only:
        return
    enforce_translation_character_budget(plan)

    translated_total = 0
    reused_total = 0
    for index, row in enumerate(logical, start=1):
        canonical = row["code"]
        if locale_key(canonical) == "en":
            continue
        translated, reused = sync_google_locale(
            canonical_locale=canonical,
            provider_locale=row["providerCode"],
            provider=provider,
            source=source,
            source_version=source_version,
        )
        translated_total += translated
        reused_total += reused
        print(
            f"[{index}/{len(logical)}] {canonical}: translated={translated} reused={reused}",
            file=sys.stderr,
        )

    for path in TRANSLATIONS.glob("*.json"):
        if locale_key(path.stem) not in allowed:
            path.unlink()

    write_outputs(generated_outputs())
    print(
        json.dumps(
            {
                "logicalLanguages": len(logical),
                "sourceMessages": len(source),
                "translatedMessages": translated_total,
                "reusedMessages": reused_total,
            },
            sort_keys=True,
        )
    )


def flutter_key(message_id: str) -> str:
    escaped = (
        message_id.replace("_", "__us__")
        .replace(".", "__dot__")
        .replace("-", "__dash__")
        .replace("/", "__slash__")
    )
    key = "sreadya_" + re.sub(r"[^A-Za-z0-9_]", "_", escaped)
    return key if key[0].isalpha() else "m_" + key


def generated_outputs() -> dict[Path, bytes]:
    source, _, source_version = source_state()
    artifacts = load_artifacts(source, source_version)
    names = load_discovery_name_map()

    bundles = [
        (
            "en",
            source,
            {
                "method": "source",
                "provider": "sreadya",
                "providerModel": "authoritative-source",
                "reviewStatus": "source-authoritative",
                "risk": "mixed",
            },
        )
    ]
    for artifact in artifacts:
        bundles.append(
            (
                artifact.locale,
                artifact.messages,
                {
                    "method": artifact.method,
                    "provider": artifact.provider,
                    "providerModel": artifact.provider_model,
                    "reviewStatus": artifact.review_status,
                    "risk": artifact.risk,
                },
            )
        )
    bundles += [
        (
            "en-XA",
            {key: pseudo_expand(value) for key, value in source.items()},
            {
                "method": "pseudo",
                "provider": "sreadya-ci",
                "providerModel": "expansion-v1",
                "reviewStatus": "test-only",
                "risk": "test-only",
            },
        ),
        (
            "ar-XB",
            {key: pseudo_rtl(value) for key, value in source.items()},
            {
                "method": "pseudo",
                "provider": "sreadya-ci",
                "providerModel": "rtl-v1",
                "reviewStatus": "test-only",
                "risk": "test-only",
            },
        ),
    ]

    outputs: dict[Path, bytes] = {}
    manifest_artifacts: dict[str, dict] = {}
    availability: dict[str, dict] = {}
    public_locales: list[dict] = []

    for locale, messages, meta in bundles:
        data = pretty_json(messages)
        digest = git_blob_sha(data)
        normalized = locale_key(locale)
        filename = f"{normalized}.{digest[:16]}.json"
        outputs[WEB_OUT / filename] = data

        complete = set(messages) == set(source) and len(messages) == len(source)
        coverage = (
            "source"
            if locale == "en"
            else ("pseudo" if locale in PSEUDO_LOCALES else ("complete" if complete else "partial"))
        )
        english_name = names.get(normalized, "English" if normalized == "en" else locale)
        manifest_artifacts[normalized] = {
            "locale": locale,
            "englishName": english_name,
            "path": f"i18n/{filename}",
            "gitBlobSha": digest,
            "messageCount": len(messages),
            "sourceMessageCount": len(source),
            "coverage": coverage,
            "sourceVersion": source_version,
            **meta,
        }

        if locale not in PSEUDO_LOCALES:
            availability[normalized] = {
                "locale": locale,
                "englishName": english_name,
                "coverage": coverage,
                "reviewStatus": meta["reviewStatus"],
                "method": meta["method"],
                "provider": meta["provider"],
            }

        if coverage in {"source", "complete"} and locale not in PSEUDO_LOCALES:
            public_locales.append(
                {
                    "tag": locale,
                    "englishName": english_name,
                    "coverage": coverage,
                    "method": meta["method"],
                    "reviewStatus": meta["reviewStatus"],
                }
            )

    public_locales.sort(key=lambda row: (str(row["englishName"]).casefold(), str(row["tag"]).casefold()))

    outputs[WEB_OUT / "manifest.json"] = pretty_json(
        {
            "version": 2,
            "sourceLocale": "en",
            "sourceVersion": source_version,
            "sourceGitBlobSha": source_version,
            "publicLocales": public_locales,
            "artifacts": manifest_artifacts,
        }
    )
    outputs[TS_MANIFEST] = (
        "// Generated by tool/i18n_pipeline.py. Do not hand-edit.\n"
        + f"export const GENERATED_TRANSLATION_AVAILABILITY = {json.dumps(availability, ensure_ascii=False, sort_keys=True, indent=2)} as const;\n"
        + "export type GeneratedTranslationLanguage = keyof typeof GENERATED_TRANSLATION_AVAILABILITY;\n"
    ).encode()
    outputs[WEB_SOURCE_TS] = (
        "// Generated by tool/i18n_pipeline.py from shared/i18n/source/en.json. Do not hand-edit.\n"
        + f"export const GENERATED_SOURCE_MESSAGES = {json.dumps(source, ensure_ascii=False, sort_keys=True, indent=2)} as const;\n"
    ).encode()

    arb: dict[str, object] = {"@@locale": "en"}
    seen: set[str] = set()
    for message_id, value in sorted(source.items()):
        key = flutter_key(message_id)
        if key in seen:
            raise SystemExit(f"Flutter ARB key collision: {key}")
        seen.add(key)
        arb[key] = value
        arb[f"@{key}"] = {"description": f"SREADYA canonical message ID: {message_id}"}
    outputs[FLUTTER_OUT] = pretty_json(arb)
    return outputs


def write_outputs(outputs: dict[Path, bytes]) -> None:
    expected = {path.name for path in outputs if path.parent == WEB_OUT}
    WEB_OUT.mkdir(parents=True, exist_ok=True)
    for path in WEB_OUT.glob("*.json"):
        if path.name not in expected:
            path.unlink()
    for path, data in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def check_outputs(outputs: dict[Path, bytes]) -> None:
    failures: list[str] = []
    for path, data in outputs.items():
        if not path.exists():
            failures.append(f"missing generated artifact: {path.relative_to(ROOT)}")
        elif path.read_bytes() != data:
            failures.append(f"stale generated artifact: {path.relative_to(ROOT)}")
    if WEB_OUT.exists():
        expected = {path.name for path in outputs if path.parent == WEB_OUT}
        failures += [
            f"unexpected stale Web i18n artifact: web/public/i18n/{path.name}"
            for path in WEB_OUT.glob("*.json")
            if path.name not in expected
        ]
    if failures:
        print("\n".join(failures), file=sys.stderr)
        raise SystemExit(1)


def provider_for(name: str) -> TranslationProvider:
    if name == "dry-run":
        return DryRunProvider()
    if name == "http-json":
        return HttpJsonProvider()
    if name == "google-cloud":
        return GoogleCloudProvider()
    raise SystemExit(f"unknown provider: {name}")


def translation_plan(locales: list[str]) -> None:
    source, _, source_version = source_state()
    existing = {locale_key(artifact.locale): artifact for artifact in load_artifacts(source, source_version)}
    for locale in locales:
        current = existing.get(locale_key(locale))
        missing = [key for key in source if current is None or key not in current.messages]
        print(
            json.dumps(
                {"locale": locale, "missingMessages": len(missing), "sourceVersion": source_version},
                sort_keys=True,
            )
        )


def translate_locale(locale: str, provider_name: str) -> None:
    source, _, source_version = source_state()
    existing = {locale_key(artifact.locale): artifact for artifact in load_artifacts(source, source_version)}
    current = existing.get(locale_key(locale))
    messages = dict(current.messages) if current else {}
    missing = {key: value for key, value in source.items() if key not in messages}
    provider = provider_for(provider_name)
    translated = provider.translate(locale, missing)
    for key, value in translated.items():
        if key not in missing:
            raise SystemExit(f"unexpected provider key: {key}")
        if message_variables(value) != message_variables(source[key]):
            raise SystemExit(f"message variable mismatch: {key}")
    messages.update(translated)
    TRANSLATIONS.mkdir(parents=True, exist_ok=True)
    artifact = {
        "meta": {
            "locale": locale,
            "sourceLocale": "en",
            "sourceVersion": source_version,
            "method": "machine",
            "provider": provider.provider_id,
            "providerModel": provider.model_id,
            "reviewStatus": "machine-unreviewed",
            "risk": "standard-ui",
        },
        "messages": messages,
        "sourceHashes": {key: source_value_hash(source[key]) for key in messages},
    }
    (TRANSLATIONS / f"{locale_key(locale)}.json").write_bytes(pretty_json(artifact))


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--translate", action="store_true")
    mode.add_argument("--check-google-baseline", action="store_true")
    mode.add_argument("--discover-google", action="store_true")
    mode.add_argument("--estimate-google-sync", action="store_true")
    mode.add_argument("--sync-google-all", action="store_true")
    parser.add_argument("--locales", default="")
    parser.add_argument("--locale")
    parser.add_argument("--provider", default="dry-run")
    args = parser.parse_args()

    if args.write:
        write_outputs(generated_outputs())
    elif args.check:
        load_google_baseline()
        check_outputs(generated_outputs())
    elif args.check_google_baseline:
        baseline = load_google_baseline()
        print(
            json.dumps(
                {
                    "provider": baseline["provider"],
                    "logicalLanguages": len(baseline["languages"]),
                    "minimumLogicalLanguageCount": baseline["minimumLogicalLanguageCount"],
                },
                sort_keys=True,
            )
        )
    elif args.discover_google:
        logical = google_discovery(GoogleCloudProvider())
        print(json.dumps({"logicalLanguages": len(logical)}, sort_keys=True))
    elif args.estimate_google_sync:
        sync_google_all(estimate_only=True)
    elif args.sync_google_all:
        sync_google_all()
    elif args.dry_run:
        locales = [value.strip() for value in args.locales.split(",") if value.strip()]
        if not locales:
            raise SystemExit("--dry-run requires --locales")
        translation_plan(locales)
    else:
        if not args.locale:
            raise SystemExit("--translate requires --locale")
        translate_locale(args.locale, args.provider)


if __name__ == "__main__":
    main()
