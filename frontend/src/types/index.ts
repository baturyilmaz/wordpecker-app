export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface WordList {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  context?: string;
  wordCount?: number;
  averageProgress?: number;
  masteredWords?: number;
  created_at: string;
  updated_at: string;
}

export interface Word {
  id: string;
  list_id: string;
  value: string;
  meaning: string;
  learnedPoint: number;
  created_at: string;
  updated_at: string;
}

export interface WordContext {
  listId: string;
  listName: string;
  listContext?: string;
  meaning: string;
  learnedPoint: number;
}

export interface WordDetail {
  id: string;
  value: string;
  contexts: WordContext[];
  created_at: string;
  updated_at: string;
}

export interface SentenceExample {
  sentence: string;
  translation?: string | null;
  context_note?: string;
  explanation?: string; // Keep for backward compatibility
}

export interface Exercise {
  word: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching' | 'true_false' | 'sentence_completion';
  question: string;
  options: string[] | null;
  optionLabels: string[] | null;
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hint: string | null;
  feedback: string | null;
  // For matching questions
  pairs: Array<{word: string; definition: string}> | null;
}

export interface Question {
  word: string;
  wordId?: string | null;
  type: 'multiple_choice' | 'fill_blank' | 'matching' | 'true_false' | 'sentence_completion';
  question: string;
  options: string[] | null;
  optionLabels: string[] | null;
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hint: string | null;
  feedback: string | null;
  // For matching questions
  pairs: Array<{word: string; definition: string}> | null;
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

export interface ExerciseTypePreferences {
  multiple_choice: boolean;
  fill_blank: boolean;
  matching: boolean;
  true_false: boolean;
  sentence_completion: boolean;
}

export interface UserPreferences {
  exerciseTypes: ExerciseTypePreferences;
  baseLanguage: string;
  targetLanguage: string;
}

export interface VocabularyRecommendation {
  word: string;
  meaning: string;
  example: string;
  difficulty_level?: 'basic' | 'intermediate' | 'advanced';
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
  context: string;
  imageUrl: string;
  imageAlt: string;
  userDescription: string;
  analysis: ImageDescriptionAnalysis;
  recommendedWords: VocabularyRecommendation[];
  created_at: string;
}

export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  difficulty_level: 'basic' | 'intermediate' | 'advanced';
  context: string;
}

export interface VocabularyWordsResponse {
  context: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  words: VocabularyWord[];
  count: number;
  excludedWords: number;
}

export interface WordDetailsResponse {
  word: string;
  meaning: string;
  example: string;
  difficulty_level: 'basic' | 'intermediate' | 'advanced';
  context: string;
}

export interface SimilarWord {
  word: string;
  meaning: string;
  example: string;
  usage_note?: string;
}

export interface SimilarWordsResponse {
  word: string;
  meaning: string;
  context: string;
  similar_words: {
    synonyms: SimilarWord[];
    interchangeable_words: SimilarWord[];
  };
}

export interface LightReading {
  title: string;
  text: string;
  word_count: number;
  difficulty_level: string;
  theme: string;
  highlighted_words: Array<{ 
    word: string; 
    definition: string; 
    position: number | null;
  }>;
}