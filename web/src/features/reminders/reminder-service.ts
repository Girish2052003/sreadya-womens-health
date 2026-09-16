import type { CycleRepository } from '../../domain/cycle/repository';
import type { PredictionResult } from '../../domain/prediction/types';
import {
  planPeriodReminders,
  type ReminderPlan,
  type ReminderPolicySettings,
} from '../../domain/reminders/reminder-policy';
import { predictFromRepository } from '../predictions/prediction-service';

export type PreparedReminderSchedule = {
  prediction: PredictionResult | null;
  plans: ReminderPlan[];
};

function predictionCreatedAt(nowLocal: string): string {
  return `${nowLocal.slice(0, 19)}Z`;
}

export async function prepareReminderSchedule(
  repository: CycleRepository,
  settings: ReminderPolicySettings,
  nowLocal: string,
): Promise<PreparedReminderSchedule> {
  const prediction = await predictFromRepository(repository, predictionCreatedAt(nowLocal));
  if (!prediction) {
    return { prediction: null, plans: [] };
  }

  return {
    prediction,
    plans: planPeriodReminders({
      predictedDate: prediction.mostLikelyDate,
      sourcePredictionId: `${prediction.algorithmVersion}:${prediction.mostLikelyDate}`,
      now: nowLocal,
      settings,
    }),
  };
}
