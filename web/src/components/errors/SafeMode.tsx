import type { SafeModeAction, SafeModeState } from '../../recovery/safe-mode';

type Props = {
  state: SafeModeState;
  onAction?: (action: SafeModeAction) => void;
};

const ACTION_LABELS: Record<SafeModeAction, string> = {
  retry_read: 'Retry read',
  export_encrypted_backup: 'Export encrypted backup',
  download_sanitized_diagnostics: 'Download sanitized diagnostics',
  review_migration: 'Review migration guidance',
  free_device_storage: 'Free device storage',
};

export function SafeMode({ state, onAction }: Props) {
  return (
    <section className="sreva-card safe-mode" aria-labelledby="safe-mode-title" data-safe-mode-reason={state.reason}>
      <p className="sreva-card__eyebrow">Read-only recovery</p>
      <h2 className="sreva-card__title" id="safe-mode-title">
        {state.title}
      </h2>
      <div className="sreva-card__body">
        <p>{state.message}</p>
        <p>
          Health-data writes stay disabled until this condition is resolved. Sreva will not automatically reset the local vault.
        </p>
        <div className="safe-mode__actions" aria-label="Safe recovery options">
          {state.actions.map((action) =>
            onAction ? (
              <button
                className="sreva-button sreva-button--quiet"
                key={action}
                type="button"
                onClick={() => onAction(action)}
              >
                {ACTION_LABELS[action]}
              </button>
            ) : (
              <span className="safe-mode__guidance" key={action}>
                {ACTION_LABELS[action]}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
