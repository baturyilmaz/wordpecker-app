import mongoose, { Document, Schema, Types } from 'mongoose';

export const productEventNames = [
  'article_extracted',
  'lesson_created',
  'lesson_opened',
  'quiz_started',
  'quiz_completed',
  'term_saved',
  'vocabulary_opened',
  'review_started',
  'review_completed',
] as const;

export type ProductEventName = typeof productEventNames[number];
export type ProductEventMetadata = Record<string, string | number | boolean>;

export interface IProductEvent extends Document {
  ownerId: string;
  userId?: Types.ObjectId;
  guestId?: string;
  eventName: ProductEventName;
  articleId?: Types.ObjectId;
  lessonId?: Types.ObjectId;
  lessonItemId?: Types.ObjectId;
  quizId?: Types.ObjectId;
  metadata?: ProductEventMetadata;
  dedupeKey?: string;
  createdAt: Date;
}

const ProductEventSchema = new Schema<IProductEvent>({
  ownerId: { type: String, required: true, trim: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  guestId: { type: String, trim: true },
  eventName: { type: String, required: true, enum: productEventNames },
  articleId: { type: Schema.Types.ObjectId, ref: 'Article' },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  lessonItemId: { type: Schema.Types.ObjectId },
  quizId: { type: Schema.Types.ObjectId, ref: 'LessonQuiz' },
  metadata: { type: Schema.Types.Mixed },
  dedupeKey: { type: String, trim: true },
  createdAt: { type: Date, required: true, default: Date.now },
}, { versionKey: false });

ProductEventSchema.index({ ownerId: 1, createdAt: -1 });
ProductEventSchema.index({ eventName: 1, createdAt: -1 });
ProductEventSchema.index({ userId: 1, createdAt: -1 }, { sparse: true });
ProductEventSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);

export const ProductEvent = mongoose.model<IProductEvent>('ProductEvent', ProductEventSchema);
