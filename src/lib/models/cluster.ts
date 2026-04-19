import mongoose, { Schema, Document } from 'mongoose';
import type { RemediationStatus } from '@/lib/remediation-status';

export interface RemediationExercise {
  id: string;
  prompt: string;
  promptEt: string;
  targetMisconception: string;
  difficulty: 'scaffolded' | 'standard' | 'transfer';
  hint?: string;
  solutionSteps: string[];
}

export interface ClusterEvidenceStep {
  stepNumber: number;
  content: string;
  count: number;
  percentage: number;
  sampleExplanation: string;
}

export interface ClusterEvidenceSummary {
  firstErrorStepDistribution: Array<{
    stepNumber: number;
    count: number;
    percentage: number;
  }>;
  topErrorSteps: ClusterEvidenceStep[];
  reasoningTypeDistribution: Array<{
    reasoningType: 'procedural' | 'conceptual' | 'mixed' | 'unknown';
    count: number;
    percentage: number;
  }>;
  averageConfidence: number;
  lowConfidenceShare: number;
}

export interface ClusterSubCluster {
  id: string;
  label: string;
  labelEt: string;
  size: number;
  memberSubmissionIds: string[];
  memberStudentNames: string[];
  representativeExample: string;
  dominantPattern: string;
  remediationHint: string;
}

export interface ICluster extends Document {
  assignmentId: mongoose.Types.ObjectId;
  misconceptionCode: string;
  label: string;
  labelEt: string;
  description: string;
  descriptionEt: string;
  severity: 'minor' | 'major' | 'fundamental' | 'none';
  studentSubmissionIds: string[];
  studentNames: string[];
  clusterSize: number;
  commonPattern: string;
  evidenceSummary?: ClusterEvidenceSummary | null;
  subClusters?: ClusterSubCluster[];
  remediationExercises: RemediationExercise[];
  remediationStatus: RemediationStatus;
  remediationError: string;
  createdAt: Date;
}

const RemediationExerciseSchema = new Schema<RemediationExercise>(
  {
    id: String,
    prompt: String,
    promptEt: String,
    targetMisconception: String,
    difficulty: { type: String, enum: ['scaffolded', 'standard', 'transfer'] },
    hint: String,
    solutionSteps: [String],
  },
  { _id: false }
);

const ClusterEvidenceStepSchema = new Schema<ClusterEvidenceStep>(
  {
    stepNumber: { type: Number, default: 0 },
    content: { type: String, default: '' },
    count: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    sampleExplanation: { type: String, default: '' },
  },
  { _id: false }
);

const ClusterEvidenceSummarySchema = new Schema<ClusterEvidenceSummary>(
  {
    firstErrorStepDistribution: {
      type: [
        new Schema(
          {
            stepNumber: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
            percentage: { type: Number, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    topErrorSteps: { type: [ClusterEvidenceStepSchema], default: [] },
    reasoningTypeDistribution: {
      type: [
        new Schema(
          {
            reasoningType: {
              type: String,
              enum: ['procedural', 'conceptual', 'mixed', 'unknown'],
              default: 'unknown',
            },
            count: { type: Number, default: 0 },
            percentage: { type: Number, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    averageConfidence: { type: Number, default: 0 },
    lowConfidenceShare: { type: Number, default: 0 },
  },
  { _id: false }
);

const ClusterSubClusterSchema = new Schema<ClusterSubCluster>(
  {
    id: { type: String, default: '' },
    label: { type: String, default: '' },
    labelEt: { type: String, default: '' },
    size: { type: Number, default: 0 },
    memberSubmissionIds: { type: [String], default: [] },
    memberStudentNames: { type: [String], default: [] },
    representativeExample: { type: String, default: '' },
    dominantPattern: { type: String, default: '' },
    remediationHint: { type: String, default: '' },
  },
  { _id: false }
);

const ClusterSchema = new Schema<ICluster>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    misconceptionCode: { type: String, required: true },
    label: { type: String, required: true },
    labelEt: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionEt: { type: String, default: '' },
    severity: { type: String, enum: ['minor', 'major', 'fundamental', 'none'], default: 'major' },
    studentSubmissionIds: { type: [String], default: [] },
    studentNames: { type: [String], default: [] },
    clusterSize: { type: Number, default: 0 },
    commonPattern: { type: String, default: '' },
    evidenceSummary: { type: ClusterEvidenceSummarySchema, default: null },
    subClusters: { type: [ClusterSubClusterSchema], default: [] },
    remediationExercises: { type: [RemediationExerciseSchema], default: [] },
    remediationStatus: { type: String, enum: ['pending', 'ready', 'failed'], default: 'pending' },
    remediationError: { type: String, default: '' },
  },
  { timestamps: true }
);

ClusterSchema.index({ assignmentId: 1 });

export const Cluster =
  mongoose.models.Cluster || mongoose.model<ICluster>('Cluster', ClusterSchema);