import mongoose, { Schema, Document } from 'mongoose';
import {
  SUBMISSION_PROCESSING_STATUSES,
  type SubmissionProcessingStatus,
} from '@/lib/submission-status';

export interface ExtractedStep {
  stepNumber: number;
  content: string;
  latex?: string;
  isCorrect: boolean;
  isPartial?: boolean;
  misconceptionCode?: string;
  misconceptionLabel?: string;
  misconceptionLabelEt?: string;
  confidence: number;
  explanation?: string;
}

export interface AnalysisResult {
  overallCorrect: boolean;
  finalAnswerCorrect: boolean;
  totalSteps: number;
  correctSteps: number;
  firstErrorStep: number | null;
  misconceptions: string[];
  primaryMisconception: string;
  severityScore: number;
  strengthAreas: string[];
  reasoningType: 'procedural' | 'conceptual' | 'mixed';
}

export interface AnalysisMeta {
  extractionSource: 'ai' | 'heuristic';
  classificationSource: 'ai' | 'heuristic' | 'not_run';
  extractionIsComplete: boolean;
  deterministicGateApplied: boolean;
  deterministicGateReason: string;
  averageConfidence: number;
  lowConfidenceStepCount: number;
  analyzedAt: Date;
  pipelineVersion: string;
}

export interface VoiceMeta {
  audioMimeType: string;
  transcript: string;
  finalAnswer: string;
}

export interface TeacherReview {
  status: 'unreviewed' | 'reviewed' | 'overridden';
  reviewedAt: Date | null;
  note: string;
  overrideMisconceptionCode: string | null;
  originalMisconceptionCode: string | null;
}

export interface TeacherReviewEvent {
  at: Date;
  actor: 'teacher';
  action: 'reviewed' | 'overridden' | 'restored';
  note: string;
  fromMisconceptionCode: string | null;
  toMisconceptionCode: string | null;
}

export interface StudentIdentity {
  rosterStudentId: string | null;
  canonicalName: string;
  confidence: 'high' | 'medium' | 'low';
  matchedBy: 'roster' | 'name-heuristic';
}

export interface SubmissionMasterySnapshot {
  topicMasteryScore: number;
  misconceptionPressureScore: number;
  conceptualGapScore: number;
  proceduralGapScore: number;
}

export interface SubmissionDataQuality {
  signalQualityScore: number;
  trustLevel: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface SubmissionIntelligence {
  firstWrongStep: number | null;
  recoveryStep: number | null;
  finalAnswerReasoningDivergence: boolean;
  dominantErrorDimension: 'procedural' | 'conceptual' | 'mixed';
  uncertaintyLevel: 'low' | 'medium' | 'high';
  uncertaintyReasons: string[];
  reviewPriority: 'low' | 'medium' | 'high';
  reviewPriorityScore: number;
  voiceReasoningAvailable: boolean;
  verbalReasoningDivergence: boolean;
}

export interface ISubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  assignmentTitle: string;
  teacherId: string;
  organizationKey: string;
  classLabel: string;
  classKey: string;
  topic: 'quadratic_equations' | 'linear_equations' | 'fractions';
  gradeLevel: number;
  studentName: string;
  studentKey: string;
  studentIdentity?: StudentIdentity | null;
  inputType: 'photo' | 'typed';
  rawContent: string;
  extractedSteps: ExtractedStep[];
  analysis: AnalysisResult | null;
  analysisMeta?: AnalysisMeta | null;
  voiceMeta?: VoiceMeta | null;
  intelligence?: SubmissionIntelligence | null;
  masterySnapshot?: SubmissionMasterySnapshot | null;
  dataQuality?: SubmissionDataQuality | null;
  teacherReview?: TeacherReview | null;
  teacherReviewHistory?: TeacherReviewEvent[];
  clusterId: string | null;
  processingStatus: SubmissionProcessingStatus;
  processingError: string;
  createdAt: Date;
}

const ExtractedStepSchema = new Schema<ExtractedStep>(
  {
    stepNumber: Number,
    content: String,
    latex: String,
    isCorrect: Boolean,
    isPartial: { type: Boolean, default: false },
    misconceptionCode: String,
    misconceptionLabel: String,
    misconceptionLabelEt: String,
    confidence: Number,
    explanation: String,
  },
  { _id: false }
);

const AnalysisResultSchema = new Schema<AnalysisResult>(
  {
    overallCorrect: Boolean,
    finalAnswerCorrect: Boolean,
    totalSteps: Number,
    correctSteps: Number,
    firstErrorStep: { type: Number, default: null },
    misconceptions: [String],
    primaryMisconception: String,
    severityScore: Number,
    strengthAreas: [String],
    reasoningType: { type: String, enum: ['procedural', 'conceptual', 'mixed'] },
  },
  { _id: false }
);

const AnalysisMetaSchema = new Schema<AnalysisMeta>(
  {
    extractionSource: { type: String, enum: ['ai', 'heuristic'], default: 'ai' },
    classificationSource: { type: String, enum: ['ai', 'heuristic', 'not_run'], default: 'ai' },
    extractionIsComplete: { type: Boolean, default: true },
    deterministicGateApplied: { type: Boolean, default: false },
    deterministicGateReason: { type: String, default: '' },
    averageConfidence: { type: Number, default: 0 },
    lowConfidenceStepCount: { type: Number, default: 0 },
    analyzedAt: { type: Date, default: Date.now },
    pipelineVersion: { type: String, default: '2026-04-trust-v3' },
  },
  { _id: false }
);

