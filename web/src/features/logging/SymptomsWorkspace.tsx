import { StructuredObservationWorkspace } from './StructuredObservationWorkspace';

const kinds = ['cramps', 'headache', 'migraine', 'backPain', 'breastTenderness', 'bloating', 'acne', 'nausea', 'digestion', 'fatigue', 'dizziness', 'custom'] as const;

export function SymptomsWorkspace() {
  return <StructuredObservationWorkspace config={{
    eyebrowKey: 'structured.symptoms.eyebrow',
    titleKey: 'structured.symptoms.title',
    summaryKey: 'structured.symptoms.summary',
    kinds,
  }} />;
}
