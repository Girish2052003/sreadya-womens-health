import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_DIR = ROOT / ".github" / "workflows"
CANONICAL_REPOSITORY = "Girish2052003/sreadya-womens-health"


def _text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_public_ci_keeps_verification_but_does_not_publish_installable_builds() -> None:
    ci = _text(WORKFLOW_DIR / "ci.yml")

    assert "flutter build appbundle --release" in ci
    assert "flutter build apk --release" in ci
    assert "flutter build ios --release --no-codesign" in ci
    assert "sreadya-security-evidence" in ci

    assert "sreadya-android-v1-ci-test-signed" not in ci
    assert "sreadya-android-family-preview-ci-test-signed" not in ci
    assert "sreadya-ios-unsigned-release" not in ci


def test_all_external_actions_are_immutable_sha_pinned() -> None:
    for workflow in WORKFLOW_DIR.glob("*.yml"):
        for line in _text(workflow).splitlines():
            stripped = line.strip()
            if not stripped.startswith("- uses:"):
                continue
            target = stripped.removeprefix("- uses:").strip()
            if target.startswith("./"):
                continue
            match = re.match(r"^[^@\s]+@([0-9a-f]{40})(?:\s+#.*)?$", target)
            assert match is not None, f"Unpinned action in {workflow.name}: {target}"


def test_manual_release_workflows_are_canonical_main_only_and_clean_up_keys() -> None:
    for name in ("android-production.yml", "android-family-preview.yml"):
        workflow = _text(WORKFLOW_DIR / name)
        assert "workflow_dispatch:" in workflow
        assert f"github.repository == '{CANONICAL_REPOSITORY}'" in workflow
        assert "github.ref == 'refs/heads/main'" in workflow
        assert "persist-credentials: false" in workflow
        assert "if: always()" in workflow
        assert 'rm -f "$SREADYA_ANDROID_KEYSTORE_PATH"' in workflow


def test_signed_release_payloads_are_encrypted_before_public_artifact_upload() -> None:
    expectations = {
        "android-production.yml": (
            "SREADYA_PRODUCTION_ARTIFACT_PASSWORD",
            "sreadya-android-1.0.0-production-encrypted",
            "sreadya-1.0.0+1-production-release.tar.gz.enc",
        ),
        "android-family-preview.yml": (
            "SREADYA_PREVIEW_ARTIFACT_PASSWORD",
            "sreadya-android-1.0.0-family-preview-encrypted",
            "sreadya-1.0.0+1-family-preview-release.tar.gz.enc",
        ),
    }

    for name, (secret_name, artifact_name, encrypted_name) in expectations.items():
        workflow = _text(WORKFLOW_DIR / name)
        assert secret_name in workflow
        assert "openssl enc -aes-256-cbc" in workflow
        assert "-pbkdf2" in workflow
        assert "-iter 200000" in workflow
        assert f"name: {artifact_name}" in workflow
        assert encrypted_name in workflow
        assert f"path: build/public-artifacts/{encrypted_name}" in workflow


def test_public_maintainer_security_posture_is_documented_and_linked() -> None:
    note = ROOT / "docs" / "security" / "PUBLIC_REPOSITORY_HARDENING.md"
    assert note.is_file()

    note_text = _text(note)
    readme = _text(ROOT / "README.md")
    security = _text(ROOT / "SECURITY.md")

    assert re.search(
        r"\*{0,2}Maintainer:\*{0,2}\s+Girish Nallan Chakravathy", note_text
    )
    assert "public repository" in note_text.lower()
    assert "ChatGPT" not in note_text
    assert "PUBLIC_REPOSITORY_HARDENING.md" in readme
    assert "PUBLIC_REPOSITORY_HARDENING.md" in security
