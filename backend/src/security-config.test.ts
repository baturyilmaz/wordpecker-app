/* eslint-env jest */
jest.mock('@openai/agents', () => ({ run: jest.fn() }));
jest.mock('./agents', () => ({ configureOpenAIAgents: jest.fn() }));
jest.mock('./api/image-description/stock-photo-service', () => ({ stockPhotoService: { findStockImage: jest.fn() } }));

import request from 'supertest';
import app from './app';
import { environment } from './config/environment';
import { validateProductionEnvironment } from './config/environment';

describe('HTTP security configuration', () => {
  it('allows credentials only for the configured frontend origin', async () => {
    const allowed = await request(app).options('/api/auth/me')
      .set('Origin', environment.frontendUrl)
      .set('Access-Control-Request-Method', 'GET');
    expect(allowed.headers['access-control-allow-origin']).toBe(environment.frontendUrl);
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const untrusted = await request(app).options('/api/auth/me')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');
    expect(untrusted.headers['access-control-allow-origin']).toBeUndefined();
    expect(untrusted.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('rejects oversized JSON with a safe correlated response', async () => {
    const response = await request(app).post('/api/articles/extract')
      .set('user-id', 'guest_12345678-abcd-4000-8000-123456789abc')
      .send({ url: `https://example.com/${'x'.repeat(40_000)}` });
    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ code: 'REQUEST_TOO_LARGE', requestId: response.headers['x-request-id'] });
    expect(response.body.stack).toBeUndefined();
  });

  it('fails closed on unsafe production auth configuration', () => {
    expect(() => validateProductionEnvironment({ nodeEnv: 'production', googleClientId: '', frontendUrl: 'https://app.example', sessionDays: 30 }))
      .toThrow('GOOGLE_CLIENT_ID');
    expect(() => validateProductionEnvironment({ nodeEnv: 'production', googleClientId: 'client', frontendUrl: 'http://app.example', sessionDays: 30 }))
      .toThrow('HTTPS');
    expect(() => validateProductionEnvironment({ nodeEnv: 'production', googleClientId: 'client', frontendUrl: 'https://app.example', sessionDays: 91 }))
      .toThrow('SESSION_DAYS');
    expect(() => validateProductionEnvironment({ nodeEnv: 'production', googleClientId: 'client', frontendUrl: 'https://app.example', sessionDays: 30 }))
      .not.toThrow();
  });

  it('rate limits Google sign-in and Guest article/Lesson creation at the application boundary', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await request(app).post('/api/auth/google').send({})).status).toBe(400);
    }
    expect((await request(app).post('/api/auth/google').send({})).body.code).toBe('AUTH_RATE_LIMITED');

    const guestHeader = { 'user-id': 'guest_12345678-abcd-4000-8000-123456789abc' };
    for (let attempt = 0; attempt < 12; attempt += 1) {
      expect((await request(app).post('/api/lessons').set(guestHeader).send({})).status).toBe(400);
    }
    expect((await request(app).post('/api/lessons').set(guestHeader).send({})).body.code).toBe('LESSON_RATE_LIMITED');

    for (let attempt = 0; attempt < 30; attempt += 1) {
      expect((await request(app).post('/api/articles/extract').set(guestHeader).send({})).status).toBe(400);
    }
    expect((await request(app).post('/api/articles/extract').set(guestHeader).send({})).body.code).toBe('ARTICLE_RATE_LIMITED');
  });
});
