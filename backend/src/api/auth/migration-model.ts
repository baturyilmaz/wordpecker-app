import mongoose, { Document, Schema, Types } from 'mongoose';

export interface MigrationCounts {
  articles: number;
  lessons: number;
  interactions: number;
  quizzes: number;
  reviews: number;
  events: number;
}

export interface IGuestMigration extends Document {
  _id: Types.ObjectId;
  guestId: string;
  userId: Types.ObjectId;
  status: 'running' | 'completed';
  counts: MigrationCounts;
  migratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GuestMigrationSchema = new Schema<IGuestMigration>({
  guestId: { type: String, required: true, trim: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  status: { type: String, required: true, enum: ['running', 'completed'], default: 'running' },
  counts: {
    articles: { type: Number, required: true, default: 0 },
    lessons: { type: Number, required: true, default: 0 },
    interactions: { type: Number, required: true, default: 0 },
    quizzes: { type: Number, required: true, default: 0 },
    reviews: { type: Number, required: true, default: 0 },
    events: { type: Number, required: true, default: 0 },
  },
  migratedAt: Date,
}, { timestamps: true });

GuestMigrationSchema.index({ guestId: 1, userId: 1 }, { unique: true });

export const GuestMigration = mongoose.model<IGuestMigration>('GuestMigration', GuestMigrationSchema);
