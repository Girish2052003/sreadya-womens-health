#!/usr/bin/env python3
"""Harden the generated Android host for Google Play release builds.

The generated Flutter template is convenient for development, but Sreadya must
never rely on the template's debug signing configuration for a production
release. This script pins the Play target API and replaces debug release signing
with an environment-driven upload-key configuration. Without signing secrets it
produces an unsigned release suitable for CI compilation checks; with
--require-signing it fails closed unless every production signing input exists.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GRADLE = ROOT / "android" / "app" / "build.gradle.kts"
TARGET_API = 36
SIGNING_ENV = (
    "SREADYA_ANDROID_KEYSTORE_PATH",
    "SREADYA_ANDROID_KEYSTORE_PASSWORD",
    "SREADYA_ANDROID_KEY_ALIAS",
    "SREADYA_ANDROID_KEY_PASSWORD",
)

SIGNING_PREAMBLE = r'''
val sreadyaKeystorePath = System.getenv("SREADYA_ANDROID_KEYSTORE_PATH")
val sreadyaKeystorePassword = System.getenv("SREADYA_ANDROID_KEYSTORE_PASSWORD")
val sreadyaKeyAlias = System.getenv("SREADYA_ANDROID_KEY_ALIAS")
val sreadyaKeyPassword = System.getenv("SREADYA_ANDROID_KEY_PASSWORD")
val sreadyaSigningValues = listOf(
    sreadyaKeystorePath,
    sreadyaKeystorePassword,
    sreadyaKeyAlias,
    sreadyaKeyPassword,
)
val sreadyaSigningConfigured = sreadyaSigningValues.all { !it.isNullOrBlank() }
val sreadyaSigningPartiallyConfigured =
    sreadyaSigningValues.any { !it.isNullOrBlank() } && !sreadyaSigningConfigured
if (sreadyaSigningPartiallyConfigured) {
    throw org.gradle.api.GradleException(
        "Sreadya production signing is partially configured. Provide all SREADYA_ANDROID_* signing variables."
    )
}

'''

SIGNING_CONFIG = r'''
    signingConfigs {
        if (sreadyaSigningConfigured) {
            create("sreadyaRelease") {
                storeFile = file(sreadyaKeystorePath!!)
                storePassword = sreadyaKeystorePassword
                keyAlias = sreadyaKeyAlias
                keyPassword = sreadyaKeyPassword
            }
        }
    }

'''

RELEASE_SIGNING = (
    'signingConfig = if (sreadyaSigningConfigured) '
    'signingConfigs.getByName("sreadyaRelease") else null'
)


def require_file(path: Path) -> None:
    if not path.exists():
        raise SystemExit(f"Missing generated Android Gradle file: {path}")


def configure(require_signing: bool) -> None:
    require_file(GRADLE)
    text = GRADLE.read_text(encoding="utf-8")

    if "val sreadyaKeystorePath =" not in text:
        marker = "android {"
        if marker not in text:
            raise SystemExit("Unable to locate Android block in generated Gradle file")
        text = text.replace(marker, SIGNING_PREAMBLE + marker, 1)

    if "targetSdk = flutter.targetSdkVersion" in text:
        text = text.replace(
            "targetSdk = flutter.targetSdkVersion",
            f"targetSdk = {TARGET_API}",
        )
    elif f"targetSdk = {TARGET_API}" not in text:
        raise SystemExit("Unable to pin Android targetSdk to API 36")

    if "compileSdk = flutter.compileSdkVersion" in text:
        text = text.replace(
            "compileSdk = flutter.compileSdkVersion",
            f"compileSdk = {TARGET_API}",
        )
    elif f"compileSdk = {TARGET_API}" not in text:
        raise SystemExit("Unable to pin Android compileSdk to API 36")

    if "create(\"sreadyaRelease\")" not in text:
        marker = "    buildTypes {"
        if marker not in text:
            raise SystemExit("Unable to locate Android buildTypes block")
        text = text.replace(marker, SIGNING_CONFIG + marker, 1)

    debug_line = 'signingConfig = signingConfigs.getByName("debug")'
    if debug_line in text:
        text = text.replace(debug_line, RELEASE_SIGNING)
    elif RELEASE_SIGNING not in text:
        raise SystemExit("Unable to replace generated debug release signing")

    GRADLE.write_text(text, encoding="utf-8")
    check(require_signing=require_signing)


def check(require_signing: bool) -> None:
    require_file(GRADLE)
    text = GRADLE.read_text(encoding="utf-8")
    required_markers = (
        f"targetSdk = {TARGET_API}",
        f"compileSdk = {TARGET_API}",
        "sreadyaSigningConfigured",
        'create("sreadyaRelease")',
        RELEASE_SIGNING,
    )
    missing = [marker for marker in required_markers if marker not in text]
    if missing:
        raise SystemExit(f"Android release configuration incomplete: {missing}")
    if 'signingConfig = signingConfigs.getByName("debug")' in text:
        raise SystemExit("Production release still references the debug signing key")

    values = {name: os.environ.get(name, "") for name in SIGNING_ENV}
    provided = [name for name, value in values.items() if value]
    if provided and len(provided) != len(SIGNING_ENV):
        missing_env = [name for name, value in values.items() if not value]
        raise SystemExit(
            "Partial Android signing environment; missing: " + ", ".join(missing_env)
        )
    if require_signing:
        missing_env = [name for name, value in values.items() if not value]
        if missing_env:
            raise SystemExit(
                "Production signing required; missing: " + ", ".join(missing_env)
            )
        keystore = Path(values["SREADYA_ANDROID_KEYSTORE_PATH"])
        if not keystore.is_file():
            raise SystemExit(f"Production keystore does not exist: {keystore}")
        print("Android production signing: configured")
    else:
        print(
            "Android release configuration: OK "
            f"(target API {TARGET_API}; debug signing forbidden)"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--require-signing", action="store_true")
    args = parser.parse_args()
    if args.check:
        check(require_signing=args.require_signing)
    else:
        configure(require_signing=args.require_signing)


if __name__ == "__main__":
    main()
