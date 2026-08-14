import mongoose, { Document, Schema } from 'mongoose';
import { ArticleErrorCode } from './errors';

export interface IArticle extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: string;
  originalUrl: string;
  canonicalUrl: string;
  title: string;
  source: string;
  author?: string;
  publishedAt?: Date;
  language: string;
  content: string;
  excerpt?: string;
  wordCount: number;
  status: 'extracted' | 'failed';
  failureCode?: ArticleErrorCode;
  failureMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ArticleSchema = new Schema<IArticle>({
  ownerId: { type: String, required: true, trim: true, index: true },
  originalUrl: { type: String, required: true, trim: true },
  canonicalUrl: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  source: { type: String, required: true, trim: true },
  author: { type: String, trim: true },
  publishedAt: Date,
  language: { type: String, required: true, default: 'en' },
  content: { type: String, required: true },
  excerpt: { type: String, trim: true },
  wordCount: { type: Number, required: true, min: 0 },
  status: { type: String, required: true, enum: ['extracted', 'failed'] },
  failureCode: String,
  failureMessage: String,
}, { timestamps: true });

ArticleSchema.index(
  { ownerId: 1, canonicalUrl: 1 },
  { unique: true, partialFilterExpression: { status: 'extracted' } },
);
ArticleSchema.index({ createdAt: -1 });

export const Article = mongoose.model<IArticle>('Article', ArticleSchema);
