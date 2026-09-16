export type PeriodEpisodeInvariantInput = {
  id: string;
  start: string;
  end?: string | null;
  source: string;
};

export function assertValidPeriodEpisode(episode: PeriodEpisodeInvariantInput): void {
  if (episode.end !== undefined && episode.end !== null) {
    if (Date.parse(episode.end) < Date.parse(episode.start)) {
      throw new Error('Period end cannot be before start.');
    }
  }
}

export function assertPeriodDoesNotOverlap(
  candidate: PeriodEpisodeInvariantInput,
  existing: readonly PeriodEpisodeInvariantInput[],
): void {
  const candidateStart = Date.parse(candidate.start);
  const candidateEnd = Date.parse(candidate.end ?? candidate.start);

  for (const period of existing) {
    if (period.id === candidate.id) continue;

    const periodStart = Date.parse(period.start);
    const periodEnd = Date.parse(period.end ?? period.start);
    const overlaps = candidateEnd >= periodStart && periodEnd >= candidateStart;

    if (overlaps) {
      throw new Error('Period episodes cannot overlap without an explicit merge.');
    }
  }
}
