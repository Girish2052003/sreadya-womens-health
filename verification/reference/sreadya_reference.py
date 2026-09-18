from __future__ import annotations
from datetime import date, timedelta
from statistics import median


def _round_half_away(value: float) -> int:
    return int(value + 0.5) if value >= 0 else int(value - 0.5)


def predict_cycle(starts: list[date]):
    if len(starts) < 2:
        return None
    ordered = sorted(starts)
    intervals = [(ordered[i] - ordered[i-1]).days for i in range(1, len(ordered))]
    valid = [x for x in intervals if 15 <= x <= 90][-12:]
    excluded = [x for x in intervals if not 15 <= x <= 90]
    if not valid:
        return None
    med = float(median(valid))
    weighted = sum(v * (i+1) for i, v in enumerate(valid)) / sum(range(1, len(valid)+1))
    estimate = _round_half_away((med + weighted) / 2.0)
    deviations = [abs(x - med) for x in valid]
    mad = float(median(deviations)) if deviations else 0.0
    penalty = 2 if len(valid) < 4 else 1 if len(valid) <= 5 else 0
    half = max(2, min(10, _round_half_away(max(2.0, 1.5 * mad + penalty))))
    if len(valid) >= 6 and mad <= 2:
        confidence = 'high'
    elif len(valid) >= 3 and mad <= 5:
        confidence = 'medium'
    else:
        confidence = 'low'
    most = ordered[-1] + timedelta(days=estimate)
    return {
        'algorithm_version': 'prediction-v1',
        'estimated_cycle_length_days': estimate,
        'most_likely_date': most,
        'window_start': most - timedelta(days=half),
        'window_end': most + timedelta(days=half),
        'confidence': confidence,
        'valid_intervals': valid,
        'excluded_intervals': excluded,
        'mad': mad,
    }


def parse_local_intent(text: str, now: date):
    t = ' '.join(text.lower().strip().split())
    target = now - timedelta(days=1) if 'yesterday' in t else now
    if 'period' in t and any(w in t for w in ('started', 'start', 'began', 'begin')):
        return {'intent': 'periodStarted', 'date': target, 'value': None, 'requires_confirmation': True}
    if 'period' in t and any(w in t for w in ('ended', 'end', 'stopped', 'stop')):
        return {'intent': 'periodEnded', 'date': target, 'value': None, 'requires_confirmation': True}
    for flow in ('spotting', 'light', 'medium', 'heavy'):
        if flow in t:
            return {'intent': 'logFlow', 'date': target, 'value': flow, 'requires_confirmation': True}
    return {'intent': 'unknown', 'date': target, 'value': None, 'requires_confirmation': True}


def build_diagnostic_report(**kwargs):
    keys = [
        'app_version','platform','os_version','database_schema','prediction_engine',
        'reminder_engine','health_adapter','notification_permission','next_reminder_state',
        'last_migration_state','database_integrity'
    ]
    return '\n'.join(f'{k}={kwargs[k]}' for k in keys)


def plan_period_reminder(predicted_date, *, days_before, at, privacy='maximum'):
    from datetime import timedelta
    body = {
        'maximum': 'You have a reminder.',
        'balanced': 'Your cycle reminder is ready.',
        'detailed': {
            7: 'Your period may begin in about 7 days.',
            3: 'Your period may begin in about 3 days.',
            1: 'Your period may begin tomorrow.',
        }.get(days_before, 'Your health reminder is ready.'),
    }[privacy]
    return {
        'date': predicted_date - timedelta(days=days_before),
        'time': at,
        'body': body,
    }


def build_partner_summary(categories, *, prediction_window='', wellness=''):
    lines = ['Sreadya shared summary']
    if 'prediction' in categories and prediction_window:
        lines.append(f'Expected period window: {prediction_window}')
    if 'selected_wellness' in categories and wellness:
        lines.append(f'Selected wellness: {wellness}')
    lines.append('Shared intentionally by the Sreadya user.')
    return '\n'.join(lines)
