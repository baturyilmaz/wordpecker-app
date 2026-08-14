import { Request } from 'express';

export const logRequestError = (
  request: Request,
  status: number,
  code: string,
  error?: unknown,
) => {
  console.error('Request failed.', {
    requestId: request.requestId,
    route: `${request.method} ${request.baseUrl}${request.path}`,
    status,
    code,
    identity: request.identity?.type || 'anonymous',
    errorName: error instanceof Error ? error.name : error ? 'UnknownError' : undefined,
  });
};
