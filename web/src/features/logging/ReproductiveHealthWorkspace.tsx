import { StructuredObservationWorkspace } from './StructuredObservationWorkspace';

const kinds = [
  'menstrualFlow', 'vaginalDischarge', 'cervicalMucus', 'basalBodyTemperature',
  'ovulationTest', 'pregnancyTest', 'sexualActivity', 'protection', 'contraception',
] as const;

export function ReproductiveHealthWorkspace() {
  return <StructuredObservationWorkspace config={{
    eyebrow: 'Reproductive observations',
    title: 'Optional, private reproductive-health context',
    summary: 'Flow, discharge, cervical mucus, temperature, test results, sexual activity, protection and contraception are optional and remain encrypted locally unless you explicitly export or enable reviewed encrypted continuity.',
    kinds,
  }} />;
}
