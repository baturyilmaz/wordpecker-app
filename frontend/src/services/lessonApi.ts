import axios from 'axios';
import type { KnowledgeStatus, Lesson, LessonApiError, LessonInteraction, LessonLevel } from '../types';
import { api } from './api';

const genericMessage = "We couldn't create this lesson. Please try again.";

export const lessonApi = {
  create: (articleId: string, level: LessonLevel): Promise<Lesson> =>
    api.post('/api/lessons', { articleId, level }, { timeout: 70_000 }),
  get: (id: string): Promise<Lesson> => api.get(`/api/lessons/${id}`),
  updateInteraction: (
    lessonId: string,
    itemId: string,
    update: { knowledgeStatus?: KnowledgeStatus; saved?: boolean },
  ): Promise<LessonInteraction> => api.put(`/api/lessons/${lessonId}/items/${itemId}/interaction`, update),
  save: (lessonId: string): Promise<Lesson> => api.put(`/api/lessons/${lessonId}/save`, {}),
};

export const getLessonError = (error: unknown): LessonApiError => {
  if (axios.isAxiosError<LessonApiError>(error)) {
    return {
      code: error.response?.data?.code || 'LESSON_GENERATION_FAILED',
      message: error.response?.data?.message || genericMessage,
    };
  }
  return { code: 'LESSON_GENERATION_FAILED', message: genericMessage };
};
