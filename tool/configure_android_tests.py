#!/usr/bin/env python3
"""Install and validate Sreadya's Android native reminder regression tests."""

from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(path: Path, description: str) -> None:
    if not path.exists():
        raise SystemExit(f"Missing {description}: {path}")


def configure() -> None:
    gradle = ROOT / "android" / "app" / "build.gradle.kts"
    properties = ROOT / "android" / "gradle.properties"
    require(gradle, "generated Android Gradle file")
    require(properties, "generated Android Gradle properties")
    text = gradle.read_text(encoding="utf-8")
    dependency = 'testImplementation("junit:junit:4.13.2")'
    if dependency not in text:
        marker = 'implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")'
        if marker not in text:
            raise SystemExit("Sreadya Android dependencies were not configured first")
        text = text.replace(marker, marker + "\n    " + dependency)
        gradle.write_text(text, encoding="utf-8")

    # AGP 9 enables unit tests only for the tested build type by default,
    # which removes testReleaseUnitTest. Sreadya intentionally verifies the
    # production release variant, so restore unit-test components for all
    # build types using AGP's documented compatibility property.
    unit_test_property = "android.onlyEnableUnitTestForTheTestedBuildType=false"
    properties_text = properties.read_text(encoding="utf-8")
    if unit_test_property not in properties_text.splitlines():
        properties.write_text(
            properties_text.rstrip() + "\n" + unit_test_property + "\n",
            encoding="utf-8",
        )

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
        / "sreadya"
        / "health"
        / "sreadya"
        / "ReminderWallClockTest.kt"
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
    check()


def check() -> None:
    gradle = ROOT / "android" / "app" / "build.gradle.kts"
    properties = ROOT / "android" / "gradle.properties"
    test = (
        ROOT
        / "android"
        / "app"
        / "src"
        / "test"
        / "kotlin"
        / "com"
        / "sreadya"
        / "health"
        / "sreadya"
        / "ReminderWallClockTest.kt"
    )
    require(gradle, "configured Android Gradle file")
    require(properties, "configured Android Gradle properties")
    require(test, "materialized Android reminder test")
    gradle_text = gradle.read_text(encoding="utf-8")
    properties_text = properties.read_text(encoding="utf-8")
    test_text = test.read_text(encoding="utf-8")
    if 'testImplementation("junit:junit:4.13.2")' not in gradle_text:
        raise SystemExit("JUnit dependency is missing")
    if "android.onlyEnableUnitTestForTheTestedBuildType=false" not in properties_text.splitlines():
        raise SystemExit("AGP 9 release unit-test compatibility property is missing")
    for marker in (
        "dailyReminderKeepsEightAmAcrossSpringDstChange",
        "dailyReminderKeepsEightAmAcrossAutumnDstChange",
        "oneShotReminderPreservesStoredLocalCalendarFields",
        "dailyReminderKeepsEightAmInEveryAvailableTimeZone",
        "oneShotReminderKeepsWallClockAfterTimeZoneChange",
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
