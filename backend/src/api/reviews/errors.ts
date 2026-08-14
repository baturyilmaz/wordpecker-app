export type ReviewErrorCode = 'REVIEW_NOT_FOUND' | 'REVIEW_NOT_ELIGIBLE' | 'REVIEW_INVALID_RATING';

const statusByCode: Record<ReviewErrorCode, number> = {
  REVIEW_NOT_FOUND: 404,
  REVIEW_NOT_ELIGIBLE: 409,
  REVIEW_INVALID_RATING: 400,
};

export class ReviewError extends Error {
  readonly statusCode: number;
  constructor(readonly code: ReviewErrorCode, message: string) {
    super(message);
    this.name = 'ReviewError';
    this.statusCode = statusByCode[code];
  }
}
