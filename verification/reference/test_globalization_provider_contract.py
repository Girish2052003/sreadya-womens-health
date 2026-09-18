from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "tool" / "i18n_pipeline.py"

spec = importlib.util.spec_from_file_location("sreadya_i18n_pipeline", MODULE_PATH)
assert spec is not None and spec.loader is not None
pipeline = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = pipeline
spec.loader.exec_module(pipeline)


def test_frozen_google_nmt_floor_is_exactly_194_logical_rows() -> None:
    baseline = pipeline.load_google_baseline()
    assert baseline["minimumLogicalLanguageCount"] == 194
    assert len(baseline["languages"]) == 194
    assert len({pipeline.locale_key(row["code"]) for row in baseline["languages"]}) == 194


def test_google_discovery_accepts_known_aliases_and_future_additions() -> None:
    baseline = pipeline.load_google_baseline()
    discovered = []
    alias_preference = {
        "zh-CN": "zh",
        "fil": "tl",
        "he": "iw",
        "jv": "jw",
    }

    for row in baseline["languages"]:
        code = alias_preference.get(row["code"], row["code"])
        discovered.append({"code": code, "englishName": row["englishName"]})

    discovered.append({"code": "zz-future", "englishName": "Future Provider Language"})
    logical = pipeline.canonicalize_google_discovery(discovered, baseline)

    by_code = {row["code"]: row for row in logical}
    assert len(logical) == 195
    assert by_code["zh-CN"]["providerCode"] == "zh"
    assert by_code["fil"]["providerCode"] == "tl"
    assert by_code["he"]["providerCode"] == "iw"
    assert by_code["jv"]["providerCode"] == "jw"
    assert by_code["zz-future"]["providerCode"] == "zz-future"


def test_placeholder_and_product_terms_round_trip_through_protection() -> None:
    source = "SREADYA keeps CycleVault private for Week {week} with {count} entries."
    protected, token_map = pipeline.protect_text(source)

    assert "SREADYA" not in protected
    assert "CycleVault" not in protected
    assert "{week}" not in protected
    assert "{count}" not in protected
    assert pipeline.restore_text(protected, token_map, "test.message") == source


def test_restore_fails_closed_when_provider_damages_a_protected_token() -> None:
    source = "Week {week}"
    protected, token_map = pipeline.protect_text(source)
    damaged = protected.replace("ZXQPROTECT", "BROKEN", 1)

    with pytest.raises(SystemExit):
        pipeline.restore_text(damaged, token_map, "test.message")


def test_translation_batches_remain_below_provider_item_limit() -> None:
    rows = [(f"k{i}", f"value {i}", {}) for i in range(205)]
    batches = pipeline.message_batches(rows)

    assert [len(batch) for batch in batches] == [100, 100, 5]


def test_paid_translation_character_ceiling_is_fail_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    plan = {"providerInputCharacters": 101}

    monkeypatch.delenv("SREADYA_TRANSLATION_MAX_CHARACTERS", raising=False)
    with pytest.raises(SystemExit):
        pipeline.enforce_translation_character_budget(plan)

    monkeypatch.setenv("SREADYA_TRANSLATION_MAX_CHARACTERS", "100")
    with pytest.raises(SystemExit):
        pipeline.enforce_translation_character_budget(plan)

    monkeypatch.setenv("SREADYA_TRANSLATION_MAX_CHARACTERS", "101")
    pipeline.enforce_translation_character_budget(plan)


def test_client_source_does_not_need_google_credentials() -> None:
    provider = (ROOT / "web" / "src" / "i18n" / "I18nProvider.tsx").read_text("utf-8")
    chooser = (ROOT / "web" / "src" / "components" / "navigation" / "LanguageChooser.tsx").read_text("utf-8")

    for text in (provider, chooser):
        assert "SREADYA_GOOGLE_TRANSLATE_API_KEY" not in text
        assert "translation.googleapis.com" not in text

def test_google_locale_sync_deduplicates_and_reuses_unchanged_source(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(pipeline, "TRANSLATIONS", tmp_path)
    source = {
        "one": "Same source value",
        "two": "Same source value",
        "three": "Week {week}",
    }
    source_version = "deadbeef"

    class FakeGoogleProvider:
        provider_id = pipeline.GOOGLE_PROVIDER_ID
        model_id = pipeline.GOOGLE_MODEL_ID

        def __init__(self) -> None:
            self.calls: list[dict[str, str]] = []

        def translate(self, locale: str, messages: dict[str, str]) -> dict[str, str]:
            assert locale == "fi"
            self.calls.append(dict(messages))
            return {
                key: (
                    "Sama lähdearvo"
                    if value == "Same source value"
                    else "Viikko {week}"
                )
                for key, value in messages.items()
            }

    provider = FakeGoogleProvider()
    translated, reused = pipeline.sync_google_locale(
        canonical_locale="fi",
        provider_locale="fi",
        provider=provider,
        source=source,
        source_version=source_version,
    )

    assert translated == 3
    assert reused == 0
    assert len(provider.calls) == 1
    assert len(provider.calls[0]) == 2

    artifact = pipeline.read_raw_translation("fi")
    assert artifact["meta"]["provider"] == pipeline.GOOGLE_PROVIDER_ID
    assert artifact["meta"]["risk"] == "mixed"
    assert artifact["messages"]["one"] == artifact["messages"]["two"]
    assert artifact["messages"]["three"] == "Viikko {week}"
    assert set(artifact["sourceHashes"]) == set(source)

    provider.calls.clear()
    translated, reused = pipeline.sync_google_locale(
        canonical_locale="fi",
        provider_locale="fi",
        provider=provider,
        source=source,
        source_version=source_version,
    )

    assert translated == 0
    assert reused == 3
    assert provider.calls == []

