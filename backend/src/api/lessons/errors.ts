export type LessonErrorCode =
  | 'ARTICLE_NOT_FOUND'
  | 'ARTICLE_FORBIDDEN'
  | 'INVALID_LEVEL'
  | 'LESSON_GENERATION_FAILED'
  | 'LESSON_OUTPUT_INVALID'
  | 'LESSON_NOT_FOUND'
  | 'LESSON_FORBIDDEN'
  | 'INVALID_INTERACTION';

const statusByCode: Record<LessonErrorCode, number> = {
  ARTICLE_NOT_FOUND: 404,
  ARTICLE_FORBIDDEN: 403,
  INVALID_LEVEL: 400,
  LESSON_GENERATION_FAILED: 502,
  LESSON_OUTPUT_INVALID: 502,
  LESSON_NOT_FOUND: 404,
  LESSON_FORBIDDEN: 403,
  INVALID_INTERACTION: 400,
};

export class LessonError extends Error {
  readonly statusCode: number;

  constructor(readonly code: LessonErrorCode, message: string) {
    super(message);
    this.name = 'LessonError';
    this.statusCode = statusByCode[code];
  }
}

export const lessonErrorMessages: Record<LessonErrorCode, string> = {
  ARTICLE_NOT_FOUND: 'Article not found.',
  ARTICLE_FORBIDDEN: 'You do not have access to this article.',
  INVALID_LEVEL: 'Please choose a valid English level.',
  LESSON_GENERATION_FAILED: "We couldn't create this lesson. Please try again.",
  LESSON_OUTPUT_INVALID: "We couldn't create a valid lesson. Please try again.",
  LESSON_NOT_FOUND: 'Lesson not found.',
  LESSON_FORBIDDEN: 'You do not have access to this lesson.',
  INVALID_INTERACTION: 'Invalid lesson interaction.',
};
