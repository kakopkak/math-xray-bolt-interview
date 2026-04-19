export interface MisconceptionType {
  code: string;
  category: string;
  dimension: 'procedural' | 'conceptual' | 'mixed';
  label: string;
  labelEt: string;
  description: string;
  descriptionEt: string;
  severity: 'minor' | 'major' | 'fundamental';
  prerequisiteConcept: string;
  conceptTags: string[];
  dependsOn: string[];
  stageHint: 'setup' | 'transformation' | 'solve' | 'verify';
  exampleError: string;
  correctApproach: string;
}

export type AssignmentTopic =
  | 'quadratic_equations'
  | 'linear_equations'
  | 'fractions';

export const TOPIC_CATALOG: Array<{
  value: AssignmentTopic;
  label: string;
  labelEt: string;
}> = [
  {
    value: 'quadratic_equations',
    label: 'Quadratic equations',
    labelEt: 'Ruutvõrrandid',
  },
  {
    value: 'linear_equations',
    label: 'Linear equations',
    labelEt: 'Lineaarvõrrandid',
  },
  {
    value: 'fractions',
    label: 'Fractions',
    labelEt: 'Murrud',
  },
];

export const QUADRATIC_TAXONOMY = [
  {
    code: 'QE_SIGN_ERROR',
    category: 'algebraic_manipulation',
    dimension: 'procedural',
    label: 'Sign error when solving',
    labelEt: 'Märgiviga lahendamisel',
    description: 'Student makes a sign error when isolating the variable or extracting roots from factors.',
    descriptionEt: 'Õpilane teeb märgivea muutuja eraldamisel või tegurite juurte leidmisel.',
    severity: 'major',
    prerequisiteConcept: 'Additive inverse / zero product property',
    conceptTags: ['sign-discipline', 'zero-product'],
    dependsOn: ['QE_INCOMPLETE_FACTOR'],
    stageHint: 'solve',
    exampleError: '(x+3)(x-2) = 0 → x = 3, x = 2 (wrong signs)',
    correctApproach: '(x+3)(x-2) = 0 → x = -3, x = 2',
  },
  {
    code: 'QE_INCOMPLETE_FACTOR',
    category: 'factoring',
    dimension: 'conceptual',
    label: 'Incomplete or incorrect factoring',
    labelEt: 'Puudulik või vale tegurdamine',
    description: 'Student attempts to factor but does not complete the factoring correctly.',
    descriptionEt: 'Õpilane üritab tegurdada, kuid ei vii tegurdamist õigesti lõpuni.',
    severity: 'major',
    prerequisiteConcept: 'Factoring trinomials',
    conceptTags: ['factoring-structure', 'pattern-recognition'],
    dependsOn: ['QE_SIGN_ERROR'],
    stageHint: 'transformation',
    exampleError: 'x² + 5x + 6 = 0 → x(x+5) = -6 instead of (x+2)(x+3) = 0',
    correctApproach: 'x² + 5x + 6 = 0 → (x+2)(x+3) = 0 → x = -2, x = -3',
  },
  {
    code: 'QE_FORMULA_MISREMEMBER',
    category: 'quadratic_formula',
    dimension: 'conceptual',
    label: 'Quadratic formula recalled incorrectly',
    labelEt: 'Ruutvalem meenub valesti',
    description: 'Student uses the quadratic formula but with wrong components (e.g., b²+4ac instead of b²-4ac).',
    descriptionEt: 'Õpilane kasutab ruutvalemit, kuid valede komponentidega.',
    severity: 'major',
    prerequisiteConcept: 'Quadratic formula memorization and derivation',
    conceptTags: ['formula-structure', 'discriminant'],
    dependsOn: ['QE_ARITHMETIC'],
    stageHint: 'solve',
    exampleError: 'x = (-b ± √(b²+4ac)) / 2a (wrong sign under radical)',
    correctApproach: 'x = (-b ± √(b²-4ac)) / 2a',
  },
  {
    code: 'QE_SQRT_BOTH_SIDES',
    category: 'solving_technique',
    dimension: 'conceptual',
    label: 'Loses root when taking square root',
    labelEt: 'Kaotab juure ruutjuure võtmisel',
    description: 'Student takes square root of both sides but forgets the ± (negative root).',
    descriptionEt: 'Õpilane võtab mõlemast poolest ruutjuure, kuid unustab ± (negatiivse juure).',
    severity: 'fundamental',
    prerequisiteConcept: 'Square root produces two values',
    conceptTags: ['inverse-operations', 'solution-set'],
    dependsOn: ['QE_SIGN_ERROR'],
    stageHint: 'solve',
    exampleError: 'x² = 9 → x = 3 (forgets x = -3)',
    correctApproach: 'x² = 9 → x = ±3 → x = 3 or x = -3',
  },
  {
    code: 'QE_DIVISION_BY_X',
    category: 'solving_technique',
    dimension: 'conceptual',
    label: 'Divides by variable (loses solution)',
    labelEt: 'Jagamine muutujaga (kaotab lahendi)',
    description: 'Student divides both sides by x, losing the x=0 solution.',
    descriptionEt: 'Õpilane jagab mõlemad pooled x-iga, kaotades lahendi x=0.',
    severity: 'fundamental',
    prerequisiteConcept: 'Cannot divide by variable that might be zero',
    conceptTags: ['domain-awareness', 'solution-preservation'],
    dependsOn: ['QE_WRONG_METHOD'],
    stageHint: 'transformation',
    exampleError: 'x² = 3x → x = 3 (loses x = 0)',
    correctApproach: 'x² - 3x = 0 → x(x-3) = 0 → x = 0 or x = 3',
  },
  {
    code: 'QE_ARITHMETIC',
    category: 'arithmetic',
    dimension: 'procedural',
    label: 'Basic arithmetic error',
    labelEt: 'Arvutusviga',
    description: 'Student makes a simple calculation mistake (addition, multiplication, etc.).',
    descriptionEt: 'Õpilane teeb lihtsa arvutusvea (liitmine, korrutamine jne).',
    severity: 'minor',
    prerequisiteConcept: 'Basic arithmetic operations',
    conceptTags: ['calculation-fluency'],
    dependsOn: [],
    stageHint: 'transformation',
    exampleError: '(-3)² = -9 or 2×4 = 6',
    correctApproach: '(-3)² = 9, 2×4 = 8',
  },
  {
    code: 'QE_WRONG_METHOD',
    category: 'method_selection',
    dimension: 'conceptual',
    label: 'Applies inappropriate solution method',
    labelEt: 'Kasutab vale lahendusmeetodit',
    description: 'Student applies a linear equation method to a quadratic, or uses completing the square incorrectly.',
    descriptionEt: 'Õpilane rakendab lineaarvõrrandi meetodit ruutvõrrandile või kasutab ruudu täiendamist valesti.',
    severity: 'major',
    prerequisiteConcept: 'Recognizing equation type and selecting appropriate method',
    conceptTags: ['method-choice', 'equation-classification'],
    dependsOn: ['QE_FORMULA_MISREMEMBER', 'QE_INCOMPLETE_FACTOR'],
    stageHint: 'setup',
    exampleError: '2x² + 4x - 6 = 0 → 2x = 6 → x = 3 (treated as linear)',
    correctApproach: 'Recognize quadratic form, use factoring/formula/completing the square',
  },
  {
    code: 'QE_NO_ERROR',
    category: 'correct',
    dimension: 'mixed',
    label: 'Correct solution',
    labelEt: 'Korrektne lahendus',
    description: 'The solution is correct with no misconceptions detected.',
    descriptionEt: 'Lahendus on korrektne, väärarusaamu ei tuvastatud.',
    severity: 'minor', // won't be used for clustering
    prerequisiteConcept: '',
    conceptTags: ['mastery'],
    dependsOn: [],
    stageHint: 'verify',
    exampleError: '',
    correctApproach: '',
  },
] as const satisfies readonly MisconceptionType[];

