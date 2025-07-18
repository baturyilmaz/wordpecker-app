import { Schema, model, Document } from 'mongoose';
import { ExerciseTypePreferences } from '../../types/index';

export interface IUserPreferences extends Document {
  userId: string;
  exerciseTypes: ExerciseTypePreferences;
  baseLanguage: string;
  targetLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

const userPreferencesSchema = new Schema<IUserPreferences>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  exerciseTypes: {
    multiple_choice: { type: Boolean, default: true },
    fill_blank: { type: Boolean, default: true },
    matching: { type: Boolean, default: true },
    true_false: { type: Boolean, default: true },
    sentence_completion: { type: Boolean, default: true }
  },
  baseLanguage: {
    type: String,
    required: true,
    default: 'en' // English as default base language
  },
  targetLanguage: {
    type: String,
    required: true,
    default: 'en' // English as default target language
  }
}, {
  timestamps: true
});

export const UserPreferences = model<IUserPreferences>('UserPreferences', userPreferencesSchema);