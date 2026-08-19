import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const requestContext = (request: Request, response: Response, next: NextFunction) => {
  const startedAt = Date.now();
  request.requestId = randomUUID();
  response.setHeader('X-Request-Id', request.requestId);
  response.once('finish', () => {
    if (process.env.NODE_ENV !== 'production') return;
    console.log('Request completed.', {
      requestId: request.requestId,
      route: `${request.method} ${request.baseUrl}${request.path}`,
      status: response.statusCode,
      durationMs: Date.now() - startedAt,
      identity: request.identity?.type || 'anonymous',
    });
  });
  next();
};
