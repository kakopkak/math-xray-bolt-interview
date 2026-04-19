import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentRosterEntry extends Document {
  teacherId: string;
  organizationKey: string;
  classKey: string;
  rosterStudentId: string;
  canonicalName: string;
  aliases: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudentRosterSchema = new Schema<IStudentRosterEntry>(
  {
    teacherId: { type: String, required: true, default: 'default-teacher' },
    organizationKey: { type: String, required: true, default: 'default-school' },
    classKey: { type: String, required: true },
    rosterStudentId: { type: String, required: true },
    canonicalName: { type: String, required: true },
    aliases: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StudentRosterSchema.index({ teacherId: 1, classKey: 1, canonicalName: 1 });
StudentRosterSchema.index({ organizationKey: 1, classKey: 1, rosterStudentId: 1 }, { unique: true });

export const StudentRosterEntry =
  mongoose.models.StudentRosterEntry ||
  mongoose.model<IStudentRosterEntry>('StudentRosterEntry', StudentRosterSchema);
