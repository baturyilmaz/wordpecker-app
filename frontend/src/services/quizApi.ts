import type { LessonQuiz } from '../types';
import { api } from './api';

export const quizApi = {
  create: (lessonId: string): Promise<LessonQuiz> => api.post('/api/lesson-quizzes', { lessonId }),
  get: (quizId: string): Promise<LessonQuiz> => api.get(`/api/lesson-quizzes/${quizId}`),
  answer: (quizId: string, questionId: string, answer: string): Promise<LessonQuiz> =>
    api.put(`/api/lesson-quizzes/${quizId}/questions/${questionId}/answer`, { answer }),
};
