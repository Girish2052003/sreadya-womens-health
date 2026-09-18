'use client';

import Link from 'next/link';

import { PublicFooter } from '../components/navigation/PublicFooter';
import { PublicHeader } from '../components/navigation/PublicHeader';
import { useI18n } from '../i18n/I18nProvider';

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="public-site">
      <PublicHeader showLanguageChooser />
      <main>
        <section className="hero" aria-labelledby="sreadya-title">
          <div className="hero__copy">
            <p className="public-eyebrow">{t('home.eyebrow')}</p>
            <h1 id="sreadya-title">{t('brand.nameUpper')}</h1>
            <p className="hero__motto">{t('home.motto')}</p>
            <p className="hero__headline">{t('home.headline')}</p>
            <p className="hero__lede">{t('home.lede')}</p>
            <div className="hero__actions">
              <Link className="link-button link-button--primary" href="/app/home">{t('common.openSreadya')}</Link>
              <Link className="link-button link-button--quiet" href="/how-it-works">{t('home.seeHow')}</Link>
            </div>
            <p className="hero__trust">{t('home.trust')}</p>
          </div>
          <div className="hero__visual" aria-label={t('home.previewAria')}>
            <div className="hero-orbit hero-orbit--one" aria-hidden="true" />
            <div className="hero-orbit hero-orbit--two" aria-hidden="true" />
            <div className="preview-card">
              <div className="preview-card__top">
                <span>{t('common.today')}</span>
                <span className="preview-lock">{t('common.private')}</span>
              </div>
              <p className="preview-kicker">{t('home.preview.nextPeriod')}</p>
              <strong>{t('home.preview.aboutSixDays')}</strong>
              <div className="preview-meter" aria-hidden="true"><span /></div>
              <p className="preview-copy">{t('home.preview.copy')}</p>
            </div>
          </div>
        </section>

        <section className="promise-strip" aria-label={t('home.promisesAria')}>
          <article><span>01</span><strong>{t('home.promise1.title')}</strong><p>{t('home.promise1.body')}</p></article>
          <article><span>02</span><strong>{t('home.promise2.title')}</strong><p>{t('home.promise2.body')}</p></article>
          <article><span>03</span><strong>{t('home.promise3.title')}</strong><p>{t('home.promise3.body')}</p></article>
        </section>

        <section className="story-section">
          <div className="story-section__intro">
            <p className="public-eyebrow">{t('home.story.eyebrow')}</p>
            <h2>{t('home.story.title')}</h2>
          </div>
          <div className="story-grid">
            <Link href="/cycle-tracking" className="story-card story-card--wide"><span>{t('home.story.cycle.label')}</span><h3>{t('home.story.cycle.title')}</h3><p>{t('home.story.cycle.body')}</p></Link>
            <Link href="/predictions" className="story-card"><span>{t('home.story.predictions.label')}</span><h3>{t('home.story.predictions.title')}</h3><p>{t('home.story.predictions.body')}</p></Link>
            <Link href="/privacy" className="story-card"><span>{t('home.story.privacy.label')}</span><h3>{t('home.story.privacy.title')}</h3><p>{t('home.story.privacy.body')}</p></Link>
          </div>
        </section>

        <section className="closing-cta">
          <p className="public-eyebrow">{t('home.close.eyebrow')}</p>
          <h2>{t('home.close.title')}</h2>
          <Link className="link-button link-button--primary" href="/app/home">{t('home.close.cta')}</Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
