'use client';
import type { SafeModeAction,SafeModeState } from '../../recovery/safe-mode';
import { useI18n } from '../../i18n/I18nProvider';
type Props={state:SafeModeState;onAction?:(action:SafeModeAction)=>void;};
export function SafeMode({state,onAction}:Props){
 const {t}=useI18n();
 return <section className="sreadya-card safe-mode" aria-labelledby="safe-mode-title" data-safe-mode-reason={state.reason}><p className="sreadya-card__eyebrow">{t('safeMode.eyebrow')}</p><h2 className="sreadya-card__title" id="safe-mode-title">{t(`safeMode.reason.${state.reason}.title`)}</h2><div className="sreadya-card__body"><p>{t(`safeMode.reason.${state.reason}.message`)}</p><p>{t('safeMode.body')}</p><div className="safe-mode__actions" aria-label={t('safeMode.options')}>{state.actions.map(action=>onAction?<button className="sreadya-button sreadya-button--quiet" key={action} type="button" onClick={()=>onAction(action)}>{t(`safeMode.action.${action}`)}</button>:<span className="safe-mode__guidance" key={action}>{t(`safeMode.action.${action}`)}</span>)}</div></div></section>;
}
