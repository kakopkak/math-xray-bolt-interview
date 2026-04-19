import mongoose, { Document, Schema } from "mongoose";

export interface IParentBrief extends Document {
  teacherId: string;
  organizationKey: string;
  studentKey: string;
  studentName: string;
  bodyEt: string;
  sourceSubmissionIds: string[];
  generatedAt: Date;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ParentBriefSchema = new Schema<IParentBrief>(
  {
    teacherId: { type: String, required: true, default: "default-teacher", index: true },
    organizationKey: { type: String, required: true, default: "default-school", index: true },
    studentKey: { type: String, required: true, index: true },
    studentName: { type: String, required: true, default: "" },
    bodyEt: { type: String, required: true, default: "" },
    sourceSubmissionIds: { type: [String], default: [] },
    generatedAt: { type: Date, required: true, default: Date.now },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ParentBriefSchema.index({
  teacherId: 1,
  organizationKey: 1,
  studentKey: 1,
  generatedAt: -1,
});

export const ParentBrief =
  mongoose.models.ParentBrief ||
  mongoose.model<IParentBrief>("ParentBrief", ParentBriefSchema);
