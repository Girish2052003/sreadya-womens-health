import { notFound } from 'next/navigation';

import { PublicPageContent } from '../../../components/PublicPageContent';
import type { InstallGuideTarget } from '../../../components/pwa/InstallGuide';
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

  return (
    <PublicPageContent
      topicKey={key}
      titleKey={page.titleKey}
      eyebrowKey={page.eyebrowKey}
      summaryKey={page.summaryKey}
      installTarget={installTarget}
      isPrivacyPolicy={key === 'privacy-policy'}
      isFeatures={key === 'features'}
    />
  );
}
