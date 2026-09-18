'use client';

import Link from 'next/link';

import { publicTopicContent } from '../content/public-topic-content';
import { useI18n } from '../i18n/I18nProvider';

export function PublicTopicContent({ topicKey }: { topicKey: string }) {
  const { t } = useI18n();
  const topic = publicTopicContent[topicKey];
  if (!topic) return null;
  const base = `publicTopic.${topic.id}`;

  return (
    <section className="public-topic" aria-label={t('publicTopic.aria')}>
      <p className="public-lede public-topic__intro">{t(`${base}.intro`)}</p>
      <div className="public-topic__grid">
        {topic.sections.map((section) => {
          const sectionBase = `${base}.${section.id}`;
          return (
            <article className="public-topic__card" key={section.id}>
              <h2>{t(`${sectionBase}.title`)}</h2>
              <p>{t(`${sectionBase}.body`)}</p>
              {section.href ? <Link href={section.href}>{t(`${sectionBase}.action`)} →</Link> : null}
            </article>
          );
        })}
      </div>
      {topic.hasBoundary ? <aside className="public-topic__boundary"><strong>{t('publicTopic.boundaryTitle')}</strong><p>{t(`${base}.boundary`)}</p></aside> : null}
    </section>
  );
}
