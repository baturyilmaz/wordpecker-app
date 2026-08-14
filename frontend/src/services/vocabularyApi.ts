import type { VocabularyEntry } from '../types';
import { api } from './api';
import axios from 'axios';

export type VocabularyFilter = 'all' | 'unknown' | 'saved' | 'due';
export type VocabularyErrorCode = 'AUTH_REQUIRED' | 'VOCABULARY_FETCH_FAILED' | 'OWNER_MIGRATION_INCOMPLETE' | 'SERVER_ERROR';

export const describeVocabularyError = (error: unknown): { code: VocabularyErrorCode; status?: number } => {
  if (!axios.isAxiosError(error)) return { code: 'VOCABULARY_FETCH_FAILED' };
  const status = error.response?.status;
  const responseCode = error.response?.data && typeof error.response.data === 'object'
    ? (error.response.data as { code?: unknown }).code
    : undefined;
  if (status === 401 || responseCode === 'AUTH_REQUIRED') return { code: 'AUTH_REQUIRED', status };
  if (responseCode === 'OWNER_MIGRATION_INCOMPLETE') return { code: 'OWNER_MIGRATION_INCOMPLETE', status };
  if (status && status >= 500) return { code: 'SERVER_ERROR', status };
  return { code: 'VOCABULARY_FETCH_FAILED', status };
};

export const vocabularyApi = {
  list: (filter: VocabularyFilter = 'all'): Promise<{ items: VocabularyEntry[] }> =>
    api.get('/api/vocabulary', { params: { filter } }),
  get: (term: string): Promise<VocabularyEntry> =>
    api.get(`/api/vocabulary/${encodeURIComponent(term)}`),
};
