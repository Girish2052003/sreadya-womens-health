from __future__ import annotations

from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
LEGACY = "sre" + "va"
LEGACY_HEX = (LEGACY.encode().hex(), LEGACY.upper().encode().hex().lower())
MOTTO = "Prakritim Svam Avashtabhya."
HOMEPAGE = "web/src/app/page.tsx"


def tracked_files() -> list[str]:
    output = subprocess.check_output(
        ["git", "ls-files"],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )
    return [line for line in output.splitlines() if line]


def readable_text(relative_path: str) -> str:
    data = (ROOT / relative_path).read_bytes()
    if b"\x00" in data:
        return ""
    return data.decode("utf-8", errors="ignore")


def test_legacy_brand_is_absent_from_all_tracked_paths() -> None:
    offenders = sorted(path for path in tracked_files() if LEGACY in path.lower())
    assert offenders == [], f"legacy brand remains in tracked paths: {offenders}"


def test_legacy_brand_is_absent_from_all_tracked_text() -> None:
    offenders: list[str] = []
    for path in tracked_files():
        text = readable_text(path)
        if LEGACY in text.lower():
            offenders.append(path)
    assert offenders == [], f"legacy brand remains in tracked content: {sorted(offenders)}"


def test_legacy_brand_is_absent_from_hex_encoded_protocol_material() -> None:
    offenders: list[str] = []
    for path in tracked_files():
        text = readable_text(path).lower()
        if any(encoded in text for encoded in LEGACY_HEX):
            offenders.append(path)
    assert offenders == [], f"legacy brand remains hex-encoded in tracked content: {sorted(offenders)}"


def test_sanskrit_motto_exists_once_and_only_on_homepage() -> None:
    hits: list[tuple[str, int]] = []
    for path in tracked_files():
        count = readable_text(path).count(MOTTO)
        if count:
            hits.append((path, count))
    assert hits == [(HOMEPAGE, 1)], f"motto placement drifted: {hits}"


def test_homepage_brand_lockup_is_exact() -> None:
    homepage = readable_text(HOMEPAGE)
    assert '<h1 id="sreadya-title">SREADYA</h1>' in homepage
    assert '<p className="hero__motto">Prakritim Svam Avashtabhya.</p>' in homepage
