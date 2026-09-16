export type PeriodEpisodeInvariantInput = {
  id: string;
  start: string;
  end?: string | null;
  source: string;
};

export function assertValidPeriodEpisode(_episode: PeriodEpisodeInvariantInput): void {
  // Intentionally empty while the Task 9 RED test proves the missing invariant.
}
