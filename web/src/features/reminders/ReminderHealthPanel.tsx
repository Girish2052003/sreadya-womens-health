import { Card } from '../../components/ui/Card';
import type { NotificationPrivacy, ReminderPlan } from '../../domain/reminders/reminder-policy';
import type { NotificationCapability } from '../../pwa/notification-capability';

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.length === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function reminderDate(value: string): string {
  const date = value.slice(0, 10);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function reminderTime(value: string): string {
  return value.slice(11, 16);
}

export function ReminderHealthPanel({
  capability,
  privacy,
  nextReminder,
}: {
  capability: NotificationCapability;
  privacy: NotificationPrivacy;
  nextReminder: ReminderPlan | null;
}) {
  const mechanism = titleCase(capability.mechanism);
  const permission = titleCase(capability.permission);

  return (
    <div className="core-panel-grid" data-testid="reminder-health-panel">
      <Card eyebrow="Delivery status" title="Reminder Health">
        <dl className="prediction-summary">
          <div>
            <dt>Mechanism</dt>
            <dd>{mechanism}</dd>
          </div>
          <div>
            <dt>Permission</dt>
            <dd>{permission}</dd>
          </div>
          <div>
            <dt>Time zone</dt>
            <dd>{capability.timeZone}</dd>
          </div>
          <div>
            <dt>Installed PWA</dt>
            <dd>{capability.installed ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
        <p className="workspace-note">{capability.reason}</p>
        {capability.closedAppDelivery === 'not-guaranteed' ? (
          <p className="workspace-note">
            Closed-app delivery is not guaranteed on this device with the current configuration.
          </p>
        ) : (
          <p className="workspace-note">Closed-app delivery is available through the reviewed relay.</p>
        )}
      </Card>

      <Card eyebrow="Next scheduled intent" title={nextReminder ? reminderDate(nextReminder.targetLocal) : 'No upcoming reminder'}>
        {nextReminder ? (
          <>
            <p>{titleCase(nextReminder.kind)} · {reminderTime(nextReminder.targetLocal)}</p>
            <p className="workspace-note">The wall-clock time is resolved by the current platform adapter.</p>
          </>
        ) : (
          <p>There is no future reminder under the current prediction and reminder settings.</p>
        )}
      </Card>

      <Card eyebrow="Notification privacy" title={privacy === 'maximum' ? 'Maximum Privacy' : titleCase(privacy)}>
        {privacy === 'maximum' ? (
          <p>Reminder delivery stays local to Sreva. Background push is not required.</p>
        ) : (
          <p>Notification wording follows the selected privacy level and never changes the underlying reminder schedule.</p>
        )}
      </Card>
    </div>
  );
}
