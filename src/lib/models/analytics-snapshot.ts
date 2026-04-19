import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsSnapshot extends Document {
  key: string;
  scope: 'teacher-super-dashboard';
  teacherId: string;
  organizationKey: string;
  generatedAt: Date;
  expiresAt: Date;
  filterHash: string;
  payload: Record<string, unknown>;
}

const AnalyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    key: { type: String, required: true, unique: true },
    scope: { type: String, enum: ['teacher-super-dashboard'], required: true },
    teacherId: { type: String, required: true, default: 'default-teacher' },
    organizationKey: { type: String, required: true, default: 'default-school' },
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    filterHash: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

AnalyticsSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AnalyticsSnapshotSchema.index({ teacherId: 1, generatedAt: -1 });
AnalyticsSnapshotSchema.index({ organizationKey: 1, generatedAt: -1 });

export const AnalyticsSnapshot =
  mongoose.models.AnalyticsSnapshot ||
  mongoose.model<IAnalyticsSnapshot>('AnalyticsSnapshot', AnalyticsSnapshotSchema);
