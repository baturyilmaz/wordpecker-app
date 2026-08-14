/* eslint-env jest */
import express from 'express';
import request from 'supertest';
import { createVocabularyRouter } from './routes';
import { VocabularyService } from './service';
import { ProductEventService } from '../product-events/service';

const ownerId = 'user_507f1f77bcf86cd799439011';

const appWith = (service: Partial<VocabularyService>) => {
  const app = express();
  app.use((req, _res, next) => {
    req.identity = { type: 'user', id: '507f1f77bcf86cd799439011', ownerId };
    next();
  });
  app.use('/api/vocabulary', createVocabularyRouter(service as VocabularyService, new ProductEventService(async () => undefined)));
  return app;
};

describe('Vocabulary API contract', () => {
  it.each(['all', 'unknown', 'saved', 'due'] as const)('serves the authenticated %s filter from /api/vocabulary', async (filter) => {
    const service = { list: jest.fn().mockResolvedValue([]) };
    const response = await request(appWith(service)).get(`/api/vocabulary?filter=${filter}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
    expect(service.list).toHaveBeenCalledWith(ownerId, filter);
  });

  it('returns a stable server diagnostic for an unexpected aggregation failure', async () => {
    const response = await request(appWith({ list: jest.fn().mockRejectedValue(new Error('database unavailable')) }))
      .get('/api/vocabulary');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'SERVER_ERROR', message: 'We could not load vocabulary.' });
  });
});
