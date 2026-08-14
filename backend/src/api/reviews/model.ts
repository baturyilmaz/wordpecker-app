import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReviewState extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  normalizedTerm: string;
  lastReviewedAt?: Date;
  nextReviewAt: Date;
  reviewCount: number;
  rememberedCount: number;
  unsureCount: number;
  forgotCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewStateSchema = new Schema<IReviewState>({
  ownerId: { type: String, required: true, trim: true, index: true },
  normalizedTerm: { type: String, required: true, trim: true },
  lastReviewedAt: Date,
  nextReviewAt: { type: Date, required: true, default: Date.now, index: true },
  reviewCount: { type: Number, required: true, default: 0 },
  rememberedCount: { type: Number, required: true, default: 0 },
  unsureCount: { type: Number, required: true, default: 0 },
  forgotCount: { type: Number, required: true, default: 0 },
}, { timestamps: true });

ReviewStateSchema.index({ ownerId: 1, normalizedTerm: 1 }, { unique: true });
ReviewStateSchema.index({ ownerId: 1, nextReviewAt: 1 });

export const ReviewState = mongoose.model<IReviewState>('ReviewState', ReviewStateSchema);
