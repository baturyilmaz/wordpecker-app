import { Schema, model, Document } from 'mongoose';
import { ImageDescriptionAnalysis, VocabularyRecommendation } from '../../types';

export interface IDescriptionExercise extends Document {
  userId: string;
  context: string;
  imageUrl: string;
  imageAlt: string;
  userDescription: string;
  analysis: ImageDescriptionAnalysis;
  recommendedWords: VocabularyRecommendation[];
  createdAt: Date;
  updatedAt: Date;
}

const vocabularyRecommendationSchema = new Schema({
  word: { type: String, required: true },
  meaning: { type: String, required: true },
  example: { type: String, required: true },
  difficulty_level: { 
    type: String, 
    enum: ['basic', 'intermediate', 'advanced'],
    default: 'intermediate'
  }
}, { _id: false });

const imageDescriptionAnalysisSchema = new Schema({
  corrected_description: { type: String, required: true },
  feedback: { type: String, required: true },
  recommendations: [vocabularyRecommendationSchema],
  user_strengths: [{ type: String }],
  missed_concepts: [{ type: String }]
}, { _id: false });

const descriptionExerciseSchema = new Schema<IDescriptionExercise>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  context: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  imageAlt: {
    type: String,
    default: ''
  },
  userDescription: {
    type: String,
    required: true
  },
  analysis: {
    type: imageDescriptionAnalysisSchema,
    required: true
  },
  recommendedWords: [vocabularyRecommendationSchema]
}, {
  timestamps: true
});

// Index for finding user's recent exercises
descriptionExerciseSchema.index({ userId: 1, createdAt: -1 });

export const DescriptionExercise = model<IDescriptionExercise>('DescriptionExercise', descriptionExerciseSchema);