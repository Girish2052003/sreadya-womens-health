import { StructuredObservationWorkspace } from './StructuredObservationWorkspace';

const kinds = ['medication', 'supplement', 'contraception'] as const;

export function MedicationWorkspace() {
  return <StructuredObservationWorkspace config={{
    eyebrow: 'Medication',
    title: 'Medication, supplements & contraception context',
    summary: 'Record what you took or the context you want to remember. This is a personal log, not a prescribing or pharmacy service.',
    kinds,
  }} />;
}
