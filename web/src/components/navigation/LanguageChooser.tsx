'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  POPULAR_LANGUAGE_CODES,
  PUBLIC_LANGUAGE_COUNT,
  allLanguageChoices,
  currentLanguageChoice,
  languageChoice,
  type LanguageChoice,
} from '../../i18n/locale-registry';
import { useI18n } from '../../i18n/I18nProvider';

function searchable(choice: LanguageChoice): string {
  return [choice.nativeName, choice.englishName, choice.language, choice.tag]
    .join(' ')
    .toLocaleLowerCase('en');
}

export function LanguageChooser() {
  const { locale, setLocale, t, plural, status } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const current = useMemo(() => currentLanguageChoice(locale), [locale]);
  const choices = useMemo(() => allLanguageChoices(), []);
  const popular = useMemo(() => POPULAR_LANGUAGE_CODES.map((code) => languageChoice(code)), []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const normalizedQuery = query.trim().toLocaleLowerCase('en');
  const filtered = useMemo(
    () => !normalizedQuery ? choices : choices.filter((choice) => searchable(choice).includes(normalizedQuery)),
    [choices, normalizedQuery],
  );

  const choose = (choice: LanguageChoice) => {
    setLocale(choice.tag);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="language-chooser" ref={rootRef}>
      <button
        type="button"
        className="language-chooser__trigger"
        data-testid="language-chooser-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title={t('language.button')}
      >
        <span className="language-chooser__flag" aria-hidden="true">{current.flag}</span>
        <span className="language-chooser__trigger-copy">
          <small>{t('language.button')}</small>
          <strong>{current.nativeName}</strong>
        </span>
        <span aria-hidden="true">⌄</span>
      </button>

      {open ? (
        <section className="language-chooser__panel" role="dialog" aria-modal="false" aria-labelledby="language-chooser-title">
          <div className="language-chooser__panel-head">
            <div>
              <p className="public-eyebrow">{t('language.button')}</p>
              <h2 id="language-chooser-title">{t('language.dialogTitle')}</h2>
            </div>
            <button type="button" className="language-chooser__close" onClick={() => setOpen(false)} aria-label={t('language.close')}>×</button>
          </div>

          <label className="language-chooser__search">
            <span>{t('language.searchLabel')}</span>
            <input
              data-testid="language-chooser-search"
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={t('language.searchPlaceholder')}
            />
          </label>

          {!normalizedQuery && popular.length > 0 ? (
            <div className="language-chooser__popular">
              <strong>{t('language.popular')}</strong>
              <div className="language-chooser__chips">
                {popular.map((choice) => (
                  <button key={choice.tag} type="button" onClick={() => choose(choice)}>
                    <span aria-hidden="true">{choice.flag}</span>
                    <span>{choice.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="language-chooser__list-head">
            <strong>{t('language.all')}</strong>
            <span>{plural('language.resultCount', filtered.length, { count: filtered.length })}</span>
          </div>

          <div className="language-chooser__list" role="listbox" aria-label={t('language.dialogTitle')}>
            {filtered.map((choice) => {
              const selected = choice.language === current.language;
              return (
                <button
                  key={choice.tag}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="language-chooser__option"
                  data-language-tag={choice.tag}
                  onClick={() => choose(choice)}
                  title={t('language.representativeFlag')}
                >
                  <span className="language-chooser__flag" aria-hidden="true">{choice.flag}</span>
                  <span className="language-chooser__name">
                    <strong>{choice.nativeName}</strong>
                    <small>{choice.englishName !== choice.nativeName ? choice.englishName : choice.language}</small>
                  </span>
                  {selected ? <span className="language-chooser__selected" aria-hidden="true">✓</span> : null}
                </button>
              );
            })}
          </div>

          <p className="language-chooser__foot">
            {PUBLIC_LANGUAGE_COUNT} {PUBLIC_LANGUAGE_COUNT === 1 ? 'fully translated language' : 'fully translated languages'}
            {status === 'loading' ? ' · Loading language…' : ''}
          </p>
        </section>
      ) : null}
    </div>
  );
}
