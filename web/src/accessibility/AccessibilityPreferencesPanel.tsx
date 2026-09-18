import messages from '../i18n/messages/en.json';
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

type Choice<T extends string> = {
  value: T;
  label: string;
};

const TEXT_SCALE_CHOICES: Choice<TextScalePreference>[] = [
  { value: 'normal', label: messages['accessibility.textSize.normal'] },
  { value: 'large', label: messages['accessibility.textSize.large'] },
];

const MOTION_CHOICES: Choice<MotionPreference>[] = [
  { value: 'system', label: messages['accessibility.motion.system'] },
  { value: 'reduced', label: messages['accessibility.motion.reduced'] },
];

const CONTRAST_CHOICES: Choice<ContrastPreference>[] = [
  { value: 'system', label: messages['accessibility.contrast.system'] },
  { value: 'high', label: messages['accessibility.contrast.high'] },
];

export function AccessibilityPreferencesPanel({ preferences, saving, onChange, onSave }: Props) {
  return (
    <section
      className="sreva-card accessibility-preferences"
      aria-labelledby="accessibility-preferences-title"
      data-testid="accessibility-preferences"
    >
      <p className="sreva-card__eyebrow">Settings</p>
      <h2 className="sreva-card__title" id="accessibility-preferences-title">
        {messages['accessibility.title']}
      </h2>
      <div className="sreva-card__body">
        <p>{messages['accessibility.summary']}</p>

        <fieldset className="accessibility-preferences__group">
          <legend>{messages['accessibility.textSize']}</legend>
          {TEXT_SCALE_CHOICES.map((choice) => (
            <label key={choice.value}>
              <input
                type="radio"
                name="text-scale"
                value={choice.value}
                checked={preferences.textScale === choice.value}
                onChange={() => onChange({ ...preferences, textScale: choice.value })}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="accessibility-preferences__group">
          <legend>{messages['accessibility.motion']}</legend>
          {MOTION_CHOICES.map((choice) => (
            <label key={choice.value}>
              <input
                type="radio"
                name="motion"
                value={choice.value}
                checked={preferences.motion === choice.value}
                onChange={() => onChange({ ...preferences, motion: choice.value })}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="accessibility-preferences__group">
          <legend>{messages['accessibility.contrast']}</legend>
          {CONTRAST_CHOICES.map((choice) => (
            <label key={choice.value}>
              <input
                type="radio"
                name="contrast"
                value={choice.value}
                checked={preferences.contrast === choice.value}
                onChange={() => onChange({ ...preferences, contrast: choice.value })}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="accessibility-preferences__group">
          <legend>Language clarity</legend>
          <label>
            <input type="radio" name="language-clarity" checked={!preferences.easyLanguage} onChange={() => onChange({ ...preferences, easyLanguage: false })} />
            <span>Standard language</span>
          </label>
          <label>
            <input type="radio" name="language-clarity" checked={preferences.easyLanguage} onChange={() => onChange({ ...preferences, easyLanguage: true })} />
            <span>Easy language</span>
          </label>
          <p className="workspace-note">Easy language adds short, plain-English guidance to each private workspace while keeping the same health and privacy meaning.</p>
        </fieldset>

        <button className="sreva-button sreva-button--primary" type="button" disabled={saving} onClick={onSave}>
          {saving ? 'Saving…' : 'Save accessibility preferences'}
        </button>
      </div>
    </section>
  );
}
