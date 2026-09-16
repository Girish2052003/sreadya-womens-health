import vectors from '../../../../shared/reminders/test-vectors/reminder-v1.json';
import { describe, expect, it } from 'vitest';

import { notificationBody, planPeriodReminders } from './reminder-policy';

describe('reminder-v1 shared conformance', () => {
  it('matches every shared reminder plan vector exactly', () => {
    for (const testCase of vectors.cases) {
      expect(
        planPeriodReminders({
          predictedDate: testCase.predictedDate,
          sourcePredictionId: testCase.sourcePredictionId,
          now: testCase.now,
          settings: testCase.settings,
        }),
        testCase.id,
      ).toEqual(testCase.expectedPlans);
    }
  });

  it('matches every frozen notification privacy body', () => {
    for (const copy of vectors.notificationBodies) {
      expect(notificationBody(copy.daysBefore, copy.privacy), copy.id).toBe(copy.body);
    }
  });
});
