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
  _candidate: PeriodEpisodeInvariantInput,
  _existing: readonly PeriodEpisodeInvariantInput[],
): void {
  // Intentionally empty while the Task 9 RED test proves the overlap guard.
}
