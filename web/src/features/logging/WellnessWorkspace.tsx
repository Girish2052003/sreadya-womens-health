import { StructuredObservationWorkspace } from './StructuredObservationWorkspace';

const kinds = [
  'appetite', 'cravings', 'sleep', 'energy', 'stress', 'mood', 'anxiety',
  'irritability', 'libido', 'weight', 'exercise', 'water', 'dailyNote',
] as const;

export function WellnessWorkspace() {
  return <StructuredObservationWorkspace config={{
    eyebrow: 'Wellness',
    title: 'Daily context that belongs to you',
    summary: 'Track mood, sleep, energy, appetite, exercise, hydration, weight or a private daily note. Add a numeric value and unit only when it is useful.',
    kinds,
  }} />;
}
