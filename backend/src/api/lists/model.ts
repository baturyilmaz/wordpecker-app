import mongoose, { Schema, Document } from 'mongoose';

export interface IWordList extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  context?: string;
  created_at: Date;
  updated_at: Date;
}

const WordListSchema = new Schema<IWordList>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1
  },
  description: {
    type: String,
    trim: true
  },
  context: {
    type: String,
    trim: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

export const WordList = mongoose.model<IWordList>('WordList', WordListSchema);