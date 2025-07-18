import mongoose, { Schema, Document } from 'mongoose';

export interface IWordContext {
  listId: mongoose.Types.ObjectId;
  meaning: string;
  learnedPoint: number; // 0-100, higher means more learned
}

export interface IWord extends Document {
  _id: mongoose.Types.ObjectId;
  value: string;
  ownedByLists: IWordContext[];
  created_at: Date;
  updated_at: Date;
}

const WordContextSchema = new Schema<IWordContext>({
  listId: {
    type: Schema.Types.ObjectId,
    ref: 'WordList',
    required: true
  },
  meaning: {
    type: String,
    required: true,
    trim: true
  },
  learnedPoint: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, { _id: false });

const WordSchema = new Schema<IWord>({
  value: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    unique: true
  },
  ownedByLists: {
    type: [WordContextSchema],
    default: []
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

export const Word = mongoose.model<IWord>('Word', WordSchema);