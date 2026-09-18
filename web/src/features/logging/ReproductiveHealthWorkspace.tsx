import { StructuredObservationWorkspace } from './StructuredObservationWorkspace';

const kinds = ['menstrualFlow', 'vaginalDischarge', 'cervicalMucus', 'basalBodyTemperature', 'ovulationTest', 'pregnancyTest', 'sexualActivity', 'protection', 'contraception'] as const;

export function ReproductiveHealthWorkspace() {
  return <StructuredObservationWorkspace config={{
    eyebrowKey: 'structured.reproductive.eyebrow',
    titleKey: 'structured.reproductive.title',
    summaryKey: 'structured.reproductive.summary',
    kinds,
  }} />;
}
