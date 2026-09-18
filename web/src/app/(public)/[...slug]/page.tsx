import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CapabilityCatalogue } from '../../../components/CapabilityCatalogue';
import { PublicTopicContent } from '../../../components/PublicTopicContent';
import { PublicFooter } from '../../../components/navigation/PublicFooter';
import { PublicHeader } from '../../../components/navigation/PublicHeader';
import { InstallGuide, type InstallGuideTarget } from '../../../components/pwa/InstallGuide';
import {
  privacyPolicyIntro,
  privacyPolicyLastUpdated,
  privacyPolicyLastUpdatedLabel,
  privacyPolicySections,
} from '../../../content/privacy-policy';
import { publicPages } from '../../../content/routes';

export function generateStaticParams() {
  return publicPages.map(({ slug }) => ({ slug }));
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const key = slug.join('/');
  const page = publicPages.find((candidate) => candidate.slug.join('/') === key);
  if (!page) notFound();

  const installTarget: InstallGuideTarget | null = key === 'install/iphone'
    ? 'iphone'
    : key === 'install/android'
      ? 'android'
      : key === 'install/pwa'
        ? 'pwa'
        : null;
  const isPrivacyPolicy = key === 'privacy-policy';

  return (
    <div className="public-site">
      <PublicHeader />
      <main className="public-page">
        <section className="public-page__hero">
          <p className="public-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="public-lede">{page.summary}</p>
          <div className="public-page__actions">
            <Link className="link-button link-button--primary" href="/app/home">Open Sreva</Link>
            <Link className="link-button link-button--quiet" href="/how-it-works">How Sreva works</Link>
          </div>
        </section>
        {key === 'features' ? <CapabilityCatalogue /> : null}
        <PublicTopicContent topicKey={key} />
        {installTarget ? <InstallGuide target={installTarget} /> : null}
        {isPrivacyPolicy ? (
          <section className="policy-document" aria-label="Sreva Privacy Policy">
            <p className="public-eyebrow">{privacyPolicyLastUpdatedLabel}: {privacyPolicyLastUpdated}</p>
            <p className="public-lede">{privacyPolicyIntro}</p>
            {privacyPolicySections.map((section) => (
              <article key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </article>
            ))}
          </section>
        ) : null}
        <section className="principle-grid" aria-label="Sreva product principles">
          <article><span>01</span><h2>Local first</h2><p>Core health tools remain useful without creating an account.</p></article>
          <article><span>02</span><h2>Private by architecture</h2><p>Health telemetry is not the price of using Sreva.</p></article>
          <article><span>03</span><h2>Clear boundaries</h2><p>Sreva communicates estimates and wellness context without pretending to diagnose.</p></article>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
