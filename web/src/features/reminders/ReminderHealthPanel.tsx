'use client';
import { Card } from '../../components/ui/Card';
import type { NotificationPrivacy,ReminderPlan } from '../../domain/reminders/reminder-policy';
import { formatLocaleDateLong } from '../../i18n/locale';
import { useI18n } from '../../i18n/I18nProvider';
import type { NotificationCapability } from '../../pwa/notification-capability';
function titleCase(value:string):string{return value.replace(/([a-z0-9])([A-Z])/g,'$1 $2').split(/[-\s]+/).filter(Boolean).map(part=>part[0].toUpperCase()+part.slice(1)).join(' ');}
export function ReminderHealthPanel({capability,privacy,nextReminder}:{capability:NotificationCapability;privacy:NotificationPrivacy;nextReminder:ReminderPlan|null;}){
 const {t,locale}=useI18n();const reminderDate=(value:string)=>formatLocaleDateLong(`${value.slice(0,10)}T00:00:00Z`,locale,'UTC');const reminderTime=(value:string)=>value.slice(11,16);
 return <div className="core-panel-grid" data-testid="reminder-health-panel"><Card eyebrow={t('reminder.healthEyebrow')} title={t('reminder.healthTitle')}><dl className="prediction-summary"><div><dt>{t('reminder.mechanism')}</dt><dd>{titleCase(capability.mechanism)}</dd></div><div><dt>{t('reminder.permission')}</dt><dd>{titleCase(capability.permission)}</dd></div><div><dt>{t('reminder.timeZone')}</dt><dd>{capability.timeZone}</dd></div><div><dt>{t('reminder.installed')}</dt><dd>{capability.installed?t('common.yes'):t('common.no')}</dd></div></dl><p className="workspace-note">{capability.reason}</p><p className="workspace-note">{capability.closedAppDelivery==='not-guaranteed'?t('reminder.closedUnavailable'):t('reminder.closedAvailable')}</p></Card>
 <Card eyebrow={t('reminder.nextEyebrow')} title={nextReminder?reminderDate(nextReminder.targetLocal):t('reminder.noUpcoming')}>{nextReminder?<><p>{titleCase(nextReminder.kind)} · {reminderTime(nextReminder.targetLocal)}</p><p className="workspace-note">{t('reminder.wallClock')}</p></>:<p>{t('reminder.noneFuture')}</p>}</Card>
 <Card eyebrow={t('reminder.privacyEyebrow')} title={t(`reminder.privacy.${privacy}`)}><p>{privacy==='maximum'?t('reminder.localDelivery'):t('reminder.wording')}</p></Card></div>;
}
