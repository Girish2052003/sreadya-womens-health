#!/usr/bin/env python3
"""Generate a compact CycloneDX 1.5 SBOM from `dart pub deps --json` output."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    data = json.loads(args.input.read_text(encoding="utf-8"))
    packages = data.get("packages", [])
    components = []
    dependencies = []
    refs: dict[str, str] = {}

    for package in packages:
        name = str(package.get("name", "unknown"))
        version = str(package.get("version", "0"))
        ref = f"pkg:pub/{name}@{version}"
        refs[name] = ref
        components.append(
            {
                "type": "library",
                "bom-ref": ref,
                "name": name,
                "version": version,
                "purl": ref,
                "properties": [
                    {"name": "sreadya:dependency-kind", "value": str(package.get("kind", "unknown"))},
                    {"name": "sreadya:dependency-source", "value": str(package.get("source", "unknown"))},
                ],
            }
        )

    for package in packages:
        name = str(package.get("name", "unknown"))
        ref = refs.get(name)
        if ref is None:
            continue
        depends_on = [refs[d] for d in package.get("dependencies", []) if d in refs]
        dependencies.append({"ref": ref, "dependsOn": sorted(depends_on)})

    root_name = str(data.get("root", "sreadya"))
    root_ref = refs.get(root_name, f"pkg:pub/{root_name}")
    bom = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": "urn:uuid:sreadya-worldwide-v1",
        "version": 1,
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "component": {"type": "application", "bom-ref": root_ref, "name": root_name},
            "tools": {"components": [{"type": "application", "name": "Sreadya SBOM generator", "version": "1"}]},
        },
        "components": sorted(components, key=lambda c: c["name"]),
        "dependencies": sorted(dependencies, key=lambda d: d["ref"]),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(bom, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
