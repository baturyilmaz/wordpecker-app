/* eslint-env jest */
import express from 'express';
import request from 'supertest';
import { errorHandler } from './errorHandler';
import { requestContext } from './request-context';

describe('request diagnostics', () => {
  it('adds a generated request id to every response', async () => {
    const app = express();
    app.use(requestContext);
    app.get('/ok', (_req, res) => res.json({ ok: true }));
    const response = await request(app).get('/ok');
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('logs safe request context and never returns a stack trace', async () => {
    const app = express();
    app.use(requestContext);
    app.get('/failed', (_req, _res, next) => next(new Error('database unavailable')));
    app.use(errorHandler);
    const response = await request(app).get('/failed');
    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ code: 'SERVER_ERROR', requestId: response.headers['x-request-id'] });
    expect(response.body.stack).toBeUndefined();
    expect(response.body.message).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(response.body)).not.toContain('database unavailable');
    expect(console.error).toHaveBeenCalledWith('Request failed.', expect.objectContaining({
      requestId: response.headers['x-request-id'], route: 'GET /failed', status: 500, code: 'SERVER_ERROR', identity: 'anonymous', errorName: 'Error',
    }));
  });
});
