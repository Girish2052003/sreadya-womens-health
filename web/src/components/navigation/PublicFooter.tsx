import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div>
        <strong>Sreva</strong>
        <p>Private, local-first women&apos;s health.</p>
      </div>
      <div className="public-footer__links" aria-label="Footer links">
        <Link href="/privacy-policy">Privacy Policy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/security-report">Security</Link>
      </div>
      <div className="forge-lockup" aria-label="Technology provenance: FORGE by NC CORP">
        <span>FORGE</span>
        <small>by NC CORP</small>
      </div>
    </footer>
  );
}
