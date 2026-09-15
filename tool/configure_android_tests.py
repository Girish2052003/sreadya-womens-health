#!/usr/bin/env python3
"""Install and validate Sreva's Android native reminder regression tests."""

from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(path: Path, description: str) -> None:
    if not path.exists():
        raise SystemExit(f"Missing {description}: {path}")


def configure() -> None:
    gradle = ROOT / "android" / "app" / "build.gradle.kts"
    require(gradle, "generated Android Gradle file")
    text = gradle.read_text(encoding="utf-8")
    dependency = 'testImplementation("junit:junit:4.13.2")'
    if dependency not in text:
        marker = 'implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")'
        if marker not in text:
            raise SystemExit("Sreva Android dependencies were not configured first")
        text = text.replace(marker, marker + "\n    " + dependency)
        gradle.write_text(text, encoding="utf-8")

    source = ROOT / "platform_templates" / "android" / "ReminderWallClockTest.kt"
    require(source, "Android reminder native test template")
    target = (
        ROOT
        / "android"
        / "app"
        / "src"
        / "test"
        / "kotlin"
        / "com"
        / "sreva"
        / "health"
        / "sreva"
        / "ReminderWallClockTest.kt"
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
    check()


def check() -> None:
    gradle = ROOT / "android" / "app" / "build.gradle.kts"
    test = (
        ROOT
        / "android"
        / "app"
        / "src"
        / "test"
        / "kotlin"
        / "com"
        / "sreva"
        / "health"
        / "sreva"
        / "ReminderWallClockTest.kt"
    )
    require(gradle, "configured Android Gradle file")
    require(test, "materialized Android reminder test")
    gradle_text = gradle.read_text(encoding="utf-8")
    test_text = test.read_text(encoding="utf-8")
    if 'testImplementation("junit:junit:4.13.2")' not in gradle_text:
        raise SystemExit("JUnit dependency is missing")
    for marker in (
        "dailyReminderKeepsEightAmAcrossSpringDstChange",
        "dailyReminderKeepsEightAmAcrossAutumnDstChange",
        "oneShotReminderPreservesStoredLocalCalendarFields",
    ):
        if marker not in test_text:
            raise SystemExit(f"Android reminder test marker missing: {marker}")
    print("Android native reminder tests: configured")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    check() if args.check else configure()


if __name__ == "__main__":
    main()
