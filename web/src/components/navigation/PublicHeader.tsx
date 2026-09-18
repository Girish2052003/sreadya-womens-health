import Link from 'next/link';

const publicLinks = [
  ['Features', '/features'],
  ['How it works', '/how-it-works'],
  ['Privacy', '/privacy'],
  ['Security', '/security'],
  ['Help', '/help'],
  ['Download', '/download'],
] as const;

export function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="public-header__brand" href="/" aria-label="Sreva home" title="Sreva home">
        <span className="public-header__mark" aria-hidden="true">S</span>
        <span>Sreva</span>
      </Link>
      <nav className="public-header__nav" aria-label="Public navigation">
        {publicLinks.map(([label, href]) => (
          <Link key={href} href={href}>{label}</Link>
        ))}
      </nav>
      <Link className="public-header__cta" href="/app/home">Open Sreva</Link>
    </header>
  );
}
