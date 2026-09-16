'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { predictFromRepository } from '../predictions/prediction-service';
import { PartnerGrantRepository } from './partner-grant-repository';
import {
  PARTNER_SHARE_CATEGORIES,
  buildPartnerSharePackage,
  createPartnerGrant,
  revokePartnerGrant,
  type PartnerGrant,
  type PartnerShareCategory,
  type PartnerSharePackage,
} from './partner-sharing';

const LABELS: Record<PartnerShareCategory, string> = {
  prediction: 'Expected period window',
  cyclePhase: 'Cycle phase / cycle day',
  selectedReminder: 'One selected reminder',
  selectedWellness: 'Selected wellness summary',
};

function displayDate(dateKey: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

type Runtime = {
  vault: VaultService;
  health: HealthVaultRepository;
  grants: PartnerGrantRepository;
};

export function SharingWorkspace() {
  const runtimeRef = useRef<Runtime | null>(null);
  const [categories, setCategories] = useState<PartnerShareCategory[]>(['prediction']);
  const [cyclePhase, setCyclePhase] = useState('');
  const [selectedReminder, setSelectedReminder] = useState('');
  const [selectedWellness, setSelectedWellness] = useState('');
  const [grant, setGrant] = useState<PartnerGrant | null>(null);
  const [sharePackage, setSharePackage] = useState<PartnerSharePackage | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening encrypted local vault…');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());
    void (async () => {
      await continuePrivately(vault);
      if (cancelled) return;
      runtimeRef.current = {
        vault,
        health: new HealthVaultRepository(vault),
        grants: new PartnerGrantRepository(vault),
      };
      setStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setStatus('Local vault unavailable');
      setError('Sreva could not open encrypted local sharing grants in this browser.');
      setReady(true);
    });
    return () => {
      cancelled = true;
      runtimeRef.current = null;
      vault.lock();
    };
  }, []);

  const invalidatePreview = () => {
    setGrant(null);
    setSharePackage(null);
  };

  const toggleCategory = (category: PartnerShareCategory, checked: boolean) => {
    setCategories((current) => checked
      ? [...current, category]
      : current.filter((candidate) => candidate !== category));
    invalidatePreview();
  };

  const prepare = async () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setError('');
    try {
      if (categories.length === 0) throw new Error('Select at least one sharing category.');
      if (categories.includes('cyclePhase') && cyclePhase.trim().length === 0) throw new Error('Enter the cycle phase/day you want to share.');
      if (categories.includes('selectedReminder') && selectedReminder.trim().length === 0) throw new Error('Enter the single reminder you want to share.');
      if (categories.includes('selectedWellness') && selectedWellness.trim().length === 0) throw new Error('Enter the wellness summary you want to share.');

      let predictionWindow: string | undefined;
      if (categories.includes('prediction')) {
        const prediction = await predictFromRepository(runtime.health, new Date().toISOString());
        if (!prediction) throw new Error('More cycle history is needed before an expected period window can be shared. No date is invented.');
        predictionWindow = `${displayDate(prediction.windowStart)} – ${displayDate(prediction.windowEnd)}`;
      }

      const nextGrant = createPartnerGrant({
        id: crypto.randomUUID(),
        categories,
        createdAt: new Date().toISOString(),
      });
      await runtime.grants.save(nextGrant);
      const nextPackage = buildPartnerSharePackage({
        grant: nextGrant,
        ...(predictionWindow ? { predictionWindow } : {}),
        ...(cyclePhase.trim() ? { cyclePhase: cyclePhase.trim() } : {}),
        ...(selectedReminder.trim() ? { selectedReminder: selectedReminder.trim() } : {}),
        ...(selectedWellness.trim() ? { selectedWellness: selectedWellness.trim() } : {}),
      });
      setGrant(nextGrant);
      setSharePackage(nextPackage);
      setStatus('Sharing grant saved locally · encrypted');
    } catch (cause) {
      setGrant(null);
      setSharePackage(null);
      setError(cause instanceof Error ? cause.message : 'Sreva could not prepare the reviewed sharing package.');
    }
  };

  const share = async () => {
    if (!sharePackage) return;
    setError('');
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Sreva shared summary', text: sharePackage.shareText });
        setStatus('Reviewed summary handed to the system share sheet');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharePackage.shareText);
        setStatus('Reviewed summary copied locally');
      } else {
        throw new Error('This browser has no reviewed share or clipboard mechanism available.');
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'Sreva could not hand off the reviewed summary.');
    }
  };

  const revoke = async () => {
    const runtime = runtimeRef.current;
    if (!runtime || !grant) return;
    const revoked = revokePartnerGrant(grant, new Date().toISOString());
    await runtime.grants.save(revoked);
    setGrant(revoked);
    setSharePackage(null);
    setStatus('Local sharing grant revoked');
  };

  return (
    <section className="account-free-core" data-testid="sharing-workspace" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{status}</StatusChip>
        <span className="workspace-note">Account-free · explicit preview · no partner live access</span>
      </div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {ready ? (
        <div className="workspace-grid">
          <Card eyebrow="Partner sharing" title="Choose exactly what to share">
            <fieldset>
              <legend>Allowed V1 categories</legend>
              {PARTNER_SHARE_CATEGORIES.map((category) => (
                <label key={category} className="core-check-row">
                  <input type="checkbox" checked={categories.includes(category)} onChange={(event) => toggleCategory(category, event.target.checked)} />
                  <span>{LABELS[category]}</span>
                </label>
              ))}
            </fieldset>
            {categories.includes('cyclePhase') ? <label><span>Cycle phase / day</span><input aria-label="Cycle phase or day" value={cyclePhase} onChange={(event) => { setCyclePhase(event.target.value); invalidatePreview(); }} /></label> : null}
            {categories.includes('selectedReminder') ? <label><span>Selected reminder</span><input aria-label="Selected reminder" value={selectedReminder} onChange={(event) => { setSelectedReminder(event.target.value); invalidatePreview(); }} /></label> : null}
            {categories.includes('selectedWellness') ? <label><span>Selected wellness summary</span><input aria-label="Selected wellness summary" value={selectedWellness} onChange={(event) => { setSelectedWellness(event.target.value); invalidatePreview(); }} /></label> : null}
            <p className="workspace-note">Sexual activity, private notes, fertility tests and pregnancy data are not partner-sharing categories in V1.</p>
            <Button onClick={() => { void prepare(); }}>Create reviewed preview</Button>
          </Card>

          <Card eyebrow="Review before handoff" title="Shared summary">
            {!sharePackage ? <p>No partner content is available to share until you create and review a local preview.</p> : (
              <>
                <pre data-testid="partner-share-preview" style={{ whiteSpace: 'pre-wrap' }}>{sharePackage.summary}</pre>
                <div aria-label="Local QR code" data-testid="partner-share-qr">
                  <QRCodeSVG value={sharePackage.qrPayload} size={196} level="M" marginSize={4} />
                </div>
                <p className="workspace-note">The QR is rendered in this browser from the reviewed text. No QR service receives it.</p>
                <div className="core-actions">
                  <Button onClick={() => { void share(); }}>Share reviewed summary</Button>
                  <Button variant="quiet" onClick={() => { void revoke(); }}>Revoke local grant</Button>
                </div>
                <p className="workspace-note">Revocation stops future use of this local grant. It cannot erase a manual copy, screenshot or QR that was already shared.</p>
              </>
            )}
          </Card>
        </div>
      ) : null}
    </section>
  );
}
