#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def measure(root: Path) -> dict[str, int]:
    files = [path for path in root.rglob("*") if path.is_file()]
    html = [path for path in files if path.suffix.lower() == ".html"]
    public_html = [
        path for path in html
        if not path.relative_to(root).as_posix().startswith("app/")
    ]
    app_html = [
        path for path in html
        if path.relative_to(root).as_posix().startswith("app/")
    ]
    static_assets = [path for path in files if path.suffix.lower() != ".html"]

    def largest(paths: list[Path]) -> int:
        return max((path.stat().st_size for path in paths), default=0)

    return {
        "total_static_bytes": sum(path.stat().st_size for path in files),
        "public_html_bytes": largest(public_html),
        "app_shell_html_bytes": largest(app_html),
        "largest_static_asset_bytes": largest(static_assets),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify deterministic Sreadya Web static performance budgets.")
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    args = parser.parse_args()

    if not args.root.is_dir():
        raise SystemExit(f"performance budget root does not exist: {args.root}")
    config = json.loads(args.config.read_text(encoding="utf-8"))
    if config.get("version") != 1 or not isinstance(config.get("budgets"), dict):
        raise SystemExit("invalid performance budget config")

    budgets: dict[str, int] = config["budgets"]
    metrics = measure(args.root)
    failed = False
    for key, measured in metrics.items():
        budget = budgets.get(key)
        if not isinstance(budget, int) or budget <= 0:
            raise SystemExit(f"missing positive budget for {key}")
        print(f"{key}: measured={measured} budget={budget}")
        if measured > budget:
            print(f"PERFORMANCE_BUDGET_FAIL {key}: {measured} > {budget}")
            failed = True

    if failed:
        return 1
    print("Task 27 Web performance budget: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
