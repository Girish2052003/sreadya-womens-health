from datetime import date

from sreva_reference import predict_cycle, parse_local_intent, build_diagnostic_report


def test_regular_cycle_prediction():
    starts = [
        date(2026,1,1), date(2026,1,29), date(2026,2,26), date(2026,3,26),
        date(2026,4,23), date(2026,5,21), date(2026,6,18), date(2026,7,16),
    ]
    p = predict_cycle(starts)
    assert p['estimated_cycle_length_days'] == 28
    assert p['most_likely_date'] == date(2026,8,13)
    assert p['window_start'] == date(2026,8,11)
    assert p['window_end'] == date(2026,8,15)
    assert p['confidence'] == 'high'


def test_invalid_interval_is_excluded():
    starts = [date(2026,1,1), date(2026,1,29), date(2026,1,30), date(2026,2,27), date(2026,3,27)]
    p = predict_cycle(starts)
    assert 1 in p['excluded_intervals']
    assert all(15 <= x <= 90 for x in p['valid_intervals'])


def test_local_intent_period_yesterday():
    result = parse_local_intent('My period started yesterday', date(2026,9,15))
    assert result['intent'] == 'periodStarted'
    assert result['date'] == date(2026,9,14)
    assert result['requires_confirmation'] is True


def test_diagnostics_never_contains_health_payload():
    report = build_diagnostic_report(
        app_version='1.0.0', platform='iOS', os_version='26', database_schema=1,
        prediction_engine='prediction-v1', reminder_engine='reminder-v1',
        health_adapter='health-v1', notification_permission='granted',
        next_reminder_state='scheduled', last_migration_state='passed',
        database_integrity='passed'
    )
    lower = report.lower()
    for forbidden in ['period=', 'symptom=', 'sexual=', 'pregnancy=', 'temperature=', 'medication=']:
        assert forbidden not in lower


def test_private_period_reminder_is_three_days_before_prediction():
    from sreva_reference import plan_period_reminder
    from datetime import date, time

    plan = plan_period_reminder(date(2026, 9, 20), days_before=3, at=time(8, 0), privacy='maximum')
    assert plan['date'].isoformat() == '2026-09-17'
    assert plan['body'] == 'You have a reminder.'


def test_partner_share_only_contains_explicitly_selected_categories():
    from sreva_reference import build_partner_summary

    text = build_partner_summary({'prediction'}, prediction_window='18–22 September', wellness='cramps severe')
    assert '18–22 September' in text
    assert 'cramps severe' not in text
