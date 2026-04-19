import mongoose from 'mongoose';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { connectDB } from '../lib/mongodb';
import { Assignment } from '../lib/models/assignment';
import { Cluster, type RemediationExercise } from '../lib/models/cluster';
import { Submission, type AnalysisResult, type ExtractedStep } from '../lib/models/submission';
import { clusterByMisconception } from '../lib/ai/cluster-submissions';
import { resolveStudentKey } from '../lib/student-key';
import { buildSubmissionIntelligence } from '../lib/intelligence/submission-intelligence';
import { buildSubmissionMasterySnapshot } from '../lib/intelligence/mastery-snapshot';
import { buildSubmissionDataQuality } from '../lib/intelligence/data-quality';
import { getMisconceptionByCode } from '../lib/taxonomy';

const ASSIGNMENT_TITLE = '[DEMO] Ruutvõrrandid — Kontrolltöö';
const ASSIGNMENT_DESCRIPTION =
  '[DEMO] Näidisandmestik väärarusaamade klasterdamise ja sekkumiste kuvamiseks.';
const DEMO_SEED_MARKER = 'wave2-2-1-demo-seed';

const misconceptionPool = [
  'QE_SIGN_ERROR',
  'QE_INCOMPLETE_FACTOR',
  'QE_FORMULA_MISREMEMBER',
  'QE_SQRT_BOTH_SIDES',
  'QE_DIVISION_BY_X',
  'QE_ARITHMETIC',
  'QE_WRONG_METHOD',
  'QE_NO_ERROR',
] as const;

type MisconceptionCode = (typeof misconceptionPool)[number];

const DEMO_TEACHER_ID = 'default-teacher';
const DEMO_ORGANIZATION_KEY = 'default-school';
const DEMO_CLASS_KEY = '9a';
const DEMO_CLASS_LABEL = '9A';

function loadEnvLocalFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadSeedEnvironment() {
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '..', '..', '.env.local'),
  ];

  for (const candidate of candidates) {
    loadEnvLocalFile(candidate);
  }
}

function buildAnalysis(code: MisconceptionCode): AnalysisResult {
  const isCorrect = code === 'QE_NO_ERROR';

  return {
    overallCorrect: isCorrect,
    finalAnswerCorrect: isCorrect,
    totalSteps: 4,
    correctSteps: isCorrect ? 4 : 2,
    firstErrorStep: isCorrect ? null : 3,
    misconceptions: isCorrect ? [] : [code],
    primaryMisconception: code,
    severityScore: isCorrect ? 0 : 5,
    strengthAreas: isCorrect
      ? ['Kasutas sümboleid ja tehteid korrektselt.']
      : ['Seadis võrrandi algtingimused korrektselt üles.'],
    reasoningType: 'procedural',
  };
}

function buildExtractedSteps(code: MisconceptionCode, index: number): ExtractedStep[] {
  const hasError = code !== 'QE_NO_ERROR';

  return [
    {
      stepNumber: 1,
      content: `x² + ${(index % 4) + 3}x + ${((index % 3) + 2) * 2} = 0`,
      isCorrect: true,
      confidence: 0.95,
      misconceptionCode: 'QE_NO_ERROR',
      misconceptionLabel: 'Correct solution',
      misconceptionLabelEt: 'Korrektne lahendus',
      explanation: 'Võrrand on korrektselt ümber kirjutatud.',
    },
    {
      stepNumber: 2,
      content: 'Valib meetodi ja seab lahenduse üles.',
      isCorrect: true,
      confidence: 0.92,
      misconceptionCode: 'QE_NO_ERROR',
      misconceptionLabel: 'Correct solution',
      misconceptionLabelEt: 'Korrektne lahendus',
      explanation: 'Meetodi valik ja seadistus on üldjoontes korrektne.',
    },
    {
      stepNumber: 3,
      content: hasError ? `Viga sammus (${code})` : 'Algebrailine teisendus püsib korrektsena.',
      isCorrect: !hasError,
      confidence: 0.86,
      misconceptionCode: hasError ? code : 'QE_NO_ERROR',
      misconceptionLabel: hasError ? code : 'Correct solution',
      misconceptionLabelEt: hasError ? code : 'Korrektne lahendus',
      explanation: hasError ? `Näidisandmestiku tüüpiline viga koodiga ${code}.` : 'Viga ei tuvastatud.',
    },
    {
      stepNumber: 4,
      content: hasError ? 'Lõppvastus on puudulik või vale.' : 'Lõppjuured on korrektselt esitatud.',
      isCorrect: !hasError,
      confidence: 0.88,
      misconceptionCode: hasError ? code : 'QE_NO_ERROR',
      misconceptionLabel: hasError ? code : 'Correct solution',
      misconceptionLabelEt: hasError ? code : 'Korrektne lahendus',
      explanation: hasError ? 'Varasem viga kandub lõppvastusesse edasi.' : 'Lõppvastus on korrektne.',
    },
  ];
}

