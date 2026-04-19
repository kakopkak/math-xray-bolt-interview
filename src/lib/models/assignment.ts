import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignmentNextMoveExpectedError {
  misconceptionCode: string;
  expectedAnswer: string;
  whyTheyWillMissItEt: string;
}

export interface IAssignmentNextMove {
  nextProblem: {
    prompt: string;
    promptEt: string;
    answer: string;
  };
  rationaleEt: string;
  expectedErrorsByCluster: IAssignmentNextMoveExpectedError[];
  teacherMoveEt: string;
  aiGenerated: boolean;
  aiError: string;
  generatedAt: Date | null;
  distributionHash: string;
  generationLockAt?: Date | null;
}

export interface IAssignment extends Document {
  title: string;
  topic: 'quadratic_equations' | 'linear_equations' | 'fractions';
  gradeLevel: number;
  classLabel: string;
  classKey: string;
  organizationKey: string;
  teacherId: string;
  description: string;
  answerKey: string;
  curriculumOutcomes: string[];
  taxonomyVersion: string;
  seedMarker?: string | null;
  parentAssignmentId?: mongoose.Types.ObjectId | null;
  generationSource: 'manual' | 'next-move-spawn';
  nextMove?: IAssignmentNextMove | null;
  clusteringLockAt?: Date | null;
  lastClusteredAt?: Date | null;
  lastClusteredCompleteCount?: number;
  status: 'draft' | 'active' | 'analyzed';
  submissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExpectedErrorSchema = new Schema<IAssignmentNextMoveExpectedError>(
  {
    misconceptionCode: { type: String, required: true },
    expectedAnswer: { type: String, default: '' },
    whyTheyWillMissItEt: { type: String, default: '' },
  },
  { _id: false }
);

const NextMoveSchema = new Schema<IAssignmentNextMove>(
  {
    nextProblem: {
      prompt: { type: String, default: '' },
      promptEt: { type: String, default: '' },
      answer: { type: String, default: '' },
    },
    rationaleEt: { type: String, default: '' },
    expectedErrorsByCluster: { type: [ExpectedErrorSchema], default: [] },
    teacherMoveEt: { type: String, default: '' },
    aiGenerated: { type: Boolean, default: false },
    aiError: { type: String, default: '' },
    generatedAt: { type: Date, default: null },
    distributionHash: { type: String, default: '' },
    generationLockAt: { type: Date, default: null },
  },
  { _id: false }
);

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    topic: {
      type: String,
      enum: ['quadratic_equations', 'linear_equations', 'fractions'],
      required: true,
      default: 'quadratic_equations',
    },
    gradeLevel: { type: Number, required: true, default: 9 },
    classLabel: { type: String, required: true, default: '9A' },
    classKey: { type: String, required: true, default: '9a' },
    organizationKey: { type: String, required: true, default: 'default-school' },
    teacherId: { type: String, required: true, default: 'default-teacher' },
    description: { type: String, default: '' },
    answerKey: { type: String, default: '' },
    curriculumOutcomes: { type: [String], default: [] },
    taxonomyVersion: { type: String, default: '2026-04-topic-v1' },
    seedMarker: { type: String, default: null },
    parentAssignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', index: true, required: false },
    generationSource: {
      type: String,
      enum: ['manual', 'next-move-spawn'],
      default: 'manual',
    },
    nextMove: { type: NextMoveSchema, default: null },
    clusteringLockAt: { type: Date, default: null },
    lastClusteredAt: { type: Date, default: null },
    lastClusteredCompleteCount: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'active', 'analyzed'], default: 'active' },
    submissionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
AssignmentSchema.index(
  { seedMarker: 1 },
  { unique: true, partialFilterExpression: { seedMarker: { $type: 'string' } } }
);
AssignmentSchema.index({ teacherId: 1, createdAt: -1 });
AssignmentSchema.index({ organizationKey: 1, classKey: 1, createdAt: -1 });

export const Assignment =
  mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
