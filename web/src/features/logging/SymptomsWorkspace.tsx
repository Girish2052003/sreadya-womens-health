import { StructuredObservationWorkspace } from './StructuredObservationWorkspace';

const kinds = [
  'cramps', 'headache', 'migraine', 'backPain', 'breastTenderness', 'bloating',
  'acne', 'nausea', 'digestion', 'fatigue', 'dizziness', 'custom',
] as const;

export function SymptomsWorkspace() {
  return <StructuredObservationWorkspace config={{
    eyebrow: 'Symptoms',
    title: 'Record symptoms without turning them into diagnoses',
    summary: 'Choose the symptom, optional severity, date/time, value and private context. Sreadya stores your observation; it does not invent a medical cause.',
    kinds,
  }} />;
}