function buildAnalysisMeta(index: number) {
  const variant = index % 6;

  if (variant === 0) {
    return {
      extractionSource: 'heuristic' as const,
      classificationSource: 'heuristic' as const,
      extractionIsComplete: false,
      deterministicGateApplied: true,
      deterministicGateReason: 'demo-low-confidence-scan',
      averageConfidence: 0.44,
      lowConfidenceStepCount: 2,
      analyzedAt: new Date(),
      pipelineVersion: '2026-04-trust-v3',
    };
  }

  if (variant === 1 || variant === 2) {
    return {
      extractionSource: 'ai' as const,
      classificationSource: 'ai' as const,
      extractionIsComplete: true,
      deterministicGateApplied: false,
      deterministicGateReason: '',
      averageConfidence: 0.68,
      lowConfidenceStepCount: 1,
      analyzedAt: new Date(),
      pipelineVersion: '2026-04-trust-v3',
    };
  }

  return {
    extractionSource: 'ai' as const,
    classificationSource: 'ai' as const,
    extractionIsComplete: true,
    deterministicGateApplied: false,
    deterministicGateReason: '',
    averageConfidence: 0.91,
    lowConfidenceStepCount: 0,
    analyzedAt: new Date(),
    pipelineVersion: '2026-04-trust-v3',
  };
}

function buildDemoRemediationExercises(code: string, gradeLevel: number): RemediationExercise[] {
  const taxonomy = getMisconceptionByCode(code);
  if (!taxonomy || code === 'QE_NO_ERROR') {
    return [];
  }

  const deterministicCode = code.toLowerCase();

  return [
    {
      id: `${deterministicCode}-scaffolded`,
      difficulty: 'scaffolded',
      targetMisconception: code,
      prompt: `Grade ${gradeLevel}: Rewrite and correct this mistaken step: ${taxonomy.exampleError}`,
      promptEt: `${gradeLevel}. klass: Kirjuta see vigane samm ümber ja paranda: ${taxonomy.exampleError}`,
      hint: `Keskendu eeldusele "${taxonomy.prerequisiteConcept}" ja kontrolli enne järgmist sammu kõiki märke.`,
      solutionSteps: [
        `Tuvasta täpne väärarusaam: ${taxonomy.labelEt}.`,
        `Võrdle seda õige lähenemisega: ${taxonomy.correctApproach}.`,
        'Kirjuta kogu sammujada õigete tehetega uuesti.',
      ],
    },
    {
      id: `${deterministicCode}-standard`,
      difficulty: 'standard',
      targetMisconception: code,
      prompt: `Solve x² + 7x + 12 = 0 while explicitly avoiding ${taxonomy.label}.`,
      promptEt: `Lahenda x² + 7x + 12 = 0 ja väldi teadlikult viga: ${taxonomy.labelEt}.`,
      hint: 'Kirjuta iga sammu juurde kasutatud reegel enne arvutamist.',
      solutionSteps: [
        'Vali sobiv meetod (tegurdamine või ruutvalem) ja põhjenda valikut.',
        'Tee kõik algebralised sammud hoolikalt, säilitades märgid.',
        'Kontrolli mõlemat juurt algses võrrandis.',
      ],
    },
    {
      id: `${deterministicCode}-transfer`,
      difficulty: 'transfer',
      targetMisconception: code,
      prompt:
        'A rectangle has area 48 m² and side lengths (x + 2) and (x + 6). Build and solve the quadratic equation for x.',
      promptEt:
        'Ristküliku pindala on 48 m² ja küljed on (x + 2) ning (x + 6). Koosta ja lahenda x-i ruutvõrrand.',
      hint: 'Tõlgi tekstülesanne esmalt üheks võrrandiks ja alles siis lahenda.',
      solutionSteps: [
        'Moodusta võrrand (x + 2)(x + 6) = 48 ja vii kõik liikmed ühele poole.',
        'Lahenda saadud ruutvõrrand, jätmata kontrollsamme vahele.',
        'Tõlgenda, milline juur on kontekstis sobiv.',
      ],
    },
  ];
}

