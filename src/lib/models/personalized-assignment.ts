import mongoose, { Document, Schema } from 'mongoose';

export interface IPersonalizedAssignment extends Document {
  teacherId: string;
  organizationKey: string;
  classKey: string;
  assignmentId: string;
  studentKey: string;
  clusterId: string;
  title: string;
  promptEt: string;
  answerKey: string;
  shareToken: string;
  status: 'active' | 'completed' | 'expired';
  dueAt: Date | null;
  topic: 'quadratic_equations' | 'linear_equations' | 'fractions';
  createdAt: Date;
  updatedAt: Date;
}

const PersonalizedAssignmentSchema = new Schema<IPersonalizedAssignment>(
  {
    teacherId: { type: String, required: true, default: 'default-teacher' },
    organizationKey: { type: String, required: true, default: 'default-school' },
    classKey: { type: String, required: true, default: 'default-class' },
    studentKey: { type: String, required: true, index: true },
    assignmentId: { type: String, required: true, default: '' },
    clusterId: { type: String, required: true, default: '' },
    title: { type: String, required: true, default: '' },
    promptEt: { type: String, required: true, default: '' },
    answerKey: { type: String, required: true, default: '' },
    shareToken: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'completed', 'expired'],
      default: 'active',
    },
    dueAt: { type: Date, default: null },
    topic: {
      type: String,
      enum: ['quadratic_equations', 'linear_equations', 'fractions'],
      required: true,
      default: 'quadratic_equations',
    },
  },
  { timestamps: true }
);

PersonalizedAssignmentSchema.index(
  { teacherId: 1, organizationKey: 1, classKey: 1, studentKey: 1, createdAt: -1 },
  { name: 'personalized_assignment_lookup_idx' }
);
PersonalizedAssignmentSchema.index(
  { assignmentId: 1, studentKey: 1, createdAt: -1 },
  { name: 'personalized_assignment_assignment_idx' }
);
PersonalizedAssignmentSchema.index(
  { shareToken: 1 },
  { unique: true, name: 'personalized_assignment_share_token_idx' }
);

export const PersonalizedAssignment =
  mongoose.models.PersonalizedAssignment ||
  mongoose.model<IPersonalizedAssignment>('PersonalizedAssignment', PersonalizedAssignmentSchema);