'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { StatusChip } from '../../components/ui/StatusChip';
import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import type { PredictionResult } from '../../domain/prediction/types';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { CalendarCorePanel, type CalendarMode } from '../calendar/CalendarCorePanel';
import { CalendarHistory, type YearHistoryGroup } from '../calendar/calendar-history';
import { CycleCorePanel } from '../cycle/CycleCorePanel';
import { ObservationActions } from '../cycle/observation-actions';
import { PeriodActions, type PeriodEdit } from '../cycle/period-actions';
import { HomeCorePanel } from '../home/HomeCorePanel';
import { continuePrivately } from '../onboarding/private-onboarding';
import { LogCorePanel } from '../logging/LogCorePanel';
import { TodayCorePanel } from '../logging/TodayCorePanel';
import { predictFromRepository } from '../predictions/prediction-service';

export const TASK10_CORE_SECTIONS = ['home', 'today', 'log', 'calendar', 'cycle'] as const;
export type Task10CoreSection = (typeof TASK10_CORE_SECTIONS)[number];

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function utcMidnight(dateKey: string): string {
  return `${dateKey}T00:00:00.000Z`;
}

export function AccountFreeWorkspace({ section }: { section: Task10CoreSection }) {
  const today = useMemo(() => localDateKey(), []);
  const [repository, setRepository] = useState<HealthVaultRepository | null>(null);
  const [vaultStatus, setVaultStatus] = useState('Opening encrypted local vault…');
  const [error, setError] = useState('');
  const [periods, setPeriods] = useState<PeriodEpisode[]>([]);
  const [observations, setObservations] = useState<HealthObservation[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [revision, setRevision] = useState(0);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarPeriods, setCalendarPeriods] = useState<PeriodEpisode[]>([]);
  const [yearGroups, setYearGroups] = useState<YearHistoryGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());

    void continuePrivately(vault)
      .then(() => {
        if (cancelled) return;
        setRepository(new HealthVaultRepository(vault));
        setVaultStatus('Encrypted local vault ready');
      })
      .catch(() => {
        if (!cancelled) {
          setVaultStatus('Local vault unavailable');
          setError('Sreva could not open the encrypted local vault in this browser.');
        }
      });

    return () => {
      cancelled = true;
      vault.lock();
    };
  }, []);

  const refresh = useCallback(async (activeRepository: HealthVaultRepository) => {
    const [nextPeriods, nextObservations, nextPrediction] = await Promise.all([
      activeRepository.listPeriods(),
      activeRepository.listObservations(),
      predictFromRepository(activeRepository, new Date().toISOString()),
    ]);
    setPeriods(nextPeriods);
    setObservations(nextObservations);
    setPrediction(nextPrediction);
  }, []);

  useEffect(() => {
    if (!repository) return;
    void refresh(repository).catch(() => setError('Sreva could not read the encrypted local health history.'));
  }, [repository, refresh, revision]);

  useEffect(() => {
    if (!repository || section !== 'calendar') return;
    const history = new CalendarHistory(repository);
    void (async () => {
      if (calendarMode === 'month') {
        setCalendarPeriods(await history.month(selectedYear, selectedMonth));
        setYearGroups([]);
      } else if (calendarMode === 'timeline') {
        setCalendarPeriods(await history.timeline());
        setYearGroups([]);
      } else {
        setCalendarPeriods([]);
        setYearGroups(await history.year());
      }
    })().catch(() => setError('Sreva could not prepare the local calendar history.'));
  }, [repository, section, calendarMode, selectedYear, selectedMonth, revision]);

  const mutate = useCallback(async (operation: (activeRepository: HealthVaultRepository) => Promise<void>) => {
    if (!repository) return;
    setError('');
    try {
      await operation(repository);
      setRevision((value) => value + 1);
      setVaultStatus('Saved locally · encrypted');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Local health update failed.');
    }
  }, [repository]);

  const startPeriodToday = () => void mutate(async (activeRepository) => {
    await new PeriodActions(activeRepository).startPeriod(utcMidnight(today));
  });

  const endPeriodToday = (id: string) => void mutate(async (activeRepository) => {
    await new PeriodActions(activeRepository).endPeriod(id, utcMidnight(today));
  });

  const editPeriod = (id: string, edit: PeriodEdit) => void mutate(async (activeRepository) => {
    await new PeriodActions(activeRepository).editPeriod(id, edit);
  });

  const deletePeriod = (id: string) => void mutate(async (activeRepository) => {
    await new PeriodActions(activeRepository).deletePeriod(id);
  });

  const logObservation = (kind: HealthObservation['kind'], note?: string) => void mutate(async (activeRepository) => {
    await new ObservationActions(activeRepository).logObservation({
      kind,
      occurredAt: new Date().toISOString(),
      ...(note ? { note } : {}),
    });
  });

  const deleteObservation = (id: string) => void mutate(async (activeRepository) => {
    await new ObservationActions(activeRepository).deleteObservation(id);
  });

  return (
    <section className="account-free-core" data-testid="account-free-core" aria-busy={repository == null}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : repository ? 'success' : 'info'}>{vaultStatus}</StatusChip>
        <span className="workspace-note">Account-free · no health telemetry · local authoritative data</span>
      </div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {section === 'home' ? <HomeCorePanel periods={periods} observations={observations} prediction={prediction} onStartPeriodToday={startPeriodToday} /> : null}
      {section === 'today' ? <TodayCorePanel observations={observations} today={today} /> : null}
      {section === 'log' ? <LogCorePanel observations={observations} onLog={logObservation} onDelete={deleteObservation} /> : null}
      {section === 'calendar' ? (
        <CalendarCorePanel
          mode={calendarMode}
          periods={calendarPeriods}
          yearGroups={yearGroups}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onModeChange={setCalendarMode}
          onMonthChange={(year, month) => {
            setSelectedYear(year);
            setSelectedMonth(month);
          }}
        />
      ) : null}
      {section === 'cycle' ? (
        <CycleCorePanel
          periods={periods}
          onStartPeriodToday={startPeriodToday}
          onEndPeriod={endPeriodToday}
          onEditPeriod={editPeriod}
          onDeletePeriod={deletePeriod}
        />
      ) : null}
    </section>
  );
}
