/* eslint-env jest */
jest.mock('@openai/agents', () => ({ run: jest.fn() }));
jest.mock('./agents', () => ({ configureOpenAIAgents: jest.fn() }));
jest.mock('./api/image-description/stock-photo-service', () => ({ stockPhotoService: { findStockImage: jest.fn() } }));

import request from 'supertest';
import app from './app';
import { environment } from './config/environment';

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
});
