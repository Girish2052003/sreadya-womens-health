import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def scanner():
    module = runpy.run_path(str(ROOT / "tool/release_backlog_scan.py"))
    return module["contains_backlog_marker"]


def test_backlog_scanner_does_not_confuse_to_double_with_todo():
    contains_backlog_marker = scanner()
    assert not contains_backlog_marker("final value = count.toDouble();")
    assert not contains_backlog_marker("numericValue: value.toDouble(),")


def test_backlog_scanner_rejects_real_release_markers():
    contains_backlog_marker = scanner()
    for line in (
        "// TODO: implement production behavior",
        "# FIXME: release blocker",
        "// HACK remove before production",
        "// XXX release debt",
        "Text('Coming soon')",
        "const placeholder = true;",
    ):
        assert contains_backlog_marker(line), line
