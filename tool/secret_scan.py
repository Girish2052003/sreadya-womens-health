#!/usr/bin/env python3
"""High-signal repository secret scan for Sreva release gates.

This is intentionally conservative: it looks for credential formats that must
never appear in source control while avoiding generic words such as "password"
that are legitimately present in documentation and environment-variable names.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PATTERNS = {
    "private key material": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    "GitHub classic token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    "GitHub fine-grained token": re.compile(r"\bgithub_pat_[A-Za-z0-9_]{40,}\b"),
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "Google API key": re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
    "Slack token": re.compile(r"\bxox[baprs]-[0-9A-Za-z-]{20,}\b"),
    "OpenAI-style API key": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b"),
}

TEXT_EXTENSIONS = {
    ".dart", ".kt", ".kts", ".swift", ".py", ".yaml", ".yml", ".json",
    ".md", ".html", ".txt", ".arb", ".xml", ".plist", ".properties",
    ".gradle", ".sh", ".ps1", ".toml",
}


def tracked_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
    )
    return [ROOT / item.decode("utf-8") for item in result.stdout.split(b"\0") if item]


def main() -> None:
    findings: list[str] = []
    for path in tracked_files():
        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for label, pattern in PATTERNS.items():
            for match in pattern.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                findings.append(f"{path.relative_to(ROOT)}:{line}: {label}")

    if findings:
        print("Sreva secret scan: FAIL")
        for finding in findings:
            print(f"  {finding}")
        raise SystemExit(1)
    print("Sreva secret scan: PASS — no high-signal committed credentials found")


if __name__ == "__main__":
    main()
