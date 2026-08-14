import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILessonInteraction extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  lessonId: Types.ObjectId;
  lessonItemId: Types.ObjectId;
  articleId: Types.ObjectId;
  term: string;
  knowledgeStatus: 'unset' | 'known' | 'unknown';
  saved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LessonInteractionSchema = new Schema<ILessonInteraction>({
  ownerId: { type: String, required: true, trim: true, index: true },
  lessonId: { type: Schema.Types.ObjectId, required: true, ref: 'Lesson', index: true },
  lessonItemId: { type: Schema.Types.ObjectId, required: true },
  articleId: { type: Schema.Types.ObjectId, required: true, ref: 'Article', index: true },
  term: { type: String, required: true, trim: true },
  knowledgeStatus: { type: String, required: true, enum: ['unset', 'known', 'unknown'], default: 'unset' },
  saved: { type: Boolean, required: true, default: false },
}, { timestamps: true });

LessonInteractionSchema.index({ ownerId: 1, lessonId: 1, lessonItemId: 1 }, { unique: true });
LessonInteractionSchema.index({ ownerId: 1, knowledgeStatus: 1, updatedAt: -1 });
LessonInteractionSchema.index({ ownerId: 1, saved: 1, updatedAt: -1 });

export const LessonInteraction = mongoose.model<ILessonInteraction>('LessonInteraction', LessonInteractionSchema);
