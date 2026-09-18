from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKENS = ROOT / "shared" / "design-tokens" / "tokens.v1.json"
PRIVACY = ROOT / "shared" / "privacy" / "privacy-laws.v1.json"
REGULATORY = ROOT / "shared" / "regulatory" / "product-boundary.v1.json"

RAW_COLOUR = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\(", re.IGNORECASE)


def _read(path: Path) -> dict:
    assert path.exists(), f"missing shared policy contract: {path}"
    return json.loads(path.read_text(encoding="utf-8"))


def test_design_tokens_define_approved_symbolic_roles_without_freezing_raw_colours() -> None:
    payload = _read(TOKENS)
    assert payload["version"] == 1
    roles = {entry["name"] for entry in payload["colorRoles"]}
    assert {
        "sreadya-crimson",
        "sreadya-rose",
        "sreadya-pink",
        "sreadya-blush",
        "sreadya-pearl",
        "sreadya-ink",
        "sreadya-muted",
        "success",
        "warning",
        "danger",
        "info",
    } <= roles
    assert not RAW_COLOUR.search(json.dumps(payload["colorRoles"], sort_keys=True))
    assert all(
        entry["review"] == "pending_contrast_review"
        for entry in payload["colorRoles"]
    )
    assert payload["accessibility"]["contrastTarget"] == "WCAG_2_2_AA"
    assert payload["accessibility"]["colorOnlyStateAllowed"] is False

    assert {"space.xs", "space.sm", "space.md", "space.lg", "space.xl"} <= set(
        payload["spacing"]
    )
    assert {"radius.sm", "radius.md", "radius.lg", "radius.pill"} <= set(
        payload["radius"]
    )
    assert {
        "motion.instantMs",
        "motion.fastMs",
        "motion.standardMs",
        "motion.slowMs",
    } <= set(payload["motion"])
    assert payload["motion"]["reducedMotionPolicy"] == "remove_nonessential_motion"


def test_privacy_laws_freeze_required_c2_boundaries() -> None:
    payload = _read(PRIVACY)
    assert payload["version"] == 1
    rules = {rule["id"]: rule for rule in payload["rules"]}
    required = {
        "PRIV-LAW-001": "account_free_equality",
        "PRIV-LAW-002": "local_health_intelligence",
        "PRIV-LAW-003": "no_health_telemetry",
        "PRIV-LAW-004": "ciphertext_only_optional_sync",
        "PRIV-LAW-005": "vault_recovery_boundary",
        "PRIV-LAW-006": "explicit_partner_permissions",
        "PRIV-LAW-007": "explicit_health_platform_permissions",
    }
    assert set(required) <= set(rules)
    for rule_id, key in required.items():
        assert rules[rule_id]["key"] == key
        assert rules[rule_id]["normative"] is True
        assert rules[rule_id]["statement"].strip()

    sync = rules["PRIV-LAW-004"]
    assert sync["serverReadableHealthContent"] is False
    assert sync["optional"] is True

    recovery = rules["PRIV-LAW-005"]
    assert recovery["emailOrSmsAloneDecryptsOldVault"] is False
    assert set(recovery["authorizedRecoveryFactors"]) == {
        "trusted_device",
        "user_held_recovery_key",
    }

    assert rules["PRIV-LAW-006"]["grantModel"] == "opt_in_granular_revocable"
    assert rules["PRIV-LAW-007"]["permissionModel"] == "optional_granular_explicit"


def test_regulatory_boundary_forbids_unvalidated_medical_and_contraception_claims() -> None:
    payload = _read(REGULATORY)
    assert payload["version"] == 1
    rules = {rule["id"]: rule for rule in payload["rules"]}
    required = {
        "REG-BOUNDARY-001": "diagnosis",
        "REG-BOUNDARY-002": "treatment_recommendation",
        "REG-BOUNDARY-003": "certified_contraception_effectiveness",
        "REG-BOUNDARY-004": "disease_prediction",
        "REG-BOUNDARY-005": "clinical_fertility_guarantee",
    }
    assert set(required) <= set(rules)
    for rule_id, claim in required.items():
        assert rules[rule_id]["claim"] == claim
        assert rules[rule_id]["launchStatus"] == (
            "forbidden_without_separate_regulated_programme"
        )
        assert rules[rule_id]["affirmativeClaimAllowed"] is False

    assert payload["allowedInitialScope"] == [
        "cycle_and_menstrual_health_tracking",
        "wellness_observations",
        "reminders",
        "estimates_with_uncertainty",
        "personal_history",
    ]
