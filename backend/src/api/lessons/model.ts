import mongoose, { Document, Schema, Types } from 'mongoose';
import { LessonErrorCode } from './errors';
import { LessonLevel } from './contracts';

export interface ILessonItem {
  _id: Types.ObjectId;
  type: 'word' | 'phrase';
  term: string;
  meaningZh: string;
  contextSentence: string;
  explanation: string;
  exampleSentence: string;
  importanceReason?: string;
  difficulty?: LessonLevel;
}

export interface ILesson extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  articleId: Types.ObjectId;
  levelAtGeneration: LessonLevel;
  status: 'generating' | 'ready' | 'failed';
  summary?: string;
  difficulty?: LessonLevel;
  learningFocus?: string;
  contentDensity: 'low' | 'normal';
  items: Types.DocumentArray<ILessonItem>;
  generationMeta: {
    provider?: string;
    model?: string;
    generatedAt?: Date;
    promptVersion: string;
    durationMs?: number;
    initialRawCount?: number;
    finalValidCount?: number;
    refillCount?: number;
    inputTokens?: number;
    outputTokens?: number;
    articleWordCount: number;
    truncated: boolean;
  };
  failureCode?: LessonErrorCode;
  failureMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LessonItemSchema = new Schema<ILessonItem>({
  type: { type: String, required: true, enum: ['word', 'phrase'] },
  term: { type: String, required: true, trim: true },
  meaningZh: { type: String, required: true, trim: true },
  contextSentence: { type: String, required: true, trim: true },
  explanation: { type: String, required: true, trim: true },
  exampleSentence: { type: String, required: true, trim: true },
  importanceReason: { type: String, trim: true },
  difficulty: { type: String, enum: ['basic', 'intermediate', 'upper_intermediate', 'advanced'] },
});

const LessonSchema = new Schema<ILesson>({
  ownerId: { type: String, required: true, trim: true, index: true },
  articleId: { type: Schema.Types.ObjectId, required: true, ref: 'Article', index: true },
  levelAtGeneration: {
    type: String,
    required: true,
    enum: ['basic', 'intermediate', 'upper_intermediate', 'advanced'],
  },
  status: { type: String, required: true, enum: ['generating', 'ready', 'failed'], default: 'generating' },
  summary: { type: String, trim: true },
  difficulty: { type: String, enum: ['basic', 'intermediate', 'upper_intermediate', 'advanced'] },
  learningFocus: { type: String, trim: true },
  items: {
    type: [LessonItemSchema],
    default: [],
    validate: {
      validator(this: ILesson, items: ILessonItem[]) {
        return this.status !== 'ready' || (items.length >= 5 && items.length <= 15);
      },
      message: 'A ready lesson must contain between 5 and 15 items.',
    },
  },
  contentDensity: { type: String, required: true, enum: ['low', 'normal'], default: 'normal' },
  generationMeta: {
    provider: String,
    model: String,
    generatedAt: Date,
    promptVersion: { type: String, required: true },
    durationMs: Number,
    initialRawCount: Number,
    finalValidCount: Number,
    refillCount: Number,
    inputTokens: Number,
    outputTokens: Number,
    articleWordCount: { type: Number, required: true },
    truncated: { type: Boolean, required: true },
  },
  failureCode: String,
  failureMessage: String,
}, { timestamps: true });

LessonSchema.index({ ownerId: 1, articleId: 1, levelAtGeneration: 1 }, { unique: true });
LessonSchema.index({ ownerId: 1, createdAt: -1 });

export const Lesson = mongoose.model<ILesson>('Lesson', LessonSchema);
