export interface WordList {
  id: string;
  name: string;
  description?: string;
  context?: string;
  wordCount?: number;
  averageProgress?: number;
  masteredWords?: number;
  created_at: string;
  updated_at: string;
}

export interface WordContext {
  listId: string;
  meaning: string;
  learnedPoint: number;
}

export interface Word {
  id: string;
  value: string;
  ownedByLists: WordContext[];
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  word_id: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching' | 'true_false' | 'sentence_completion';
  question: string;
  options: string[] | null;
  labeled_options: Array<{label: string; text: string}> | null;
  correct_answer: string;
  correct_label: string | null;
  // For matching questions
  pairs: Array<{word: string; definition: string}> | null;
  // For fill-in-the-blank questions
  sentence: string | null;
  blank_position: number | null;
}

export interface Question {
  word_id: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching' | 'true_false' | 'sentence_completion';
  question: string;
  options: string[] | null;
  labeled_options: Array<{label: string; text: string}> | null;
  correct_answer: string;
  correct_label: string | null;
  // For matching questions
  pairs: Array<{word: string; definition: string}> | null;
  // For fill-in-the-blank questions
  sentence: string | null;
  blank_position: number | null;
}

export interface ExerciseResponse {
  exercises: Exercise[];
  completed?: boolean;
}

export interface QuizResponse {
  questions: Question[];
  total_questions?: number;
  completed?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  context?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  words?: Array<{value: string; meaning: string}>;
  wordCount?: number;
  cloneCount: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export type QuestionType = 'multiple_choice' | 'fill_blank' | 'matching' | 'true_false' | 'sentence_completion';

export interface ExerciseTypePreferences {
  multiple_choice: boolean;
  fill_blank: boolean;
  matching: boolean;
  true_false: boolean;
  sentence_completion: boolean;
}

export interface VocabularyRecommendation {
  word: string;
  meaning: string;
  example: string;
  difficulty_level: 'basic' | 'intermediate' | 'advanced';
}

export interface ImageDescriptionAnalysis {
  corrected_description: string;
  feedback: string;
  recommendations: VocabularyRecommendation[];
  user_strengths: string[];
  missed_concepts: string[];
}

export interface DescriptionExercise {
  id: string;
  user_id: string;
  context: string;
  image_url: string;
  image_alt: string;
  user_description: string;
  analysis: ImageDescriptionAnalysis;
  recommended_words: VocabularyRecommendation[];
  created_at: string;
} 