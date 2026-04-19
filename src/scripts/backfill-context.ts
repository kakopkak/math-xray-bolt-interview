import mongoose from 'mongoose';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { connectDB } from '../lib/mongodb';
import { normalizeOrganizationKey, resolveClassContext } from '../lib/class-key';
import { Assignment } from '../lib/models/assignment';
import { Submission } from '../lib/models/submission';
import { resolveTeacherRequestContext } from '../lib/request-context';
import { resolveStudentKey } from '../lib/student-key';
import type { AssignmentTopic } from '../lib/taxonomy';

const DEFAULT_TOPIC: AssignmentTopic = 'quadratic_equations';
const DEFAULT_TAXONOMY_VERSION = '2026-04-topic-v1';
const ASSIGNMENT_TOPICS: AssignmentTopic[] = [
  'quadratic_equations',
  'linear_equations',
  'fractions',
];

type AssignmentRow = {
  _id: mongoose.Types.ObjectId;
  title?: string;
  gradeLevel?: number;
  classLabel?: string;
  classKey?: string;
  organizationKey?: string;
  teacherId?: string;
  topic?: string;
  taxonomyVersion?: string;
};

type SubmissionRow = {
  _id: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  assignmentTitle?: string;
  teacherId?: string;
  organizationKey?: string;
  classLabel?: string;
  classKey?: string;
  topic?: string;
  gradeLevel?: number;
  studentName?: string;
  studentKey?: string;
};

type NormalizedAssignmentMeta = {
  _id: string;
  title: string;
  gradeLevel: number;
  classLabel: string;
  classKey: string;
  organizationKey: string;
  teacherId: string;
  topic: AssignmentTopic;
  taxonomyVersion: string;
};

type BackfillOptions = {
  dryRun?: boolean;
};

type BackfillResult = {
  dryRun: boolean;
  assignmentScanned: number;
  assignmentUpdateCandidates: number;
  submissionScanned: number;
  submissionUpdateCandidates: number;
};

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

function loadBackfillEnvironment() {
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '..', '..', '.env.local'),
  ];

  for (const candidate of candidates) {
    loadEnvLocalFile(candidate);
  }
}

function normalizeGradeLevel(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 9;
  }
  const gradeLevel = Math.trunc(numeric);
  return Math.max(1, Math.min(12, gradeLevel));
}

function normalizeTopic(value: unknown): AssignmentTopic {
  if (typeof value === 'string' && ASSIGNMENT_TOPICS.includes(value as AssignmentTopic)) {
    return value as AssignmentTopic;
  }
  return DEFAULT_TOPIC;
}

async function normalizeAssignmentMeta(row: AssignmentRow): Promise<NormalizedAssignmentMeta> {
  const gradeLevel = normalizeGradeLevel(row.gradeLevel);
  const classContext = resolveClassContext({
    gradeLevel,
    classLabel: row.classLabel || '',
  });

  const requestContext = await resolveTeacherRequestContext(null, {
    teacherId: row.teacherId,
    organizationKey: row.organizationKey,
  });

  return {
    _id: String(row._id),
    title: (row.title || '').trim(),
    gradeLevel,
    classLabel: classContext.classLabel,
    classKey: classContext.classKey,
    organizationKey: normalizeOrganizationKey(requestContext?.organizationKey),
    teacherId: requestContext?.teacherId || 'default-teacher',
    topic: normalizeTopic(row.topic),
    taxonomyVersion: (row.taxonomyVersion || '').trim() || DEFAULT_TAXONOMY_VERSION,
  };
}

function pushIfChanged(
  target: Record<string, unknown>,
  field: string,
  currentValue: unknown,
  nextValue: unknown
) {
  if (currentValue !== nextValue) {
    target[field] = nextValue;
  }
}

async function applyBulkUpdates(
  model: typeof Assignment | typeof Submission,
  updates: Array<mongoose.AnyBulkWriteOperation>
) {
  if (updates.length === 0) {
    return;
  }

  const CHUNK_SIZE = 500;
  for (let index = 0; index < updates.length; index += CHUNK_SIZE) {
    const chunk = updates.slice(index, index + CHUNK_SIZE);
    await model.bulkWrite(chunk, { ordered: false });
  }
}

