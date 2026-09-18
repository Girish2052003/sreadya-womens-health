#!/usr/bin/env python3
"""Give Sreadya's family-preview build a distinct Android application ID.

This changes only the install/distribution identity. The Android namespace,
Kotlin package, native bridges, Health Connect integration, reminders, privacy
controls, encrypted vault, and every Sreadya feature remain the same as the
production build.
"""

from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GRADLE = ROOT / "android" / "app" / "build.gradle.kts"
PRODUCTION_APPLICATION_ID = "com.sreadya.health.sreadya"
PREVIEW_APPLICATION_ID = "com.sreadya.health.sreadya.preview"
PRODUCTION_NAMESPACE = "com.sreadya.health.sreadya"


def require_file(path: Path) -> None:
    if not path.is_file():
        raise SystemExit(f"Missing generated Android Gradle file: {path}")


def configure() -> None:
    require_file(GRADLE)
    text = GRADLE.read_text(encoding="utf-8")
    production_line = f'applicationId = "{PRODUCTION_APPLICATION_ID}"'
    preview_line = f'applicationId = "{PREVIEW_APPLICATION_ID}"'

    if preview_line not in text:
        if production_line not in text:
            raise SystemExit(
                "Unable to locate Sreadya production applicationId in generated Gradle file"
            )
        text = text.replace(production_line, preview_line, 1)

    GRADLE.write_text(text, encoding="utf-8")
    check()


def check() -> None:
    require_file(GRADLE)
    text = GRADLE.read_text(encoding="utf-8")
    preview_line = f'applicationId = "{PREVIEW_APPLICATION_ID}"'
    production_line = f'applicationId = "{PRODUCTION_APPLICATION_ID}"'
    namespace_line = f'namespace = "{PRODUCTION_NAMESPACE}"'

    if preview_line not in text:
        raise SystemExit("Sreadya family-preview applicationId is not configured")
    if production_line in text:
        raise SystemExit("Family-preview build still carries the production applicationId")
    if namespace_line not in text:
        raise SystemExit(
            "Sreadya Android namespace changed unexpectedly; native identity must remain intact"
        )

    print(
        "Sreadya Android family preview identity: OK "
        f"({PREVIEW_APPLICATION_ID}; namespace {PRODUCTION_NAMESPACE})"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        check()
    else:
        configure()


if __name__ == "__main__":
    main()
