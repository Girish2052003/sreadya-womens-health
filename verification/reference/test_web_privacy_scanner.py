import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCAN_PATH = ROOT / 'tool' / 'privacy_scan.py'
SPEC = importlib.util.spec_from_file_location('sreva_privacy_scan', SCAN_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def test_local_callback_name_is_not_treated_as_a_logging_api():
    assert MODULE.FORBIDDEN_LOG.search("onLog(kind, rawNote.length > 0 ? rawNote : undefined);") is None


def test_real_web_console_logging_of_health_payload_is_rejected():
    assert MODULE.FORBIDDEN_LOG.search("console.log(periodStart);") is not None


def test_health_payload_near_web_transport_or_cache_api_is_rejected():
    assert MODULE.WEB_TRANSPORT.search("fetch('/collect?period=' + periodStart)") is not None
    assert MODULE.WEB_TRANSPORT.search("new URLSearchParams({ symptom: symptomValue })") is not None
    assert MODULE.WEB_TRANSPORT.search("caches.open(periodCacheName)") is not None
