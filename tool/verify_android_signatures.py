#!/usr/bin/env python3
"""Verify Android release artifacts are intact and signed by the expected key."""

from __future__ import annotations

import argparse
import os
import re
import subprocess
from pathlib import Path

HEX64 = re.compile(r"(?i)(?:[0-9a-f]{2}:){31}[0-9a-f]{2}|[0-9a-f]{64}")


def run(command: list[str]) -> str:
    result = subprocess.run(
        command,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit(
            f"Command failed ({result.returncode}): {command[0]}\n{result.stdout}"
        )
    return result.stdout


def fingerprint(text: str) -> str:
    match = HEX64.search(text)
    if match is None:
        raise SystemExit("SHA256 signer fingerprint was not present in verifier output.")
    return match.group(0).replace(":", "").upper()


def apksigner_path() -> str:
    android_home = Path(os.environ.get("ANDROID_HOME", ""))
    build_tools = android_home / "build-tools"
    if not build_tools.is_dir():
        raise SystemExit("ANDROID_HOME build-tools directory is unavailable.")

    def version_key(path: Path) -> tuple[int, ...]:
        parts = re.findall(r"\d+", path.name)
        return tuple(int(value) for value in parts)

    candidates = sorted(
        (path / "apksigner" for path in build_tools.iterdir() if (path / "apksigner").is_file()),
        key=lambda path: version_key(path.parent),
    )
    if not candidates:
        raise SystemExit("apksigner was not found under ANDROID_HOME/build-tools.")
    return str(candidates[-1])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--aab", required=True)
    parser.add_argument("--apk", required=True)
    args = parser.parse_args()

    aab = Path(args.aab)
    apk = Path(args.apk)
    for artifact in (aab, apk):
        if not artifact.is_file() or artifact.stat().st_size == 0:
            raise SystemExit(f"Android release artifact is missing or empty: {artifact}")

    keystore = os.environ.get("SREADYA_ANDROID_KEYSTORE_PATH", "")
    password = os.environ.get("SREADYA_ANDROID_KEYSTORE_PASSWORD", "")
    alias = os.environ.get("SREADYA_ANDROID_KEY_ALIAS", "")
    if not keystore or not password or not alias:
        raise SystemExit(
            "Expected signer configuration is incomplete: set "
            "SREADYA_ANDROID_KEYSTORE_PATH, SREADYA_ANDROID_KEYSTORE_PASSWORD, "
            "and SREADYA_ANDROID_KEY_ALIAS."
        )

    expected_output = run(
        [
            "keytool",
            "-list",
            "-v",
            "-keystore",
            keystore,
            "-storepass",
            password,
            "-alias",
            alias,
        ]
    )
    expected = fingerprint(expected_output)

    # AAB is a signed JAR. Verify its cryptographic integrity without asking
    # Java to trust the CI/upload certificate as a public PKIX CA certificate.
    run(["jarsigner", "-verify", "-verbose", "-certs", str(aab)])
    aab_cert = run(["keytool", "-printcert", "-jarfile", str(aab)])
    aab_fingerprint = fingerprint(aab_cert)
    if aab_fingerprint != expected:
        raise SystemExit(
            "AAB signer fingerprint mismatch: artifact is not signed by the expected signer."
        )

    signer = apksigner_path()
    apk_output = run([signer, "verify", "--verbose", "--print-certs", str(apk)])
    apk_fingerprint = fingerprint(apk_output)
    if apk_fingerprint != expected:
        raise SystemExit(
            "APK signer fingerprint mismatch: artifact is not signed by the expected signer."
        )

    print(f"Android signatures verified with expected signer SHA256={expected}")


if __name__ == "__main__":
    main()
