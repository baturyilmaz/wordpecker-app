/* eslint-env jest */
import express from 'express';
import request from 'supertest';
import { createConcurrencyLimiter } from './rateLimiter';

describe('AI generation concurrency protection', () => {
  it('limits concurrent work per resolved owner and releases the slot on completion', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const app = express();
    app.use((req, _res, next) => {
      req.requestId = 'request-id';
      req.identity = { type: 'guest', id: 'guest_12345678-abcd-4000-8000-123456789abc', ownerId: 'guest_12345678-abcd-4000-8000-123456789abc' };
      next();
    });
    app.post('/generate', createConcurrencyLimiter(1), async (_req, res) => {
      await gate;
      res.json({ ok: true });
    });

    const first = request(app).post('/generate').then((response) => response);
    await new Promise((resolve) => setImmediate(resolve));
    const blocked = await request(app).post('/generate');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ code: 'LESSON_CONCURRENCY_LIMITED', requestId: 'request-id' });
    release();
    expect((await first).status).toBe(200);
    expect((await request(app).post('/generate')).status).toBe(200);
  });
});
