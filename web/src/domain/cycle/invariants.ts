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
