import mongoose, { Document, Schema } from "mongoose";

export type TeacherRole = "teacher" | "admin";

export interface ITeacher extends Document {
  teacherId: string;
  email: string;
  organizationKey: string;
  displayName: string;
  role: TeacherRole;
  invitedAt: Date;
  activatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    teacherId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    organizationKey: { type: String, required: true, index: true },
    displayName: { type: String, required: true, default: "" },
    role: { type: String, enum: ["teacher", "admin"], default: "teacher" },
    invitedAt: { type: Date, required: true, default: Date.now },
    activatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TeacherSchema.index({ organizationKey: 1, role: 1, email: 1 });

export const Teacher =
  mongoose.models.Teacher || mongoose.model<ITeacher>("Teacher", TeacherSchema);
