import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  list_id: mongoose.Types.ObjectId;
  type: 'learn' | 'quiz';
  score?: number;
  current_exercise_index?: number;
  created_at: Date;
  completed_at?: Date;
}

const SessionSchema = new Schema<ISession>({
  list_id: {
    type: Schema.Types.ObjectId,
    ref: 'WordList',
    required: true
  },
  type: {
    type: String,
    enum: ['learn', 'quiz'],
    required: true
  },
  score: {
    type: Number,
    min: 0
  },
  current_exercise_index: {
    type: Number,
    min: 0
  },
  completed_at: {
    type: Date
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: false 
  }
});

export const Session = mongoose.model<ISession>('Session', SessionSchema);