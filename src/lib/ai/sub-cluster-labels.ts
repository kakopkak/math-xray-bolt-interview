type StepBucket = 'early' | 'middle' | 'late' | 'unknown';
type ErrorDimension = 'procedural' | 'conceptual' | 'mixed';

type BuildSubClusterLabelsInput = {
  misconceptionCode: string;
  dominantErrorDimension: ErrorDimension;
  firstWrongStepBucket: StepBucket;
};

const BUCKET_LABELS_ET: Record<StepBucket, string> = {
  early: 'varases sammus',
  middle: 'keskmises sammus',
  late: 'hilises sammus',
  unknown: 'määramata sammus',
};

const DIMENSION_LABELS_EN: Record<ErrorDimension, string> = {
  procedural: 'Procedural drift',
  conceptual: 'Conceptual gap',
  mixed: 'Mixed reasoning gap',
};

const DIMENSION_LABELS_ET: Record<ErrorDimension, string> = {
  procedural: 'Protseduuriline viga',
  conceptual: 'Mõisteline lünk',
  mixed: 'Segatüüpi lünk',
};

const HINT_BY_DIMENSION_ET: Record<ErrorDimension, string> = {
  procedural: 'Harjuta lühikesi sammukontrolle enne järgmist teisendust.',
  conceptual: 'Korda reegli tähendust enne arvutamist ja põhjenda valik suuliselt.',
  mixed: 'Jaga lahendus etappideks ja kontrolli iga etapi eesmärki eraldi.',
};

export function buildSubClusterLabels(input: BuildSubClusterLabelsInput) {
  const dimensionLabelEn = DIMENSION_LABELS_EN[input.dominantErrorDimension];
  const dimensionLabelEt = DIMENSION_LABELS_ET[input.dominantErrorDimension];
  const bucketEt = BUCKET_LABELS_ET[input.firstWrongStepBucket];
  return {
    label: `${dimensionLabelEn} (${input.misconceptionCode})`,
    labelEt: `${dimensionLabelEt} ${bucketEt}`.trim(),
    dominantPattern: `${input.dominantErrorDimension} · ${input.firstWrongStepBucket}`,
    remediationHint: HINT_BY_DIMENSION_ET[input.dominantErrorDimension],
  };
}