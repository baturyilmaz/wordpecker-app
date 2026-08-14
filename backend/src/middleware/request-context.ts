import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const requestContext = (request: Request, response: Response, next: NextFunction) => {
  request.requestId = randomUUID();
  response.setHeader('X-Request-Id', request.requestId);
  next();
};
