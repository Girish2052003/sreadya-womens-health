import type { PredictionResult } from './prediction-engine';

export function PredictionCorePanel({ prediction: _prediction }: { prediction: PredictionResult | null }) {
  void _prediction;
  return <section data-testid="prediction-core-panel" />;
}
