export type QuizErrorCode =
  | 'QUIZ_NOT_FOUND'
  | 'QUIZ_FORBIDDEN'
  | 'QUIZ_ALREADY_COMPLETED'
  | 'QUIZ_INVALID_ANSWER'
  | 'LESSON_NOT_READY';

const statusByCode: Record<QuizErrorCode, number> = {
  QUIZ_NOT_FOUND: 404,
  QUIZ_FORBIDDEN: 403,
  QUIZ_ALREADY_COMPLETED: 409,
  QUIZ_INVALID_ANSWER: 400,
  LESSON_NOT_READY: 409,
};

export class QuizError extends Error {
  readonly statusCode: number;

  constructor(readonly code: QuizErrorCode, message: string) {
    super(message);
    this.name = 'QuizError';
    this.statusCode = statusByCode[code];
  }
}
