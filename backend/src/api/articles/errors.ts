export type ArticleErrorCode =
  | 'INVALID_URL'
  | 'ARTICLE_UNAVAILABLE'
  | 'ARTICLE_BLOCKED'
  | 'ARTICLE_TOO_SHORT'
  | 'NOT_ENGLISH'
  | 'FETCH_TIMEOUT'
  | 'UNSUPPORTED_CONTENT';

const statusByCode: Record<ArticleErrorCode, number> = {
  INVALID_URL: 400,
  ARTICLE_UNAVAILABLE: 502,
  ARTICLE_BLOCKED: 422,
  ARTICLE_TOO_SHORT: 422,
  NOT_ENGLISH: 422,
  FETCH_TIMEOUT: 504,
  UNSUPPORTED_CONTENT: 415,
};

export class ArticleError extends Error {
  readonly statusCode: number;

  constructor(readonly code: ArticleErrorCode, message: string) {
    super(message);
    this.name = 'ArticleError';
    this.statusCode = statusByCode[code];
  }
}

export const articleErrorMessages: Record<ArticleErrorCode, string> = {
  INVALID_URL: 'Please enter a valid public article URL.',
  ARTICLE_UNAVAILABLE: "This article can't be accessed directly. Please try another public link.",
  ARTICLE_BLOCKED: "This article can't be accessed directly. Please try another public link.",
  ARTICLE_TOO_SHORT: 'We could not find enough article text at this URL.',
  NOT_ENGLISH: 'This article does not appear to be written in English.',
  FETCH_TIMEOUT: 'The article took too long to respond. Please try again.',
  UNSUPPORTED_CONTENT: 'This link does not point to a supported HTML article.',
};
