import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IQuizQuestion {
  _id: Types.ObjectId;
  lessonId: Types.ObjectId;
  lessonItemId: Types.ObjectId;
  type: 'multiple_choice' | 'fill_in_the_blank';
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  userAnswer?: string;
  normalizedAnswer?: string;
  isCorrect?: boolean;
  answeredAt?: Date;
}

export interface ILessonQuiz extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  lessonId: Types.ObjectId;
  status: 'active' | 'completed';
  questionCount: number;
  correctCount: number;
  totalCount: number;
  questions: Types.DocumentArray<IQuizQuestion>;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>({
  lessonId: { type: Schema.Types.ObjectId, required: true, ref: 'Lesson' },
  lessonItemId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, required: true, enum: ['multiple_choice', 'fill_in_the_blank'] },
  prompt: { type: String, required: true, trim: true },
  options: { type: [String], default: [] },
  correctAnswer: { type: String, required: true, trim: true },
  explanation: { type: String, trim: true },
  userAnswer: String,
  normalizedAnswer: String,
  isCorrect: Boolean,
  answeredAt: Date,
});

const LessonQuizSchema = new Schema<ILessonQuiz>({
  ownerId: { type: String, required: true, trim: true, index: true },
  lessonId: { type: Schema.Types.ObjectId, required: true, ref: 'Lesson', index: true },
  status: { type: String, required: true, enum: ['active', 'completed'], default: 'active' },
  questionCount: { type: Number, required: true, min: 1, max: 10 },
  correctCount: { type: Number, required: true, default: 0 },
  totalCount: { type: Number, required: true, default: 0 },
  questions: { type: [QuizQuestionSchema], required: true },
  startedAt: { type: Date, required: true, default: Date.now },
  completedAt: Date,
}, { timestamps: true });

LessonQuizSchema.index(
  { ownerId: 1, lessonId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

export const LessonQuiz = mongoose.model<ILessonQuiz>('LessonQuiz', LessonQuizSchema);