export const LINEAR_TAXONOMY = [
  {
    code: 'LE_SIGN_ERROR',
    category: 'algebraic_manipulation',
    dimension: 'procedural',
    label: 'Sign error in linear solving',
    labelEt: 'Märgiviga lineaarvõrrandi lahendamisel',
    description: 'Student changes signs incorrectly while moving terms across the equation.',
    descriptionEt: 'Õpilane muudab liikmete märgid valesti võrrandi teisele poole viimisel.',
    severity: 'major',
    prerequisiteConcept: 'Equivalent transformations',
    conceptTags: ['sign-discipline', 'equation-balance'],
    dependsOn: ['LE_INVERSE_OPERATION'],
    stageHint: 'transformation',
    exampleError: '3x + 5 = 14 -> 3x = 14 + 5',
    correctApproach: '3x + 5 = 14 -> 3x = 14 - 5',
  },
  {
    code: 'LE_INVERSE_OPERATION',
    category: 'method_selection',
    dimension: 'conceptual',
    label: 'Wrong inverse operation',
    labelEt: 'Vale pöördtehe',
    description: 'Student chooses an operation that does not isolate the variable.',
    descriptionEt: 'Õpilane valib tehte, mis ei eralda muutujat.',
    severity: 'major',
    prerequisiteConcept: 'Inverse operations',
    conceptTags: ['inverse-operations'],
    dependsOn: ['LE_SIGN_ERROR'],
    stageHint: 'solve',
    exampleError: '4x = 20 -> x = 20 - 4',
    correctApproach: '4x = 20 -> x = 20 / 4',
  },
  {
    code: 'LE_DISTRIBUTION_ERROR',
    category: 'algebraic_manipulation',
    dimension: 'procedural',
    label: 'Distribution mistake',
    labelEt: 'Jaotusseaduse viga',
    description: 'Student distributes multiplication over parentheses incorrectly.',
    descriptionEt: 'Õpilane rakendab jaotusseadust sulgude avamisel valesti.',
    severity: 'major',
    prerequisiteConcept: 'Distribution over addition/subtraction',
    conceptTags: ['distribution', 'term-structure'],
    dependsOn: ['LE_SIGN_ERROR'],
    stageHint: 'transformation',
    exampleError: '2(x + 3) = 2x + 3',
    correctApproach: '2(x + 3) = 2x + 6',
  },
  {
    code: 'LE_DIVISION_ZERO',
    category: 'method_selection',
    dimension: 'conceptual',
    label: 'Division by zero candidate',
    labelEt: 'Võimalik jagamine nulliga',
    description: 'Student divides by an expression that may be zero, losing valid solutions.',
    descriptionEt: 'Õpilane jagab avaldisega, mis võib olla null, ja kaotab võimalikke lahendeid.',
    severity: 'fundamental',
    prerequisiteConcept: 'Domain restrictions',
    conceptTags: ['domain-awareness', 'solution-preservation'],
    dependsOn: ['LE_INVERSE_OPERATION'],
    stageHint: 'solve',
    exampleError: 'x(x-2)=0 -> divide by x -> x-2=0',
    correctApproach: 'Use zero-product property and keep both branches.',
  },
] as const satisfies readonly MisconceptionType[];

