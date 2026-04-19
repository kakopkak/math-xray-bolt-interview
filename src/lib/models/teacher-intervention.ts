import mongoose, { Schema, Document } from 'mongoose';

export interface ITeacherIntervention extends Document {
  teacherId: string;
  organizationKey: string;
  classKey: string;
  assignmentId: mongoose.Types.ObjectId | null;
  submissionId: mongoose.Types.ObjectId | null;
  studentKey: string;
  topic: string;
  misconceptionCode: string;
  interventionType: 'review_note' | 'assignment_spawn' | 'manual_exercise' | 'conference' | 'group_reteach';
  status: 'planned' | 'assigned' | 'completed' | 'cancelled';
  title: string;
  note: string;
  assignedAt: Date;
  dueAt: Date | null;
  completedAt: Date | null;
  evidenceSubmissionIds: string[];
  outcome: {
    trend: 'improved' | 'unchanged' | 'worsened' | 'unknown';
    confidence: 'high' | 'medium' | 'low';
    detail: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherInterventionSchema = new Schema<ITeacherIntervention>(
  {
    teacherId: { type: String, required: true, default: 'default-teacher' },
    organizationKey: { type: String, required: true, default: 'default-school' },
    classKey: { type: String, required: true, default: '9a' },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', default: null },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', default: null },
    studentKey: { type: String, required: true },
    topic: { type: String, required: true, default: 'quadratic_equations' },
    misconceptionCode: { type: String, required: true, default: 'QE_NO_ERROR' },
    interventionType: {
      type: String,
      enum: ['review_note', 'assignment_spawn', 'manual_exercise', 'conference', 'group_reteach'],
      default: 'review_note',
    },
    status: {
      type: String,
      enum: ['planned', 'assigned', 'completed', 'cancelled'],
      default: 'planned',
    },
    title: { type: String, default: '' },
    note: { type: String, default: '' },
    assignedAt: { type: Date, default: Date.now },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    evidenceSubmissionIds: { type: [String], default: [] },
    outcome: {
      type: new Schema(
        {
          trend: {
            type: String,
            enum: ['improved', 'unchanged', 'worsened', 'unknown'],
            default: 'unknown',
          },
          confidence: {
            type: String,
            enum: ['high', 'medium', 'low'],
            default: 'low',
          },
          detail: { type: String, default: '' },
        },
        { _id: false }
      ),
      default: null,
    },
  },
  { timestamps: true }
);

TeacherInterventionSchema.index({ teacherId: 1, assignedAt: -1 });
TeacherInterventionSchema.index({ organizationKey: 1, classKey: 1, assignedAt: -1 });
TeacherInterventionSchema.index({ studentKey: 1, assignedAt: -1 });
TeacherInterventionSchema.index({ misconceptionCode: 1, assignedAt: -1 });
TeacherInterventionSchema.index({ status: 1, assignedAt: -1 });

export const TeacherIntervention =
  mongoose.models.TeacherIntervention ||
  mongoose.model<ITeacherIntervention>('TeacherIntervention', TeacherInterventionSchema);