async function removeExistingDemoAssignments(session: mongoose.ClientSession) {
  const existingDemoAssignments = await Assignment.find({ seedMarker: DEMO_SEED_MARKER })
    .select('_id')
    .session(session)
    .lean();

  if (existingDemoAssignments.length === 0) {
    return;
  }

  const assignmentIds = existingDemoAssignments.map((assignment) => assignment._id);
  await Submission.deleteMany({ assignmentId: { $in: assignmentIds } }, { session });
  await Cluster.deleteMany({ assignmentId: { $in: assignmentIds } }, { session });
  await Assignment.deleteMany({ _id: { $in: assignmentIds } }, { session });
}

export type SeedDemoAssignmentResult = {
  assignmentId: string;
  submissionCount: number;
  clusterCount: number;
};

export async function seedDemoAssignmentDataset(): Promise<SeedDemoAssignmentResult> {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      await removeExistingDemoAssignments(session);

      const [assignment] = await Assignment.create(
        [
          {
            title: ASSIGNMENT_TITLE,
            topic: 'quadratic_equations',
            gradeLevel: 9,
            teacherId: DEMO_TEACHER_ID,
            organizationKey: DEMO_ORGANIZATION_KEY,
            classKey: DEMO_CLASS_KEY,
            classLabel: DEMO_CLASS_LABEL,
            description: ASSIGNMENT_DESCRIPTION,
            answerKey: 'Lahenda tegurdades või ruutvalemiga ning kontrolli mõlemat juurt.',
            curriculumOutcomes: ['Lahendab ruutvõrrandeid', 'Selgitab lahenduskäiku sammude kaupa'],
            seedMarker: DEMO_SEED_MARKER,
            status: 'active',
            submissionCount: 0,
          },
        ],
        { session }
      );

      const seedSubmissions = Array.from({ length: 18 }).map((_, index) => {
        const misconception = misconceptionPool[index % misconceptionPool.length];
        const studentName = `Õpilane ${index + 1}`;
        const studentKey = resolveStudentKey(studentName);
        const extractedSteps = buildExtractedSteps(misconception, index);
        const analysis = buildAnalysis(misconception);
        const analysisMeta = buildAnalysisMeta(index);
        const intelligence = buildSubmissionIntelligence({
          steps: extractedSteps,
          analysis,
          analysisMeta,
        });
        const masterySnapshot = buildSubmissionMasterySnapshot({
          analysis,
          intelligence,
        });
        const dataQuality = buildSubmissionDataQuality({
          processingStatus: 'complete',
          analysisMeta,
          intelligence,
        });

        return {
          assignmentId: assignment._id,
          assignmentTitle: assignment.title,
          teacherId: DEMO_TEACHER_ID,
          organizationKey: DEMO_ORGANIZATION_KEY,
          classKey: DEMO_CLASS_KEY,
          classLabel: DEMO_CLASS_LABEL,
          topic: assignment.topic,
          gradeLevel: assignment.gradeLevel,
          studentName,
          studentKey,
          studentIdentity: {
            rosterStudentId: null,
            canonicalName: studentName,
            confidence: 'low' as const,
            matchedBy: 'name-heuristic' as const,
          },
          inputType: index % 2 === 0 ? 'typed' : 'photo',
          rawContent:
            index % 2 === 0
              ? `Näidislahendus ${index + 1}`
              : `data:image/png;base64,seeded-demo-content-${index + 1}`,
          extractedSteps,
          analysis,
          analysisMeta,
          intelligence,
          masterySnapshot,
          dataQuality,
          teacherReview: {
            status: 'unreviewed' as const,
            reviewedAt: null,
            note: '',
            overrideMisconceptionCode: null,
            originalMisconceptionCode: analysis.primaryMisconception,
          },
          teacherReviewHistory: [],
          clusterId: null,
          processingStatus: 'complete',
          processingError: '',
        };
      });

      await Submission.insertMany(seedSubmissions, { session });

      const submissions = await Submission.find({ assignmentId: assignment._id }).session(session);
      const clusterPayloads = clusterByMisconception(submissions).map((cluster) => ({
        ...cluster,
        remediationExercises: buildDemoRemediationExercises(cluster.misconceptionCode, assignment.gradeLevel),
        remediationStatus: 'ready' as const,
        remediationError: '',
      }));

      const clusters = await Cluster.insertMany(clusterPayloads, { session });

      const misconceptionToClusterId = new Map(
        clusters.map((cluster) => [cluster.misconceptionCode, cluster._id.toString()])
      );

      const submissionUpdates = submissions
        .map((submission) => {
          const misconceptionCode = submission.analysis?.primaryMisconception || 'QE_NO_ERROR';
          const clusterId = misconceptionToClusterId.get(misconceptionCode);

          if (!clusterId) {
            return null;
          }

          return {
            updateOne: {
              filter: { _id: submission._id },
              update: { $set: { clusterId } },
            },
          };
        })
        .filter(Boolean);

      if (submissionUpdates.length > 0) {
        await Submission.bulkWrite(
          submissionUpdates as {
            updateOne: { filter: { _id: mongoose.Types.ObjectId }; update: { $set: { clusterId: string } } };
          }[],
          { session }
        );
      }

      assignment.submissionCount = seedSubmissions.length;
      assignment.status = 'analyzed';
      await assignment.save({ session });

      return {
        assignmentId: assignment._id.toString(),
        submissionCount: seedSubmissions.length,
        clusterCount: clusters.length,
      };
    });

    if (!result) {
      throw new Error('Demo seed transaction did not produce a result.');
    }

    return result;
  } finally {
    await session.endSession();
  }
}

export async function runSeedScript() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: npm run seed [-- [--help|--dry-run]]');
    console.log('--help     Show this help message and exit.');
    console.log('--dry-run  Validate script wiring without touching the database.');
    return;
  }

  if (args.includes('--dry-run')) {
    console.log('Seed dry run OK: script module resolution and CLI wiring are working.');
    return;
  }

  loadSeedEnvironment();

  if (!process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Create .env.local (cp .env.example .env.local) or export MONGODB_URI before running seed.'
    );
  }

  try {
    const result = await seedDemoAssignmentDataset();
    console.log(
      `Seed complete: ${result.submissionCount} submissions across ${result.clusterCount} clusters for "${ASSIGNMENT_TITLE}".`
    );
  } finally {
    await mongoose.disconnect();
  }
}

function shouldRunSeedScript() {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }

  return /[\\/]src[\\/]scripts[\\/]seed\.(ts|js)$/.test(entrypoint);
}

if (shouldRunSeedScript()) {
  runSeedScript().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed failed: ${message}`);
    process.exit(1);
  });
}