export const FRACTIONS_TAXONOMY = [
  {
    code: 'FR_COMMON_DENOM',
    category: 'fractions',
    dimension: 'conceptual',
    label: 'Wrong common denominator',
    labelEt: 'Vale ühine nimetaja',
    description: 'Student picks or computes a common denominator incorrectly.',
    descriptionEt: 'Õpilane valib või arvutab ühise nimetaja valesti.',
    severity: 'major',
    prerequisiteConcept: 'Least common multiple',
    conceptTags: ['common-denominator', 'fraction-equivalence'],
    dependsOn: ['FR_SIGN_ARITHMETIC'],
    stageHint: 'setup',
    exampleError: '1/4 + 1/6 = 2/10',
    correctApproach: 'Use denominator 12: 1/4 + 1/6 = 3/12 + 2/12 = 5/12',
  },
  {
    code: 'FR_CANCEL_MISUSE',
    category: 'fractions',
    dimension: 'conceptual',
    label: 'Cancelling across addition/subtraction',
    labelEt: 'Taandab liitmise/lahutamise pealt',
    description: 'Student cancels terms across sums, which is not allowed.',
    descriptionEt: 'Õpilane taandab liikmeid liitmise või lahutamise pealt, mis ei ole lubatud.',
    severity: 'fundamental',
    prerequisiteConcept: 'Factoring before cancellation',
    conceptTags: ['cancellation-rules', 'structure-awareness'],
    dependsOn: ['FR_COMMON_DENOM'],
    stageHint: 'transformation',
    exampleError: '(x+2)/x -> 2',
    correctApproach: 'Only cancel common factors, not terms in addition/subtraction.',
  },
  {
    code: 'FR_SIGN_ARITHMETIC',
    category: 'fractions',
    dimension: 'procedural',
    label: 'Sign/arithmetic fraction mistake',
    labelEt: 'Märgi- või arvutusviga murdudega',
    description: 'Student makes an arithmetic or sign error while manipulating fractions.',
    descriptionEt: 'Õpilane teeb murdudega teisendamisel märgi- või arvutusvea.',
    severity: 'minor',
    prerequisiteConcept: 'Integer arithmetic fluency',
    conceptTags: ['sign-discipline', 'calculation-fluency'],
    dependsOn: [],
    stageHint: 'solve',
    exampleError: '-2/3 + 1/3 = -3/3',
    correctApproach: '-2/3 + 1/3 = -1/3',
  },
  {
    code: 'FR_INVERT_MULTIPLY',
    category: 'fractions',
    dimension: 'conceptual',
    label: 'Division by fraction rule error',
    labelEt: 'Murruga jagamise reegli viga',
    description: 'Student does not invert-and-multiply correctly when dividing by a fraction.',
    descriptionEt: 'Õpilane ei rakenda murruga jagamisel õigesti pööramise ja korrutamise reeglit.',
    severity: 'major',
    prerequisiteConcept: 'Reciprocal',
    conceptTags: ['reciprocal', 'operation-rules'],
    dependsOn: ['FR_CANCEL_MISUSE'],
    stageHint: 'solve',
    exampleError: '3/4 ÷ 2/5 = 6/20',
    correctApproach: '3/4 ÷ 2/5 = 3/4 * 5/2 = 15/8',
  },
] as const satisfies readonly MisconceptionType[];

