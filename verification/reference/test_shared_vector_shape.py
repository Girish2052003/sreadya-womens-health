from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PREDICTION = ROOT / "shared" / "prediction" / "test-vectors" / "prediction-v1.json"
REMINDERS = ROOT / "shared" / "reminders" / "test-vectors" / "reminder-v1.json"
PREDICTION_SPEC = ROOT / "shared" / "prediction" / "specification" / "prediction-v1.md"
REMINDER_SPEC = ROOT / "shared" / "reminders" / "reminder-policy-v1.md"


def _read(path: Path) -> dict:
    assert path.exists(), f"missing shared conformance artifact: {path}"
    return json.loads(path.read_text(encoding="utf-8"))


def test_prediction_vectors_cover_required_boundary_classes() -> None:
    payload = _read(PREDICTION)
    assert payload["version"] == "prediction-v1"
    cases = payload["cases"]
    ids = {case["id"] for case in cases}
    required = {
        "regular-stable",
        "irregular-history",
        "insufficient-history",
        "interval-lower-bound-15",
        "interval-upper-bound-90",
        "outlier-exclusion",
        "corrected-history",
        "deleted-history",
        "leap-year",
        "timezone-safe-dates",
        "confidence-low-boundary",
        "confidence-medium-boundary",
        "confidence-high-boundary",
    }
    assert required <= ids
    assert all("input" in case and "expected" in case for case in cases)


def test_reminder_vectors_cover_delivery_policy_boundaries() -> None:
    payload = _read(REMINDERS)
    assert payload["version"] == "reminder-v1"
    ids = {case["id"] for case in payload["cases"]}
    required = {
        "offsets-7-3-1-expected-late",
        "quiet-hours",
        "year-boundary",
        "leap-day",
        "past-suppression",
        "dst-wall-clock",
        "timezone-wall-clock",
        "prediction-change",
    }
    assert required <= ids
    assert payload["notificationBodies"]


def test_specs_state_cross_platform_conformance_and_boundary_ownership() -> None:
    assert PREDICTION_SPEC.exists()
    assert REMINDER_SPEC.exists()
    prediction = PREDICTION_SPEC.read_text(encoding="utf-8")
    reminder = REMINDER_SPEC.read_text(encoding="utf-8")
    assert "prediction-v1" in prediction
    assert "15" in prediction and "90" in prediction
    assert "same golden vectors" in prediction
    assert "local wall-clock" in reminder
    assert "time zone" in reminder.lower()
    assert "adapter" in reminder.lower()
