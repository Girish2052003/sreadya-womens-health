import Link from 'next/link';

type PrimaryKey = 'home' | 'today' | 'log' | 'calendar' | 'more';

const primary = [
  ['home', 'Home', '/app/home'],
  ['today', 'Today', '/app/today'],
  ['log', 'Log', '/app/log'],
  ['calendar', 'Calendar', '/app/calendar'],
  ['more', 'More', '/app/settings'],
] as const;

export function WorkspaceNav({ active }: { active: PrimaryKey | string }) {
  return (
    <nav className="workspace-nav" aria-label="Sreva workspace">
      <Link className="workspace-nav__brand" href="/app/home" aria-label="Sreva workspace home">
        <span aria-hidden="true">S</span>
      </Link>
      <div className="workspace-nav__items">
        {primary.map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            className="workspace-nav__item"
            aria-current={active === key ? 'page' : undefined}
          >
            <span className="workspace-nav__glyph" aria-hidden="true">{label.slice(0, 1)}</span>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
