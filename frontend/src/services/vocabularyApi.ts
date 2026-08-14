import type { VocabularyEntry } from '../types';
import { api } from './api';

export type VocabularyFilter = 'all' | 'unknown' | 'saved' | 'due';

export const vocabularyApi = {
  list: (filter: VocabularyFilter = 'all'): Promise<{ items: VocabularyEntry[] }> =>
    api.get('/api/langsift-vocabulary', { params: { filter } }),
  get: (term: string): Promise<VocabularyEntry> =>
    api.get(`/api/langsift-vocabulary/${encodeURIComponent(term)}`),
};
