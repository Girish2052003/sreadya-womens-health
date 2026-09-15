from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_master_plan_traceability_covers_all_22_capability_families():
    verifier = read("tool/verify_v1_traceability.py")
    for section in range(1, 23):
        assert f'"4.{section}"' in verifier
    assert "implementation" in verifier
    assert "evidence" in verifier
    assert "Sreva Master Product Specification v1.0" in verifier
    assert "22/22 worldwide v1.0 capability families traced" in verifier


def test_release_backlog_scan_is_fail_closed():
    scanner = read("tool/release_backlog_scan.py")
    for marker in ("TODO", "FIXME", "HACK", "XXX", "coming soon", "placeholder"):
        assert marker in scanner
    assert "lib" in scanner
    assert "platform_templates" in scanner
    assert "tool" in scanner
    assert "Release backlog scan passed" in scanner


def test_ci_and_production_run_formal_closure_gates():
    ci = read(".github/workflows/ci.yml")
    production = read(".github/workflows/android-production.yml")
    for workflow in (ci, production):
        assert "tool/verify_v1_traceability.py" in workflow
        assert "tool/release_backlog_scan.py" in workflow


def test_regulatory_firewall_is_machine_checked():
    verifier = read("tool/verify_v1_traceability.py")
    assert "diagnose" in verifier.lower()
    assert "contraceptive effectiveness" in verifier.lower()
    assert "forbidden_claims" in verifier
