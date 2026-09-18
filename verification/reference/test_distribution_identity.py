import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY_DEDICATION_TOKEN = "Sreedevi"
PRODUCTION_APPLICATION_ID = "com.sreadya.health.sreadya"
PREVIEW_APPLICATION_ID = "com.sreadya.health.sreadya.preview"


def test_repository_dedication_is_provenance_only_not_runtime_copy() -> None:
    runtime_text = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in (ROOT / "lib").rglob("*.dart")
    )
    assert REPOSITORY_DEDICATION_TOKEN not in runtime_text

    # Preserve the repository-level dedication/provenance rather than deleting it.
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    master_spec = (
        ROOT / "docs/superpowers/specs/2026-09-15-sreadya-master-design.md"
    ).read_text(encoding="utf-8")
    assert REPOSITORY_DEDICATION_TOKEN in readme
    assert REPOSITORY_DEDICATION_TOKEN in master_spec


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
    assert "configure_platforms.py android" in workflow_text
    assert "configure_android_tests.py" in workflow_text

    # Production remains the frozen package used by the existing Play-ready path.
    assert "flutter create --platforms=android --org com.sreadya.health ." in production_text
    assert "configure_android_preview.py" not in production_text


def test_preview_config_changes_only_application_id(tmp_path, monkeypatch) -> None:
    module_path = ROOT / "tool/configure_android_preview.py"
    spec = importlib.util.spec_from_file_location("configure_android_preview", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    gradle = tmp_path / "build.gradle.kts"
    gradle.write_text(
        "android {\n"
        '    namespace = "com.sreadya.health.sreadya"\n'
        "    defaultConfig {\n"
        '        applicationId = "com.sreadya.health.sreadya"\n'
        "    }\n"
        "}\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(module, "GRADLE", gradle)

    module.configure()
    text = gradle.read_text(encoding="utf-8")

    assert 'namespace = "com.sreadya.health.sreadya"' in text
    assert f'applicationId = "{PREVIEW_APPLICATION_ID}"' in text
    assert f'applicationId = "{PRODUCTION_APPLICATION_ID}"' not in text
