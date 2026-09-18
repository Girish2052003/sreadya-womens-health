import Link from 'next/link';

import { ThemeToggle } from '../../theme/ThemeToggle';

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
      <Link className="public-header__brand" href="/" aria-label="Sreadya home" title="Sreadya home">
        <span className="public-header__mark" aria-hidden="true">S</span>
        <span>Sreadya</span>
      </Link>
      <nav className="public-header__nav" aria-label="Public navigation">
        {publicLinks.map(([label, href]) => (
          <Link key={href} href={href}>{label}</Link>
        ))}
      </nav>
      <ThemeToggle />
      <Link className="public-header__cta" href="/app/home">Open Sreadya</Link>
    </header>
  );
}
