'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DexieSyncQueuePersistence, SyncQueue } from '../../sync/queue';

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SREVA_SYNC_BASE_URL ?? '').replace(/\/$/, '');
}

export function SyncWorkspace() {
  const endpoint = useMemo(baseUrl, []);
  const queueRef = useRef<SyncQueue | null>(null);
  const [pending, setPending] = useState(0);
  const [cursor, setCursor] = useState('');
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState('Reading local sync queue…');

  const refresh = async (queue: SyncQueue) => {
    setPending((await queue.listPending()).length);
    setCursor(await queue.getCursor());
    setPaused(await queue.isPaused());
  };

  useEffect(() => {
    const queue = new SyncQueue(new DexieSyncQueuePersistence());
    queueRef.current = queue;
    void refresh(queue).then(() => setStatus('Local sync queue ready')).catch(() => setStatus('Local sync queue unavailable'));
    return () => { queueRef.current = null; };
  }, []);

  const run = async (action: 'pause' | 'resume' | 'disable') => {
    const queue = queueRef.current;
    if (!queue) return;
    if (action === 'pause') await queue.pause();
    if (action === 'resume') await queue.resume();
    if (action === 'disable') await queue.disable();
    await refresh(queue);
    setStatus(action === 'pause' ? 'Synchronization paused locally' : action === 'resume' ? 'Synchronization resumed locally' : 'Synchronization disabled and local sync queue cleared');
  };

  return (
    <div className="workspace-grid">
      <Card eyebrow="Encrypted continuity" title="Sync status">
        <div className="continuity-state"><strong>Service endpoint</strong>{endpoint ? 'Configured for this build' : 'Not configured on this static deployment'}</div>
        <div className="continuity-state"><strong>Local queue</strong>{pending} encrypted change(s) pending · {paused ? 'paused' : 'active'}</div>
        <div className="continuity-state"><strong>Last pull cursor</strong>{cursor || 'No remote sync completed yet'}</div>
        <p role="status">{status}</p>
      </Card>
      <Card eyebrow="Local sync controls" title="Pause, resume or disable">
        <p>These controls affect only the local encrypted continuity queue. Disabling sync never deletes the local health vault.</p>
        <div className="continuity-actions">
          <Button variant="secondary" onClick={() => { void run('pause'); }}>Pause sync</Button>
          <Button variant="secondary" onClick={() => { void run('resume'); }}>Resume sync</Button>
          <Button variant="quiet" onClick={() => { void run('disable'); }}>Disable sync</Button>
        </div>
        {!endpoint ? <p className="workspace-note">Remote upload/download is unavailable until an approved Sreva sync service is configured. The UI reports that boundary instead of claiming a successful server sync.</p> : null}
      </Card>
    </div>
  );
}
