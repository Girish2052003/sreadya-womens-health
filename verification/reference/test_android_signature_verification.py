from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_signature_verifier_matches_expected_signer_identity():
    verifier = read("tool/verify_android_signatures.py")
    assert "keytool" in verifier
    assert "-printcert" in verifier
    assert "-jarfile" in verifier
    assert "apksigner" in verifier
    assert "SHA256" in verifier
    assert "expected signer" in verifier.lower()
    assert "AAB signer fingerprint mismatch" in verifier
    assert "APK signer fingerprint mismatch" in verifier


def test_ci_and_production_use_strong_signature_verifier_not_strict_pkix_chain():
    ci = read(".github/workflows/ci.yml")
    production = read(".github/workflows/android-production.yml")
    for workflow in (ci, production):
        assert "tool/verify_android_signatures.py" in workflow
        assert "jarsigner -verify -strict" not in workflow
        assert "SREVA_ANDROID_KEYSTORE_PATH" in workflow
        assert "SREVA_ANDROID_KEY_ALIAS" in workflow
        assert "SREVA_ANDROID_KEYSTORE_PASSWORD" in workflow