const TOPIC_TAXONOMIES: Record<AssignmentTopic, readonly MisconceptionType[]> = {
  quadratic_equations: QUADRATIC_TAXONOMY,
  linear_equations: [
    ...LINEAR_TAXONOMY,
    QUADRATIC_TAXONOMY.find((item) => item.code === 'QE_NO_ERROR')!,
  ],
  fractions: [
    ...FRACTIONS_TAXONOMY,
    QUADRATIC_TAXONOMY.find((item) => item.code === 'QE_NO_ERROR')!,
  ],
};

export const ALL_MISCONCEPTIONS = Object.values(TOPIC_TAXONOMIES).flatMap((items) => items)
  .reduce<MisconceptionType[]>((result, item) => {
    if (result.some((existing) => existing.code === item.code)) {
      return result;
    }
    result.push(item);
    return result;
  }, []);

export const ALL_MISCONCEPTION_CODES = ALL_MISCONCEPTIONS.map((item) => item.code);

export type MisconceptionCode = (typeof ALL_MISCONCEPTION_CODES)[number];

export function getTaxonomyForTopic(topic: string): readonly MisconceptionType[] {
  if (topic in TOPIC_TAXONOMIES) {
    return TOPIC_TAXONOMIES[topic as AssignmentTopic];
  }
  return QUADRATIC_TAXONOMY;
}

export function getMisconceptionByCode(code: string): MisconceptionType | undefined {
  return ALL_MISCONCEPTIONS.find((m) => m.code === code);
}

export function getMisconceptionConceptTags(code: string): string[] {
  return getMisconceptionByCode(code)?.conceptTags || [];
}

export function getMisconceptionDependencies(code: string): string[] {
  return getMisconceptionByCode(code)?.dependsOn || [];
}

export function getMisconceptionDimension(code: string): MisconceptionType['dimension'] {
  return getMisconceptionByCode(code)?.dimension || 'mixed';
}

export function getTaxonomyCodesString(topic?: string): string {
  const taxonomy = topic ? getTaxonomyForTopic(topic) : ALL_MISCONCEPTIONS;
  return taxonomy.map(
    (m) => `- ${m.code}: ${m.label} (${m.severity}) — e.g. ${m.exampleError}`
  ).join('\n');
}
