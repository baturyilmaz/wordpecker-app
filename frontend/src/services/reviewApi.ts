import type { VocabularyEntry } from '../types';
import { api } from './api';

export type ReviewRating = 'forgot' | 'unsure' | 'remembered';

export const reviewApi = {
  due: (): Promise<{ items: VocabularyEntry[]; count: number }> => api.get('/api/reviews/due'),
  rate: (term: string, rating: ReviewRating): Promise<VocabularyEntry> =>
    api.put(`/api/reviews/${encodeURIComponent(term)}`, { rating }),
};
