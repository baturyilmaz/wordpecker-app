import axios from 'axios';
import { WordList, Word, Exercise, Question, Template, WordDetail, SentenceExample, UserPreferences, ExerciseTypePreferences, ImageDescriptionAnalysis, DescriptionExercise, VocabularyWordsResponse, WordDetailsResponse } from '../types';

// Generate or retrieve user ID
const getUserId = () => {
  let userId = localStorage.getItem('wordpecker-user-id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('wordpecker-user-id', userId);
  }
  return userId;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include user-id header
api.interceptors.request.use(
  (config) => {
    config.headers['user-id'] = getUserId();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors and unwrap data
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Helper type for API responses
type ApiResponse<T> = Promise<T>;

// Response types
interface LearnStartResponse {
  exercises: Exercise[];
}

interface LearnExercisesResponse {
  exercises: Exercise[];
}

interface QuizStartResponse {
  questions: Question[];
  total_questions: number;
}

interface QuizQuestionsResponse {
  questions: Question[];
  completed: boolean;
}

// API service for WordPecker app
export const apiService = {
  // Lists
  getLists: (): ApiResponse<WordList[]> => api.get('/api/lists'),
  getList: (id: string): ApiResponse<WordList> => api.get(`/api/lists/${id}`),
  createList: (data: Partial<WordList>): ApiResponse<WordList> => api.post('/api/lists', data),
  updateList: (id: string, data: Partial<WordList>): ApiResponse<WordList> => api.put(`/api/lists/${id}`, data),
  deleteList: async (listId: string): Promise<void> => {
    await api.delete(`/api/lists/${listId}`);
  },

  // Words
  getWords: (listId: string): ApiResponse<Word[]> => api.get(`/api/lists/${listId}/words`),
  addWord: (listId: string, word: string, meaning?: string): ApiResponse<Word> => api.post(`/api/lists/${listId}/words`, { word, ...(meaning && { meaning }) }),
  deleteWord: (listId: string, wordId: string): ApiResponse<void> => api.delete(`/api/lists/${listId}/words/${wordId}`),
  validateFillBlankAnswer: (userAnswer: string, correctAnswer: string, question: string, context?: string): ApiResponse<{isValid: boolean}> => 
    api.post('/api/lists/validate-answer', { userAnswer, correctAnswer, question, context }),

  // Learning
  startLearning: (listId: string): ApiResponse<LearnStartResponse> => 
    api.post(`/api/learn/${listId}/start`),
  getExercises: (listId: string): ApiResponse<LearnExercisesResponse> => 
    api.post(`/api/learn/${listId}/more`),

  // Quiz
  startQuiz: (listId: string): ApiResponse<QuizStartResponse> => 
    api.post(`/api/quiz/${listId}/start`),
  getQuestions: (listId: string): ApiResponse<QuizQuestionsResponse> => 
    api.post(`/api/quiz/${listId}/more`),
  updateLearnedPoints: (listId: string, results: Array<{wordId: string, correct: boolean}>): ApiResponse<{message: string}> =>
    api.put(`/api/quiz/${listId}/learned-points`, { results }),

  // Templates
  getTemplates: (params?: {category?: string, difficulty?: string, search?: string, featured?: boolean}): ApiResponse<Template[]> => 
    api.get('/api/templates', { params }),
  getTemplate: (id: string): ApiResponse<Template> => api.get(`/api/templates/${id}`),
  cloneTemplate: (id: string, name?: string): ApiResponse<WordList> => 
    api.post(`/api/templates/${id}/clone`, { name }),
  getCategories: (): ApiResponse<string[]> => api.get('/api/templates/categories'),

  // Word Details
  getWordDetails: (wordId: string): ApiResponse<WordDetail> => api.get(`/api/lists/word/${wordId}`),
  generateWordSentences: (wordId: string, contextIndex?: number): ApiResponse<{word: string, examples: SentenceExample[]}> => 
    api.post(`/api/lists/word/${wordId}/sentences`, { contextIndex }),
  generateSimilarWords: (wordId: string, contextIndex?: number): ApiResponse<{
    word: string;
    meaning: string;
    context: string;
    similar_words: {
      synonyms: Array<{ word: string; meaning: string; example: string; usage_note?: string }>;
      interchangeable_words: Array<{ word: string; meaning: string; example: string; usage_note?: string }>;
    };
  }> => api.post(`/api/lists/word/${wordId}/similar`, { contextIndex }),

  // User Preferences
  getPreferences: (): ApiResponse<UserPreferences> => api.get('/api/preferences'),
  updatePreferences: (preferences: { 
    exerciseTypes?: ExerciseTypePreferences; 
    baseLanguage?: string; 
    targetLanguage?: string; 
  }): ApiResponse<UserPreferences> => 
    api.put('/api/preferences', preferences),

  // Language Validation
  validateLanguage: (language: string): ApiResponse<{
    isValid: boolean;
    languageCode: string | null;
    standardizedName: string | null;
    parameters: Array<{
      type: 'script' | 'dialect' | 'formality' | 'region' | 'learning_focus';
      value: string;
      description: string;
    }> | null;
    explanation: string | null;
  }> => api.post('/api/language-validation/validate', { language }),

  // Image Description Learning
  startDescriptionExercise: (context?: string, imageSource: 'ai' | 'stock' = 'ai'): ApiResponse<{
    context: string;
    image: { url: string; alt: string; id: string };
    instructions: string;
  }> => api.post('/api/describe/start', { 
    ...(context ? { context } : {}),
    imageSource 
  }),
  
  submitDescription: (data: {
    context: string;
    imageUrl: string;
    imageAlt: string;
    userDescription: string;
  }): ApiResponse<{
    exerciseId: string;
    analysis: ImageDescriptionAnalysis;
    message: string;
  }> => api.post('/api/describe/submit', data),
  
  addWordsToList: (data: {
    exerciseId: string;
    listId?: string;
    selectedWords: Array<{ word: string; meaning: string }>;
    createNewList?: boolean;
  }): ApiResponse<{
    message: string;
    addedWords: Array<{ word: string; meaning: string }>;
    listId: string;
    listName: string;
    createdNewList: boolean;
  }> => api.post('/api/describe/add-words', data),
  
  getDescriptionHistory: (limit?: number): ApiResponse<{
    exercises: DescriptionExercise[];
  }> => api.get('/api/describe/history', { params: { limit } }),
  
  getContextSuggestions: (): ApiResponse<{
    suggestions: string[];
  }> => api.get('/api/describe/context-suggestions'),

  // Vocabulary learning methods
  generateVocabularyWords: (context: string, difficulty: 'basic' | 'intermediate' | 'advanced' = 'intermediate', count?: number): ApiResponse<VocabularyWordsResponse> => 
    api.post('/api/vocabulary/generate-words', { context, difficulty, count }),
  
  getVocabularyWordDetails: (word: string, context: string): ApiResponse<WordDetailsResponse> => 
    api.post('/api/vocabulary/get-word-details', { word, context }),

  // Audio & Pronunciation
  generateAudio: (text: string, language?: string, voice?: string, speed?: number): ApiResponse<{
    success: boolean;
    data: {
      audioUrl: string;
      cacheKey: string;
      voice: string;
      duration?: number;
    };
  }> => api.post('/api/audio/generate', { text, language, voice, speed }),

  generateWordPronunciation: (word: string, language?: string, context?: string): ApiResponse<{
    success: boolean;
    data: {
      audioUrl: string;
      cacheKey: string;
      voice: string;
      word: string;
      language: string;
    };
  }> => api.post('/api/audio/word-pronunciation', { word, language, context }),

  generateSentencePronunciation: (sentence: string, language?: string, speed?: number): ApiResponse<{
    success: boolean;
    data: {
      audioUrl: string;
      cacheKey: string;
      voice: string;
      sentence: string;
      language: string;
      speed: number;
    };
  }> => api.post('/api/audio/sentence-pronunciation', { sentence, language, speed }),

  getAvailableVoices: (language?: string): ApiResponse<{
    voices: Array<{
      id: string;
      name: string;
      language: string;
      category: string;
    }>;
    total: number;
  }> => api.get('/api/audio/voices', { params: { language } }),

  // Light Reading
  generateLightReading: (listId: string, level: 'beginner' | 'intermediate' | 'advanced'): ApiResponse<{
    title: string;
    content: string;
    word_count: number;
    reading_time_minutes: number;
    highlighted_words: Array<{ word: string; definition: string; position: number }>;
    list_name: string;
    list_context?: string;
    level: string;
    words_included: number;
    total_words_in_list: number;
  }> => api.post(`/api/lists/${listId}/light-reading`, { level }),

  // Voice Agent
  createVoiceSession: (listId: string): ApiResponse<{
    success: boolean;
    data: {
      clientSecret: string;
      expiresAt: string;
      sessionId: string;
      listContext: {
        listId: string;
        listName: string;
        description?: string;
        context?: string;
      };
      userLanguages: {
        baseLanguage: string;
        targetLanguage: string;
      };
    };
  }> => api.post('/api/voice/session', { listId })
}; 