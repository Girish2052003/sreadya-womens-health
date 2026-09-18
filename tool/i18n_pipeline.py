#!/usr/bin/env python3
"""SREADYA provider-neutral globalization artifact pipeline.

Canonical source: shared/i18n/source/en.json
Translation artifacts: shared/i18n/translations/*.json
Generated Web artifacts: web/public/i18n/
Generated Flutter derivative: lib/l10n/sreadya_global_en.generated.arb

No health/user data enters this pipeline. Only repository-owned source copy is processed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "shared/i18n/source/en.json"
TRANSLATIONS = ROOT / "shared/i18n/translations"
WEB_OUT = ROOT / "web/public/i18n"
TS_MANIFEST = ROOT / "web/src/i18n/translation-manifest.generated.ts"
FLUTTER_OUT = ROOT / "lib/l10n/sreadya_global_en.generated.arb"
MEMORY = ROOT / "shared/i18n/translation-memory.json"
PLACEHOLDER = re.compile(r"\{([A-Za-z0-9_.-]+)\}")

PSEUDO_LOCALES = ("en-XA", "ar-XB")


def compact_json(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def pretty_json(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def placeholders(value: str) -> set[str]:
    return set(PLACEHOLDER.findall(value))


def source_state() -> tuple[dict[str, str], bytes, str, str]:
    raw = SOURCE.read_bytes()
    parsed = json.loads(raw)
    if not isinstance(parsed, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in parsed.items()):
        raise SystemExit("canonical source catalogue must be a JSON string->string object")
    return parsed, raw, git_blob_sha(raw), sha256(raw)


def pseudo_expand(text: str) -> str:
    table = str.maketrans({
        "a": "á", "e": "ë", "i": "ï", "o": "ô", "u": "ü",
        "A": "Á", "E": "Ë", "I": "Ï", "O": "Ô", "U": "Ü",
    })
    parts = re.split(r"(\{[A-Za-z0-9_.-]+\})", text)
    transformed = "".join(part if PLACEHOLDER.fullmatch(part) else part.translate(table) for part in parts)
    return f"［!! {transformed} ~~ !!］"


def pseudo_rtl(text: str) -> str:
    parts = re.split(r"(\{[A-Za-z0-9_.-]+\})", text)
    transformed = "".join(part if PLACEHOLDER.fullmatch(part) else part for part in parts)
    return "\u202b" + transformed + "\u202c"


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
    """Generic protected build-time adapter.

    Request:
      {"targetLocale": "...", "sourceLocale": "en", "messages": {...}}
    Response:
      {"messages": {...}}

    Secrets are read only from the build environment.
    """

    provider_id = "http-json"

    def __init__(self) -> None:
        self.endpoint = os.environ.get("SREADYA_TRANSLATION_ENDPOINT", "").strip()
        self.api_key = os.environ.get("SREADYA_TRANSLATION_API_KEY", "").strip()
        self.model_id = os.environ.get("SREADYA_TRANSLATION_MODEL", "provider-default").strip()
        if not self.endpoint:
            raise SystemExit("SREADYA_TRANSLATION_ENDPOINT is required for http-json provider")

    def translate(self, locale: str, messages: dict[str, str]) -> dict[str, str]:
        payload = compact_json({"targetLocale": locale, "sourceLocale": "en", "messages": messages})
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        request = urllib.request.Request(self.endpoint, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(request, timeout=90) as response:
            parsed = json.loads(response.read())
        translated = parsed.get("messages")
        if not isinstance(translated, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in translated.items()):
            raise SystemExit("translation provider returned an invalid messages object")
        return translated


def load_artifacts(source: dict[str, str], source_version: str) -> list[Artifact]:
    artifacts: list[Artifact] = []
    if not TRANSLATIONS.exists():
        return artifacts
    for path in sorted(TRANSLATIONS.glob("*.json")):
        parsed = json.loads(path.read_text("utf-8"))
        meta = parsed.get("meta", {})
        messages = parsed.get("messages", {})
        locale = str(meta.get("locale", "")).strip()
        if not locale:
            raise SystemExit(f"{path}: missing meta.locale")
        if meta.get("sourceVersion") != source_version:
            raise SystemExit(f"{path}: stale sourceVersion; regenerate or review translation")
        if not isinstance(messages, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in messages.items()):
            raise SystemExit(f"{path}: messages must be string->string")
        unknown = sorted(set(messages) - set(source))
        if unknown:
            raise SystemExit(f"{path}: unknown source keys: {unknown[:5]}")
        for key, value in messages.items():
            if placeholders(value) != placeholders(source[key]):
                raise SystemExit(f"{path}: placeholder mismatch for {key}")
        artifacts.append(Artifact(
            locale=locale,
            source_version=source_version,
            method=str(meta.get("method", "machine")),
            provider=str(meta.get("provider", "unknown")),
            provider_model=str(meta.get("providerModel", "unknown")),
            review_status=str(meta.get("reviewStatus", "machine-unreviewed")),
            risk=str(meta.get("risk", "standard-ui")),
            messages=messages,
        ))
    return artifacts


def flutter_key(message_id: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", message_id)
    if not cleaned[0].isalpha():
        cleaned = "m_" + cleaned
    return "sreadya_" + cleaned


def generated_outputs() -> dict[Path, bytes]:
    source, source_raw, source_version, source_sha256 = source_state()
    artifacts = load_artifacts(source, source_version)

    bundles: list[tuple[str, dict[str, str], dict[str, str]]] = []
    bundles.append(("en", source, {
        "method": "source",
        "provider": "sreadya",
        "providerModel": "authoritative-source",
        "reviewStatus": "source-authoritative",
        "risk": "mixed",
    }))
    for artifact in artifacts:
        bundles.append((artifact.locale, artifact.messages, {
            "method": artifact.method,
            "provider": artifact.provider,
            "providerModel": artifact.provider_model,
            "reviewStatus": artifact.review_status,
            "risk": artifact.risk,
        }))
    bundles.append(("en-XA", {k: pseudo_expand(v) for k, v in source.items()}, {
        "method": "pseudo",
        "provider": "sreadya-ci",
        "providerModel": "expansion-v1",
        "reviewStatus": "test-only",
        "risk": "test-only",
    }))
    bundles.append(("ar-XB", {k: pseudo_rtl(v) for k, v in source.items()}, {
        "method": "pseudo",
        "provider": "sreadya-ci",
        "providerModel": "rtl-v1",
        "reviewStatus": "test-only",
        "risk": "test-only",
    }))

    outputs: dict[Path, bytes] = {}
    manifest_artifacts: dict[str, object] = {}
    availability: dict[str, object] = {}

    for locale, messages, meta in bundles:
        data = pretty_json(messages)
        digest = sha256(data)
        filename = f"{locale.lower()}.{digest[:16]}.json"
        outputs[WEB_OUT / filename] = data
        coverage = "source" if locale == "en" else (
            "pseudo" if locale in PSEUDO_LOCALES else ("complete" if len(messages) == len(source) else "partial")
        )
        manifest_artifacts[locale.lower()] = {
            "locale": locale,
            "path": f"i18n/{filename}",
            "sha256": digest,
            "gitBlobSha": git_blob_sha(data),
            "messageCount": len(messages),
            "sourceMessageCount": len(source),
            "coverage": coverage,
            "sourceVersion": source_version,
            **meta,
        }
        if locale not in PSEUDO_LOCALES:
            availability[locale.split("-")[0].lower()] = {
                "coverage": coverage,
                "reviewStatus": meta["reviewStatus"],
                "method": meta["method"],
            }

    manifest = {
        "version": 1,
        "sourceLocale": "en",
        "sourceVersion": source_version,
        "sourceSha256": source_sha256,
        "artifacts": manifest_artifacts,
    }
    outputs[WEB_OUT / "manifest.json"] = pretty_json(manifest)

    ts = (
        "// Generated by tool/i18n_pipeline.py. Do not hand-edit.\n"
        f"export const GENERATED_TRANSLATION_AVAILABILITY = {json.dumps(availability, ensure_ascii=False, sort_keys=True, indent=2)} as const;\n"
        "export type GeneratedTranslationLanguage = keyof typeof GENERATED_TRANSLATION_AVAILABILITY;\n"
    ).encode("utf-8")
    outputs[TS_MANIFEST] = ts

    arb: dict[str, object] = {"@@locale": "en"}
    seen: set[str] = set()
    for message_id, value in sorted(source.items()):
        key = flutter_key(message_id)
        if key in seen:
            raise SystemExit(f"Flutter ARB key collision for {message_id}: {key}")
        seen.add(key)
        arb[key] = value
        arb[f"@{key}"] = {"description": f"SREADYA canonical message ID: {message_id}"}
    outputs[FLUTTER_OUT] = pretty_json(arb)
    return outputs


def write_outputs(outputs: dict[Path, bytes]) -> None:
    expected_names = {path.name for path in outputs if path.parent == WEB_OUT}
    WEB_OUT.mkdir(parents=True, exist_ok=True)
    for path in WEB_OUT.glob("*.json"):
        if path.name not in expected_names:
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
        expected_names = {path.name for path in outputs if path.parent == WEB_OUT}
        extras = sorted(path.name for path in WEB_OUT.glob("*.json") if path.name not in expected_names)
        failures.extend(f"unexpected stale Web i18n artifact: web/public/i18n/{name}" for name in extras)
    if failures:
        print("\n".join(failures), file=sys.stderr)
        raise SystemExit(1)


def provider_for(name: str) -> TranslationProvider:
    if name == "dry-run":
        return DryRunProvider()
    if name == "http-json":
        return HttpJsonProvider()
    raise SystemExit(f"unknown provider: {name}")


def translation_plan(locales: list[str]) -> int:
    source, _, source_version, _ = source_state()
    existing = {artifact.locale.lower(): artifact for artifact in load_artifacts(source, source_version)}
    jobs = 0
    for locale in locales:
        current = existing.get(locale.lower())
        missing = [key for key in source if current is None or key not in current.messages]
        jobs += len(missing)
        print(json.dumps({"locale": locale, "missingMessages": len(missing), "sourceVersion": source_version}, sort_keys=True))
    return jobs


def translate_locale(locale: str, provider_name: str) -> None:
    source, _, source_version, _ = source_state()
    existing = {artifact.locale.lower(): artifact for artifact in load_artifacts(source, source_version)}
    current = existing.get(locale.lower())
    messages = dict(current.messages) if current else {}
    missing = {key: value for key, value in source.items() if key not in messages}
    provider = provider_for(provider_name)
    translated = provider.translate(locale, missing)
    for key, value in translated.items():
        if key not in missing:
            raise SystemExit(f"provider returned unexpected key: {key}")
        if placeholders(value) != placeholders(source[key]):
            raise SystemExit(f"provider placeholder mismatch: {key}")
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
    }
    (TRANSLATIONS / f"{locale.lower()}.json").write_bytes(pretty_json(artifact))


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--translate", action="store_true")
    parser.add_argument("--locales", default="")
    parser.add_argument("--locale")
    parser.add_argument("--provider", default="dry-run")
    args = parser.parse_args()

    if args.write:
        write_outputs(generated_outputs())
    elif args.check:
        check_outputs(generated_outputs())
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
