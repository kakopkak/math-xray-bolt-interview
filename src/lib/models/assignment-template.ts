import mongoose, { Document, Schema } from 'mongoose';

export type AssignmentTemplateSeverity = 'minor' | 'major' | 'fundamental';

export interface IAssignmentTemplate extends Document {
  teacherId: string;
  organizationKey: string;
  classKey: string;
  topic: 'quadratic_equations' | 'linear_equations' | 'fractions';
  misconceptionCode: string;
  severity: AssignmentTemplateSeverity;
  title: string;
  promptEt: string;
  answerKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentTemplateSchema = new Schema<IAssignmentTemplate>(
  {
    teacherId: { type: String, required: true, default: 'default-teacher' },
    organizationKey: { type: String, required: true, default: 'default-school' },
    classKey: { type: String, required: true, default: 'default-class' },
    topic: {
      type: String,
      enum: ['quadratic_equations', 'linear_equations', 'fractions'],
      default: 'quadratic_equations',
      required: true,
    },
    misconceptionCode: { type: String, required: true, default: '' },
    severity: {
      type: String,
      enum: ['minor', 'major', 'fundamental'],
      required: true,
      default: 'major',
    },
    title: { type: String, required: true, default: '' },
    promptEt: { type: String, required: true, default: '' },
    answerKey: { type: String, required: true, default: '' },
  },
  { timestamps: true }
);

AssignmentTemplateSchema.index(
  {
    teacherId: 1,
    organizationKey: 1,
    classKey: 1,
    topic: 1,
    misconceptionCode: 1,
    severity: 1,
    createdAt: -1,
  },
  { name: 'assignment_template_lookup_idx' }
);

export const AssignmentTemplate =
  mongoose.models.AssignmentTemplate ||
  mongoose.model<IAssignmentTemplate>('AssignmentTemplate', AssignmentTemplateSchema);