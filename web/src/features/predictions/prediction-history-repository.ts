import { evaluatePredictionHistory, type PredictionEvaluation, type PredictionOutcome } from '../../domain/prediction/prediction-history';
import type { PeriodEpisode } from '../../domain/cycle/types';
import type { VaultService } from '../../vault/vault-service';
import type { PredictionResult } from './prediction-engine';

const HISTORY_ID = 'intelligence:prediction-history:v1';

export type StoredPrediction = {
  id: string;
  createdAt: string;
  inputPeriodStarts: string[];
  prediction: PredictionResult;
};

function isStoredPrediction(value: unknown): value is StoredPrediction {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredPrediction>;
  return typeof candidate.id === 'string'
    && typeof candidate.createdAt === 'string'
    && Array.isArray(candidate.inputPeriodStarts)
    && candidate.inputPeriodStarts.every((item) => typeof item === 'string')
    && Boolean(candidate.prediction)
    && candidate.prediction?.algorithmVersion === 'prediction-v1';
}

export class PredictionHistoryRepository {
  constructor(private readonly vault: VaultService) {}

  async list(): Promise<StoredPrediction[]> {
    const ids = await this.vault.listRecordIds();
    if (!ids.includes(HISTORY_ID)) return [];
    const stored = await this.vault.read<unknown>(HISTORY_ID);
    if (!Array.isArray(stored) || stored.some((item) => !isStoredPrediction(item))) {
      throw new Error('Invalid local prediction history.');
    }
    return stored;
  }

  async record(prediction: PredictionResult, periods: PeriodEpisode[], createdAt: string): Promise<StoredPrediction[]> {
    const starts = periods.map((period) => period.start.slice(0, 10)).sort();
    const signature = `${prediction.algorithmVersion}:${starts.join(',')}`;
    const current = await this.list();
    if (current.some((item) => item.id === signature)) return current;

    const next = [...current, { id: signature, createdAt, inputPeriodStarts: starts, prediction }].slice(-100);
    await this.vault.write(HISTORY_ID, next);
    return next;
  }

  evaluate(history: StoredPrediction[], periods: PeriodEpisode[]): PredictionEvaluation {
    const starts = periods.map((period) => period.start.slice(0, 10)).sort();
    const outcomes: PredictionOutcome[] = [];

    for (const item of history) {
      const latestInput = item.inputPeriodStarts.at(-1);
      if (!latestInput) continue;
      const actualStart = starts.find((start) => start > latestInput);
      if (actualStart) outcomes.push({ prediction: item.prediction, actualStart });
    }
    return evaluatePredictionHistory(outcomes);
  }
}
