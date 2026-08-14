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
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'SERVER_ERROR';

  logRequestError(req, statusCode, code, err);

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    code,
    message,
    requestId: req.requestId,
  });
};
