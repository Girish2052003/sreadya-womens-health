import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="task5-home">
      <section className="task5-card" aria-labelledby="sreva-title">
        <p className="task5-eyebrow">Private by design</p>
        <h1 id="sreva-title">Sreva</h1>
        <p>
          A local-first women&apos;s cycle and menstrual health companion. Your core health
          experience stays available without creating an account.
        </p>
        <Link className="task5-open" href="/app/home">
          Open Sreva
        </Link>
      </section>
    </main>
  );
}
