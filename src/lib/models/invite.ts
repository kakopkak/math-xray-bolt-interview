import mongoose, { Document, Schema } from "mongoose";

export interface IInvite extends Document {
  email: string;
  organizationKey: string;
  invitedBy: string;
  createdAt: Date;
  acceptedAt: Date | null;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    organizationKey: { type: String, required: true, index: true },
    invitedBy: { type: String, required: true, default: "" },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InviteSchema.index({ email: 1, organizationKey: 1, createdAt: -1 });

export const Invite =
  mongoose.models.Invite || mongoose.model<IInvite>("Invite", InviteSchema);
