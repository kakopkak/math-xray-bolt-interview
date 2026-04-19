import mongoose, { Document, Schema } from 'mongoose';

export interface TopicNotebookEntry {
  at: Date;
  note: string;
}

export interface ITopicNotebook extends Document {
  organizationKey: string;
  topic: string;
  entries: TopicNotebookEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const TopicNotebookEntrySchema = new Schema<TopicNotebookEntry>(
  {
    at: { type: Date, default: Date.now },
    note: { type: String, required: true, default: '' },
  },
  { _id: false }
);

const TopicNotebookSchema = new Schema<ITopicNotebook>(
  {
    organizationKey: { type: String, required: true, default: 'default-school' },
    topic: { type: String, required: true, default: '' },
    entries: { type: [TopicNotebookEntrySchema], default: [] },
  },
  { timestamps: true }
);

TopicNotebookSchema.index(
  { organizationKey: 1, topic: 1 },
  { unique: true, name: 'topic_notebook_lookup_idx' }
);

export const TopicNotebook =
  mongoose.models.TopicNotebook ||
  mongoose.model<ITopicNotebook>('TopicNotebook', TopicNotebookSchema);