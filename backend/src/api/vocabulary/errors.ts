export type VocabularyErrorCode = 'VOCABULARY_NOT_FOUND' | 'VOCABULARY_FORBIDDEN';

export class VocabularyError extends Error {
  readonly statusCode: number;
  constructor(readonly code: VocabularyErrorCode, message: string, statusCode = code === 'VOCABULARY_FORBIDDEN' ? 403 : 404) {
    super(message);
    this.name = 'VocabularyError';
    this.statusCode = statusCode;
  }
}
