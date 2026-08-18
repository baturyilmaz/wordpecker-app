import { Request, Response, NextFunction } from 'express';
import { logRequestError } from '../utils/request-log';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const isPayloadTooLarge = statusCode === 413;
  const message = statusCode >= 500
    ? 'Something went wrong. Please try again.'
    : isPayloadTooLarge ? 'The request is too large.' : err.message || 'Request failed.';
  const code = isPayloadTooLarge ? 'REQUEST_TOO_LARGE' : err.code || 'SERVER_ERROR';

  logRequestError(req, statusCode, code, err);

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    code,
    message,
    requestId: req.requestId,
  });
};
