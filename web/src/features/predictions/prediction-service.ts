import type { CycleRepository } from '../../domain/cycle/repository';
import type { PredictionResult } from './prediction-engine';

export async function predictFromRepository(
  _repository: CycleRepository,
  _createdAt: string,
): Promise<PredictionResult | null> {
  void _repository;
  void _createdAt;
  return null;
}
