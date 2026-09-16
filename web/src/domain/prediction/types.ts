export type PredictionInput = {
  periodStarts: string[];
  completedPeriodDurations: number[];
  createdAt: string;
};

export type PredictionConfidence = 'low' | 'medium' | 'high';

export type PredictionResult = {
  algorithmVersion: 'prediction-v1';
  estimatedCycleLengthDays: number;
  estimatedPeriodDurationDays: number | null;
  mostLikelyDate: string;
  windowStart: string;
  windowEnd: string;
  confidence: PredictionConfidence;
  validIntervals: number[];
  excludedIntervals: number[];
  medianAbsoluteDeviation: number;
};
