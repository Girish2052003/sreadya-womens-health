import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type {
  NotificationPrivacy,
  ReminderPolicySettings,
} from '../../domain/reminders/reminder-policy';

const OFFSET_OPTIONS = [
  { days: 7, label: '7 days before' },
  { days: 3, label: '3 days before' },
  { days: 1, label: '1 day before' },
  { days: 0, label: 'Expected day' },
] as const;

const PRIVACY_OPTIONS: Array<{ value: NotificationPrivacy; label: string; description: string }> = [
  { value: 'maximum', label: 'Maximum Privacy', description: 'Generic reminder wording and local/in-app delivery.' },
  { value: 'balanced', label: 'Balanced', description: 'Mentions a cycle reminder without revealing the predicted date.' },
  { value: 'detailed', label: 'Detailed', description: 'May describe the cycle-relative reminder timing on this device.' },
];

function numberFromInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ReminderSettingsPanel({
  settings,
  saving,
  onChange,
  onSave,
}: {
  settings: ReminderPolicySettings;
  saving: boolean;
  onChange: (next: ReminderPolicySettings) => void;
  onSave: () => void;
}) {
  const enabled = new Set(settings.enabledOffsetsDays);

  const toggleOffset = (days: number, checked: boolean) => {
    const next = new Set(settings.enabledOffsetsDays);
    if (checked) next.add(days);
    else next.delete(days);
    onChange({ ...settings, enabledOffsetsDays: [...next].sort((left, right) => right - left) });
  };

  return (
    <div className="core-panel-grid" data-testid="reminder-settings-panel">
      <Card eyebrow="Account-free preferences" title="Reminder settings">
        <fieldset className="reminder-fieldset">
          <legend>Cycle reminders</legend>
          <p className="workspace-note">Choose only the reminders you want. New local vaults start with all cycle reminders off.</p>
          <div className="reminder-option-grid">
            {OFFSET_OPTIONS.map(({ days, label }) => (
              <label key={days} className="reminder-option">
                <input
                  type="checkbox"
                  name={`offset-${days}`}
                  checked={enabled.has(days)}
                  onChange={(event) => toggleOffset(days, event.currentTarget.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="reminder-form-grid">
          <label>
            <span>Late reminder</span>
            <span className="workspace-note">Days after the expected date; 0 disables it.</span>
            <input
              aria-label="Late reminder days"
              type="number"
              min={0}
              max={30}
              value={settings.lateDays}
              onChange={(event) => onChange({
                ...settings,
                lateDays: numberFromInput(event.currentTarget.value, settings.lateDays),
              })}
            />
          </label>

          <label>
            <span>Reminder hour</span>
            <input
              aria-label="Reminder hour"
              type="number"
              min={0}
              max={23}
              value={settings.hour}
              onChange={(event) => onChange({
                ...settings,
                hour: numberFromInput(event.currentTarget.value, settings.hour),
              })}
            />
          </label>

          <label>
            <span>Reminder minute</span>
            <input
              aria-label="Reminder minute"
              type="number"
              min={0}
              max={59}
              value={settings.minute}
              onChange={(event) => onChange({
                ...settings,
                minute: numberFromInput(event.currentTarget.value, settings.minute),
              })}
            />
          </label>
        </div>
      </Card>

      <Card eyebrow="Do not disturb" title="Quiet hours">
        <p className="workspace-note">If a reminder falls inside quiet hours, Reminder v1 moves it to the quiet-end hour on the same intended calendar day.</p>
        <div className="reminder-form-grid">
          <label>
            <span>Quiet start hour</span>
            <input
              aria-label="Quiet start hour"
              type="number"
              min={0}
              max={23}
              value={settings.quietStartHour}
              onChange={(event) => onChange({
                ...settings,
                quietStartHour: numberFromInput(event.currentTarget.value, settings.quietStartHour),
              })}
            />
          </label>
          <label>
            <span>Quiet end hour</span>
            <input
              aria-label="Quiet end hour"
              type="number"
              min={0}
              max={23}
              value={settings.quietEndHour}
              onChange={(event) => onChange({
                ...settings,
                quietEndHour: numberFromInput(event.currentTarget.value, settings.quietEndHour),
              })}
            />
          </label>
        </div>
      </Card>

      <Card eyebrow="Personal reminder families" title="More than cycle reminders">
        <ul>
          <li>Medication reminder</li>
          <li>Contraception reminder</li>
          <li>Supplement reminder</li>
          <li>Ovulation-test reminder</li>
          <li>Pregnancy-test reminder</li>
        </ul>
        <p>Snooze is configured per personal reminder in the reminder manager below.</p>
        <p className="workspace-note">These are user-created wellness reminder intents. Sreva does not prescribe medicine, contraception, tests, or treatment.</p>
      </Card>

      <Card eyebrow="Notification wording" title="Privacy level">
        <div className="reminder-privacy-options" role="radiogroup" aria-label="Notification privacy">
          {PRIVACY_OPTIONS.map((option) => (
            <label key={option.value} className="reminder-option reminder-option--stacked">
              <input
                type="radio"
                name="notification-privacy"
                value={option.value}
                checked={settings.privacy === option.value}
                onChange={() => onChange({ ...settings, privacy: option.value })}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
        <div className="core-actions">
          <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save reminder settings'}</Button>
        </div>
      </Card>
    </div>
  );
}
