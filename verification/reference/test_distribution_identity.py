from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRIVATE_DEDICATION_TOKEN = "Sreedevi"
PRODUCTION_APPLICATION_ID = "com.sreva.health.sreva"
PREVIEW_APPLICATION_ID = "com.sreva.health.sreva.preview"


def test_private_dedication_is_repository_only_not_runtime_copy() -> None:
    runtime_text = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in (ROOT / "lib").rglob("*.dart")
    )
    assert PRIVATE_DEDICATION_TOKEN not in runtime_text

    # Preserve the repository-level dedication/provenance rather than deleting it.
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    master_spec = (
        ROOT / "docs/superpowers/specs/2026-09-15-sreva-master-design.md"
    ).read_text(encoding="utf-8")
    assert PRIVATE_DEDICATION_TOKEN in readme
    assert PRIVATE_DEDICATION_TOKEN in master_spec


def test_family_preview_has_distinct_package_without_changing_production_identity() -> None:
    preview_config = ROOT / "tool/configure_android_preview.py"
    preview_workflow = ROOT / ".github/workflows/android-family-preview.yml"
    production_workflow = ROOT / ".github/workflows/android-production.yml"

    assert preview_config.is_file()
    assert preview_workflow.is_file()

    config_text = preview_config.read_text(encoding="utf-8")
    workflow_text = preview_workflow.read_text(encoding="utf-8")
    production_text = production_workflow.read_text(encoding="utf-8")

    assert PRODUCTION_APPLICATION_ID in config_text
    assert PREVIEW_APPLICATION_ID in config_text
    assert "configure_android_preview.py" in workflow_text
    assert PREVIEW_APPLICATION_ID in workflow_text

    # Production remains the frozen package used by the existing Play-ready path.
    assert "flutter create --platforms=android --org com.sreva.health ." in production_text
    assert "configure_android_preview.py" not in production_text
