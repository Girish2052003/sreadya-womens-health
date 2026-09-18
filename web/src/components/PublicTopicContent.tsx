import Link from 'next/link';

import { publicTopicContent } from '../content/public-topic-content';

export function PublicTopicContent({ topicKey }: { topicKey: string }) {
  const topic = publicTopicContent[topicKey];
  if (!topic) return null;
  return (
    <section className="public-topic" aria-label="Page details">
      <p className="public-lede public-topic__intro">{topic.intro}</p>
      <div className="public-topic__grid">
        {topic.sections.map((section) => (
          <article className="public-topic__card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            {section.href && section.action ? <Link href={section.href}>{section.action} →</Link> : null}
          </article>
        ))}
      </div>
      {topic.boundary ? <aside className="public-topic__boundary"><strong>Current deployment boundary</strong><p>{topic.boundary}</p></aside> : null}
    </section>
  );
}
