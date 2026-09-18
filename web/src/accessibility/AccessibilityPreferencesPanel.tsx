'use client';

import { useI18n } from '../i18n/I18nProvider';
import type {
  AccessibilityPreferences,
  ContrastPreference,
  MotionPreference,
  TextScalePreference,
} from './preferences';

type Props = {
  preferences: AccessibilityPreferences;
  saving: boolean;
  onChange: (preferences: AccessibilityPreferences) => void;
  onSave: () => void;
};

type Choice<T extends string> = { value: T; labelKey: string };

const TEXT_SCALE_CHOICES: Choice<TextScalePreference>[] = [
  { value: 'normal', labelKey: 'accessibility.textSize.normal' },
  { value: 'large', labelKey: 'accessibility.textSize.large' },
];
const MOTION_CHOICES: Choice<MotionPreference>[] = [
  { value: 'system', labelKey: 'accessibility.motion.system' },
  { value: 'reduced', labelKey: 'accessibility.motion.reduced' },
];
const CONTRAST_CHOICES: Choice<ContrastPreference>[] = [
  { value: 'system', labelKey: 'accessibility.contrast.system' },
  { value: 'high', labelKey: 'accessibility.contrast.high' },
];

export function AccessibilityPreferencesPanel({ preferences, saving, onChange, onSave }: Props) {
  const { t } = useI18n();

  return (
    <section className="sreadya-card accessibility-preferences" aria-labelledby="accessibility-preferences-title" data-testid="accessibility-preferences">
      <p className="sreadya-card__eyebrow">{t('accessibility.eyebrow')}</p>
      <h2 className="sreadya-card__title" id="accessibility-preferences-title">{t('accessibility.title')}</h2>
      <div className="sreadya-card__body">
        <p>{t('accessibility.summary')}</p>
        <fieldset className="accessibility-preferences__group">
          <legend>{t('accessibility.textSize')}</legend>
          {TEXT_SCALE_CHOICES.map((choice) => <label key={choice.value}><input type="radio" name="text-scale" value={choice.value} checked={preferences.textScale === choice.value} onChange={() => onChange({ ...preferences, textScale: choice.value })} /><span>{t(choice.labelKey)}</span></label>)}
        </fieldset>
        <fieldset className="accessibility-preferences__group">
          <legend>{t('accessibility.motion')}</legend>
          {MOTION_CHOICES.map((choice) => <label key={choice.value}><input type="radio" name="motion" value={choice.value} checked={preferences.motion === choice.value} onChange={() => onChange({ ...preferences, motion: choice.value })} /><span>{t(choice.labelKey)}</span></label>)}
        </fieldset>
        <fieldset className="accessibility-preferences__group">
          <legend>{t('accessibility.contrast')}</legend>
          {CONTRAST_CHOICES.map((choice) => <label key={choice.value}><input type="radio" name="contrast" value={choice.value} checked={preferences.contrast === choice.value} onChange={() => onChange({ ...preferences, contrast: choice.value })} /><span>{t(choice.labelKey)}</span></label>)}
        </fieldset>
        <fieldset className="accessibility-preferences__group">
          <legend>{t('accessibility.clarity')}</legend>
          <label><input type="radio" name="language-clarity" checked={!preferences.easyLanguage} onChange={() => onChange({ ...preferences, easyLanguage: false })} /><span>{t('accessibility.clarity.standard')}</span></label>
          <label><input type="radio" name="language-clarity" checked={preferences.easyLanguage} onChange={() => onChange({ ...preferences, easyLanguage: true })} /><span>{t('accessibility.clarity.easy')}</span></label>
          <p className="workspace-note">{t('accessibility.clarity.help')}</p>
        </fieldset>
        <button className="sreadya-button sreadya-button--primary" type="button" disabled={saving} onClick={onSave}>{saving ? t('accessibility.saving') : t('accessibility.save')}</button>
      </div>
    </section>
  );
}
