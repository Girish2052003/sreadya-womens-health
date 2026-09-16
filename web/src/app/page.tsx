import Link from 'next/link';

import { PublicFooter } from '../components/navigation/PublicFooter';
import { PublicHeader } from '../components/navigation/PublicHeader';

export default function HomePage() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="hero" aria-labelledby="sreva-title">
          <div className="hero__copy">
            <p className="public-eyebrow">Private by architecture. Gentle by design.</p>
            <h1 id="sreva-title">Sreva</h1>
            <p className="hero__headline">Your cycle, your context, your private space.</p>
            <p className="hero__lede">
              A local-first women&apos;s cycle and menstrual health companion designed to feel calm,
              personal and beautifully simple—without making an account the price of care.
            </p>
            <div className="hero__actions">
              <Link className="link-button link-button--primary" href="/app/home">Open Sreva</Link>
              <Link className="link-button link-button--quiet" href="/how-it-works">See how it works</Link>
            </div>
            <p className="hero__trust">No health telemetry · Local predictions · Optional encrypted continuity</p>
          </div>
          <div className="hero__visual" aria-label="A private Sreva cycle summary preview">
            <div className="hero-orbit hero-orbit--one" aria-hidden="true" />
            <div className="hero-orbit hero-orbit--two" aria-hidden="true" />
            <div className="preview-card">
              <div className="preview-card__top">
                <span>Today</span>
                <span className="preview-lock">Private</span>
              </div>
              <p className="preview-kicker">Your next period</p>
              <strong>About 6 days</strong>
              <div className="preview-meter" aria-hidden="true"><span /></div>
              <p className="preview-copy">An estimate from your local history, with confidence shown clearly.</p>
            </div>
          </div>
        </section>

        <section className="promise-strip" aria-label="Sreva promises">
          <article><span>01</span><strong>Account-free is complete</strong><p>Core tracking, predictions, insights and reports remain available locally.</p></article>
          <article><span>02</span><strong>Privacy is structural</strong><p>Your reproductive-health history is not developer analytics data.</p></article>
          <article><span>03</span><strong>Built for real life</strong><p>Periods, symptoms, medication, life stages and appointments live in one calm space.</p></article>
        </section>

        <section className="story-section">
          <div className="story-section__intro">
            <p className="public-eyebrow">One Sreva</p>
            <h2>Thoughtful enough for sensitive days. Powerful enough for the whole journey.</h2>
          </div>
          <div className="story-grid">
            <Link href="/cycle-tracking" className="story-card story-card--wide"><span>Cycle</span><h3>Track without turning your life into a spreadsheet.</h3><p>Simple daily logging, clear history and respectful language.</p></Link>
            <Link href="/predictions" className="story-card"><span>Predictions</span><h3>Estimates, not false certainty.</h3><p>Confidence-aware local prediction semantics shared across Sreva clients.</p></Link>
            <Link href="/privacy" className="story-card"><span>Privacy</span><h3>Your body is not a data business.</h3><p>No health telemetry. Optional continuity stays a separate boundary.</p></Link>
          </div>
        </section>

        <section className="closing-cta">
          <p className="public-eyebrow">Start privately</p>
          <h2>A health companion should earn trust before it asks for anything.</h2>
          <Link className="link-button link-button--primary" href="/app/home">Continue without an account</Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
