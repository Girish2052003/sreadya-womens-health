from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "shared" / "schemas" / "v1"
TERMS = ROOT / "shared" / "terminology" / "en.v1.json"

SCHEMAS = {
    "period-episode.schema.json",
    "health-observation.schema.json",
    "prediction.schema.json",
    "reminder-preference.schema.json",
    "life-stage.schema.json",
    "report-selection.schema.json",
    "device-record.schema.json",
    "sync-envelope.schema.json",
}

RFC3339_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")
FORBIDDEN_SYNC_HEALTH_NAMES = {
    "period_start",
    "periodStart",
    "flow",
    "symptom",
    "pregnancy_status",
    "pregnancyStatus",
    "sexualActivity",
    "fertility",
    "medication",
    "mood",
    "note",
    "prediction",
}


def _read(name: str) -> dict:
    path = SCHEMA_DIR / name
    assert path.exists(), f"missing canonical schema: {path}"
    return json.loads(path.read_text(encoding="utf-8"))


def test_all_canonical_schema_documents_exist_and_use_json_schema_2020_12() -> None:
    for name in sorted(SCHEMAS):
        schema = _read(name)
        assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
        assert schema["$id"].startswith("https://schemas.sreadya.local/v1/")
        assert schema["type"] == "object"
        assert schema.get("additionalProperties") is False
        assert schema.get("required")
        assert schema.get("properties")


def test_period_and_observation_semantics_match_mobile_enums() -> None:
    period = _read("period-episode.schema.json")
    observation = _read("health-observation.schema.json")

    assert period["properties"]["source"]["enum"] == ["app", "healthKit", "healthConnect", "cycleVault"]
    assert observation["properties"]["flowLevel"]["enum"] == ["spotting", "light", "medium", "heavy"]
    assert observation["properties"]["severity"]["enum"] == ["mild", "moderate", "severe"]
    kinds = set(observation["properties"]["kind"]["enum"])
    assert {"cramps", "mood", "basalBodyTemperature", "sexualActivity", "medication", "dailyNote"} <= kinds


def test_transport_timestamps_are_explicit_utc_rfc3339() -> None:
    synthetic = "2026-09-16T01:02:03Z"
    assert RFC3339_UTC.fullmatch(synthetic)
    for name in {"period-episode.schema.json", "health-observation.schema.json", "prediction.schema.json", "device-record.schema.json", "sync-envelope.schema.json"}:
        schema_text = json.dumps(_read(name), sort_keys=True)
        assert "date-time" in schema_text
        assert "UTC RFC3339" in schema_text


def test_sync_metadata_has_no_free_form_or_health_semantic_payload() -> None:
    schema = _read("sync-envelope.schema.json")
    props = schema["properties"]
    assert "ciphertext" in props
    assert "nonce" in props
    assert "health" not in props
    assert not (FORBIDDEN_SYNC_HEALTH_NAMES & set(props))
    assert props["ciphertext"]["type"] == "string"
    assert props["ciphertext"].get("contentEncoding") == "base64"


def test_terminology_freezes_cross_platform_canonical_meaning() -> None:
    assert TERMS.exists(), f"missing canonical terminology: {TERMS}"
    terms = json.loads(TERMS.read_text(encoding="utf-8"))
    required = {
        "periodEpisode",
        "flow",
        "observationKind",
        "lifeStage",
        "predictionConfidence",
        "reminderPrivacy",
        "accountFreeMode",
        "accountMode",
        "encryptedSync",
        "trustedDevice",
        "recoveryKey",
    }
    assert required <= set(terms["terms"])
    assert terms["version"] == 1
    for key in required:
        entry = terms["terms"][key]
        assert entry["label"].strip()
        assert entry["definition"].strip()