const VoiceMetaSchema = new Schema<VoiceMeta>(
  {
    audioMimeType: { type: String, default: '' },
    transcript: { type: String, default: '' },
    finalAnswer: { type: String, default: '' },
  },
  { _id: false }
);

const TeacherReviewSchema = new Schema<TeacherReview>(
  {
    status: {
      type: String,
      enum: ['unreviewed', 'reviewed', 'overridden'],
      default: 'unreviewed',
    },
    reviewedAt: { type: Date, default: null },
    note: { type: String, default: '' },
    overrideMisconceptionCode: { type: String, default: null },
    originalMisconceptionCode: { type: String, default: null },
  },
  { _id: false }
);

const TeacherReviewEventSchema = new Schema<TeacherReviewEvent>(
  {
    at: { type: Date, default: Date.now },
    actor: { type: String, enum: ['teacher'], default: 'teacher' },
    action: {
      type: String,
      enum: ['reviewed', 'overridden', 'restored'],
      default: 'reviewed',
    },
    note: { type: String, default: '' },
    fromMisconceptionCode: { type: String, default: null },
    toMisconceptionCode: { type: String, default: null },
  },
  { _id: false }
);

const StudentIdentitySchema = new Schema<StudentIdentity>(
  {
    rosterStudentId: { type: String, default: null },
    canonicalName: { type: String, default: '' },
    confidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'low',
    },
    matchedBy: {
      type: String,
      enum: ['roster', 'name-heuristic'],
      default: 'name-heuristic',
    },
  },
  { _id: false }
);

const SubmissionMasterySnapshotSchema = new Schema<SubmissionMasterySnapshot>(
  {
    topicMasteryScore: { type: Number, default: 0 },
    misconceptionPressureScore: { type: Number, default: 0 },
    conceptualGapScore: { type: Number, default: 0 },
    proceduralGapScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const SubmissionDataQualitySchema = new Schema<SubmissionDataQuality>(
  {
    signalQualityScore: { type: Number, default: 0 },
    trustLevel: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'low',
    },
    reasons: { type: [String], default: [] },
  },
  { _id: false }
);

const SubmissionIntelligenceSchema = new Schema<SubmissionIntelligence>(
  {
    firstWrongStep: { type: Number, default: null },
    recoveryStep: { type: Number, default: null },
    finalAnswerReasoningDivergence: { type: Boolean, default: false },
    dominantErrorDimension: {
      type: String,
      enum: ['procedural', 'conceptual', 'mixed'],
      default: 'mixed',
    },
    uncertaintyLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    uncertaintyReasons: { type: [String], default: [] },
    reviewPriority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    reviewPriorityScore: { type: Number, default: 0 },
    voiceReasoningAvailable: { type: Boolean, default: false },
    verbalReasoningDivergence: { type: Boolean, default: false },
  },
  { _id: false }
);

const SubmissionSchema = new Schema<ISubmission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    assignmentTitle: { type: String, default: '' },
    teacherId: { type: String, default: 'default-teacher' },
    organizationKey: { type: String, default: 'default-school' },
    classLabel: { type: String, default: '9A' },
    classKey: { type: String, default: '9a' },
    topic: {
      type: String,
      enum: ['quadratic_equations', 'linear_equations', 'fractions'],
      default: 'quadratic_equations',
    },
    gradeLevel: { type: Number, default: 9 },
    studentName: { type: String, required: true },
    studentKey: { type: String, default: '' },
    studentIdentity: { type: StudentIdentitySchema, default: null },
    inputType: { type: String, enum: ['photo', 'typed'], required: true },
    rawContent: { type: String, required: true },
    extractedSteps: { type: [ExtractedStepSchema], default: [] },
    analysis: { type: AnalysisResultSchema, default: null },
    analysisMeta: { type: AnalysisMetaSchema, default: null },
    voiceMeta: { type: VoiceMetaSchema, default: null },
    intelligence: { type: SubmissionIntelligenceSchema, default: null },
    masterySnapshot: { type: SubmissionMasterySnapshotSchema, default: null },
    dataQuality: { type: SubmissionDataQualitySchema, default: null },
    teacherReview: { type: TeacherReviewSchema, default: null },
    teacherReviewHistory: { type: [TeacherReviewEventSchema], default: [] },
    clusterId: { type: String, default: null },
    processingStatus: {
      type: String,
      enum: SUBMISSION_PROCESSING_STATUSES,
      default: 'pending',
    },
    processingError: { type: String, default: '' },
  },
  { timestamps: true }
);

SubmissionSchema.index({ assignmentId: 1 });
SubmissionSchema.index({ assignmentId: 1, processingStatus: 1 });
SubmissionSchema.index({ assignmentId: 1, studentKey: 1, createdAt: 1 });
SubmissionSchema.index({ teacherId: 1, createdAt: -1 });
SubmissionSchema.index({ organizationKey: 1, classKey: 1, createdAt: -1 });
SubmissionSchema.index({ studentKey: 1, createdAt: -1 });
SubmissionSchema.index({ topic: 1, createdAt: -1 });
SubmissionSchema.index({ 'analysis.primaryMisconception': 1, createdAt: -1 });
SubmissionSchema.index({ 'analysis.severityScore': -1, createdAt: -1 });
SubmissionSchema.index({ 'intelligence.reviewPriority': 1, createdAt: -1 });
SubmissionSchema.index({ 'voiceMeta.audioMimeType': 1, createdAt: -1 });

export const Submission =
  mongoose.models.Submission || mongoose.model<ISubmission>('Submission', SubmissionSchema);
