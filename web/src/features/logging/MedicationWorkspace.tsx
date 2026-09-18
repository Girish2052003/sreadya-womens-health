import { StructuredObservationWorkspace } from './StructuredObservationWorkspace';

const kinds = ['medication', 'supplement', 'contraception'] as const;

export function MedicationWorkspace() {
  return <StructuredObservationWorkspace config={{
    eyebrowKey: 'structured.medication.eyebrow',
    titleKey: 'structured.medication.title',
    summaryKey: 'structured.medication.summary',
    kinds,
  }} />;
}