export async function backfillTeacherAndClassContext(options: BackfillOptions = {}): Promise<BackfillResult> {
  const dryRun = options.dryRun === true;

  await connectDB();

  const assignmentRows = (await Assignment.find({})
    .select(
      '_id title gradeLevel classLabel classKey organizationKey teacherId topic taxonomyVersion'
    )
    .lean()) as AssignmentRow[];

  const assignmentMetaById = new Map<string, NormalizedAssignmentMeta>();
  const assignmentUpdates: Array<mongoose.AnyBulkWriteOperation> = [];

  for (const row of assignmentRows) {
    const normalized = await normalizeAssignmentMeta(row);
    assignmentMetaById.set(normalized._id, normalized);

    const updateSet: Record<string, unknown> = {};
    pushIfChanged(updateSet, 'gradeLevel', row.gradeLevel, normalized.gradeLevel);
    pushIfChanged(updateSet, 'classLabel', row.classLabel, normalized.classLabel);
    pushIfChanged(updateSet, 'classKey', row.classKey, normalized.classKey);
    pushIfChanged(updateSet, 'organizationKey', row.organizationKey, normalized.organizationKey);
    pushIfChanged(updateSet, 'teacherId', row.teacherId, normalized.teacherId);
    pushIfChanged(updateSet, 'topic', row.topic, normalized.topic);
    pushIfChanged(updateSet, 'taxonomyVersion', row.taxonomyVersion, normalized.taxonomyVersion);

    if (Object.keys(updateSet).length > 0) {
      assignmentUpdates.push({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: updateSet },
        },
      });
    }
  }

  const submissionRows = (await Submission.find({})
    .select(
      '_id assignmentId assignmentTitle teacherId organizationKey classLabel classKey topic gradeLevel studentName studentKey'
    )
    .lean()) as SubmissionRow[];

  const submissionUpdates: Array<mongoose.AnyBulkWriteOperation> = [];

  for (const row of submissionRows) {
    const assignmentMeta = assignmentMetaById.get(String(row.assignmentId));
    const gradeLevel = normalizeGradeLevel(row.gradeLevel ?? assignmentMeta?.gradeLevel ?? 9);
    const classContext = resolveClassContext({
      gradeLevel,
      classLabel: row.classLabel || assignmentMeta?.classLabel || '',
    });

    const requestContext = await resolveTeacherRequestContext(null, {
      teacherId: row.teacherId || assignmentMeta?.teacherId,
      organizationKey: row.organizationKey || assignmentMeta?.organizationKey,
    });

    const topic = normalizeTopic(row.topic || assignmentMeta?.topic || DEFAULT_TOPIC);
    const assignmentTitle = (row.assignmentTitle || assignmentMeta?.title || '').trim();
    const studentName = (row.studentName || '').trim();
    const studentKey = resolveStudentKey(studentName, row.studentKey || '');

    const updateSet: Record<string, unknown> = {};
    pushIfChanged(updateSet, 'assignmentTitle', row.assignmentTitle || '', assignmentTitle);
    pushIfChanged(updateSet, 'teacherId', row.teacherId, requestContext?.teacherId || 'default-teacher');
    pushIfChanged(
      updateSet,
      'organizationKey',
      row.organizationKey,
      normalizeOrganizationKey(requestContext?.organizationKey)
    );
    pushIfChanged(updateSet, 'classLabel', row.classLabel, classContext.classLabel);
    pushIfChanged(updateSet, 'classKey', row.classKey, classContext.classKey);
    pushIfChanged(updateSet, 'topic', row.topic, topic);
    pushIfChanged(updateSet, 'gradeLevel', row.gradeLevel, gradeLevel);
    pushIfChanged(updateSet, 'studentKey', row.studentKey || '', studentKey);

    if (Object.keys(updateSet).length > 0) {
      submissionUpdates.push({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: updateSet },
        },
      });
    }
  }

  if (!dryRun) {
    await applyBulkUpdates(Assignment, assignmentUpdates);
    await applyBulkUpdates(Submission, submissionUpdates);
  }

  return {
    dryRun,
    assignmentScanned: assignmentRows.length,
    assignmentUpdateCandidates: assignmentUpdates.length,
    submissionScanned: submissionRows.length,
    submissionUpdateCandidates: submissionUpdates.length,
  };
}

export async function runBackfillScript() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: npm run backfill:context [-- [--dry-run]]');
    console.log('--dry-run  Show how many records would be updated without writing.');
    return;
  }

  loadBackfillEnvironment();

  if (!process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Create .env.local (cp .env.example .env.local) or export MONGODB_URI before running this script.'
    );
  }

  const dryRun = args.includes('--dry-run');

  try {
    const result = await backfillTeacherAndClassContext({ dryRun });
    console.log(
      [
        `Backfill ${result.dryRun ? '(dry run)' : 'complete'}:`,
        `assignments scanned=${result.assignmentScanned}, updates=${result.assignmentUpdateCandidates};`,
        `submissions scanned=${result.submissionScanned}, updates=${result.submissionUpdateCandidates}.`,
      ].join(' ')
    );
  } finally {
    await mongoose.disconnect();
  }
}

function shouldRunBackfillScript() {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }

  return /[\\/]src[\\/]scripts[\\/]backfill-context\.(ts|js)$/.test(entrypoint);
}

if (shouldRunBackfillScript()) {
  runBackfillScript().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Backfill failed: ${message}`);
    process.exit(1);
  });
}
