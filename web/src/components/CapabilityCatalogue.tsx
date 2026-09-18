'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import catalog from '../content/capabilities.generated.json';

type LaunchCapability = (typeof catalog.launch)[number];

const FAMILY_NAMES = Object.fromEntries(catalog.families.map((family) => [family.prefix, family.name])) as Record<string, string>;

function surfaceLabel(value: LaunchCapability['surface_type']): string {
  if (value === 'interaction') return 'Use feature';
  if (value === 'protection') return 'Active protection';
  if (value === 'platform-adapted') return 'Platform adapted';
  if (value === 'provider-dependent') return 'Requires continuity service';
  return 'View status';
}

export function CapabilityCatalogue() {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const filtered = catalog.launch.filter((item) => {
      if (!normalized) return true;
      return item.id.toLowerCase().includes(normalized)
        || item.name.toLowerCase().includes(normalized)
        || (FAMILY_NAMES[item.family] ?? item.family).toLowerCase().includes(normalized);
    });
    return catalog.families.map((family) => ({
      ...family,
      items: filtered.filter((item) => item.family === family.prefix),
    })).filter((family) => family.items.length > 0);
  }, [normalized]);

  return (
    <section className="capability-catalogue" aria-labelledby="capability-catalogue-title">
      <p className="public-eyebrow">Complete launch contract</p>
      <h2 id="capability-catalogue-title">Every Sreva launch capability has a home.</h2>
      <p className="public-lede">
        Public marketing says 40+ thoughtful capabilities. Engineering tracks 258 atomic launch requirements so important details cannot disappear behind a broad feature label.
      </p>

      <div className="capability-catalogue__summary">
        <article><strong>258</strong><span>launch requirements</span></article>
        <article><strong>18</strong><span>launch families</span></article>
        <article><strong>11</strong><span>future / optional items kept separate</span></article>
      </div>

      <label className="core-field">
        <span>Find a Sreva capability</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Try reminders, privacy, recovery, flow, mood…"
        />
      </label>

      <div aria-live="polite" className="workspace-note">
        Showing {groups.reduce((sum, family) => sum + family.items.length, 0)} of 258 launch requirements.
      </div>

      {groups.map((family, index) => (
        <details key={family.prefix} open={Boolean(normalized) || index < 2}>
          <summary>{family.name} · {family.items.length}</summary>
          <ul className="capability-catalogue__list">
            {family.items.map((item) => (
              <li className="capability-catalogue__item" key={item.id} data-capability-id={item.id}>
                <span className="capability-catalogue__id">{item.id}</span>
                <span>
                  <strong>{item.name}</strong><br />
                  <small>{item.web_applicability === 'na' ? 'Native-only mechanism; underlying Sreva promise is adapted on Web.' : surfaceLabel(item.surface_type)}</small>
                </span>
                <Link href={item.route}>{surfaceLabel(item.surface_type)} →</Link>
              </li>
            ))}
          </ul>
        </details>
      ))}

      <div className="capability-catalogue__future">
        <h3>Future / optional — not launch promises</h3>
        <p>These remain visible so the roadmap is transparent, but Sreva does not market them as finished launch functionality.</p>
        <ul>
          {catalog.future.map((item) => <li key={item.id}><strong>{item.id}</strong> · {item.name}</li>)}
        </ul>
      </div>
    </section>
  );
}
