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


def main() -> None:
    findings: list[str] = []
    marker_pattern = re.compile(
        r"(?:TODO|FIXME|HACK|XXX|coming\s+soon|placeholder)",
        flags=re.IGNORECASE,
    )

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
                if marker_pattern.search(line):
                    findings.append(f"{relative}:{number}: {line.strip()}")

    if findings:
        raise SystemExit(
            "Release backlog markers found in production source:\n" + "\n".join(findings)
        )

    print(
        "Release backlog scan passed: no TODO/FIXME/HACK/XXX/coming soon/placeholder markers."
    )


if __name__ == "__main__":
    main()
