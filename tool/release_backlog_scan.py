#!/usr/bin/env python3
"""Reject known release-backlog markers from production source."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN_ROOTS = ("lib", "platform_templates", "tool", ".github/workflows")
MARKERS = ("TODO", "FIXME", "HACK", "XXX", "coming soon", "placeholder")
TEXT_SUFFIXES = {".dart", ".kt", ".swift", ".py", ".yml", ".yaml"}
EXCLUDED = {
    "tool/release_backlog_scan.py",  # contains the marker vocabulary by design
}
MARKER_PATTERN = re.compile(
    r"\b(?:TODO|FIXME|HACK|XXX)\b|\bcoming\s+soon\b|\bplaceholder\b",
    flags=re.IGNORECASE,
)


def contains_backlog_marker(line: str) -> bool:
    return MARKER_PATTERN.search(line) is not None


def annotation_escape(value: str) -> str:
    return (
        value.replace("%", "%25")
        .replace("\r", "%0D")
        .replace("\n", "%0A")
    )


def main() -> None:
    findings: list[tuple[str, int, str]] = []

    for root_name in SCAN_ROOTS:
        root = ROOT / root_name
        if not root.exists():
            raise SystemExit(f"Release source root is missing: {root_name}")
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
                continue
            relative = path.relative_to(ROOT).as_posix()
            if relative in EXCLUDED:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for number, line in enumerate(text.splitlines(), start=1):
                if contains_backlog_marker(line):
                    findings.append((relative, number, line.strip()))

    if findings:
        rendered = []
        for relative, number, line in findings:
            rendered.append(f"{relative}:{number}: {line}")
            print(
                f"::error file={relative},line={number},title=Release backlog marker::"
                + annotation_escape(line)
            )
        raise SystemExit(
            "Release backlog markers found in production source:\n"
            + "\n".join(rendered)
        )

    print(
        "Release backlog scan passed: no TODO/FIXME/HACK/XXX/coming soon/placeholder markers."
    )


if __name__ == "__main__":
    main()
