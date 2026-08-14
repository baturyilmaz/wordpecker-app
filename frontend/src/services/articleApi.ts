import axios from 'axios';
import type { Article, ArticleApiError } from '../types';
import { api } from './api';

const fallbackMessages: Record<string, string> = {
  INVALID_URL: 'Please enter a valid public article URL.',
  ARTICLE_UNAVAILABLE: "This article can't be accessed directly. Please try another public link.",
  ARTICLE_BLOCKED: "This article can't be accessed directly. Please try another public link.",
  ARTICLE_TOO_SHORT: 'We could not find enough article text at this URL.',
  NOT_ENGLISH: 'This article does not appear to be written in English.',
  FETCH_TIMEOUT: 'The article took too long to respond. Please try again.',
  UNSUPPORTED_CONTENT: 'This link does not point to a supported HTML article.',
};

export const articleApi = {
  extract: (url: string): Promise<Article> => api.post('/api/articles/extract', { url }),
  get: (id: string): Promise<Article> => api.get(`/api/articles/${id}`),
};

export const getArticleError = (error: unknown): ArticleApiError => {
  if (axios.isAxiosError<ArticleApiError>(error)) {
    const code = error.response?.data?.code || 'ARTICLE_UNAVAILABLE';
    return {
      code,
      message: error.response?.data?.message || fallbackMessages[code] || fallbackMessages.ARTICLE_UNAVAILABLE,
    };
  }
  return { code: 'ARTICLE_UNAVAILABLE', message: fallbackMessages.ARTICLE_UNAVAILABLE };
};
