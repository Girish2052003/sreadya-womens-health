import { StructuredObservationWorkspace } from './StructuredObservationWorkspace';

const kinds = ['appetite', 'cravings', 'sleep', 'energy', 'stress', 'mood', 'anxiety', 'irritability', 'libido', 'weight', 'exercise', 'water', 'dailyNote'] as const;

export function WellnessWorkspace() {
  return <StructuredObservationWorkspace config={{
    eyebrowKey: 'structured.wellness.eyebrow',
    titleKey: 'structured.wellness.title',
    summaryKey: 'structured.wellness.summary',
    kinds,
  }} />;
}
