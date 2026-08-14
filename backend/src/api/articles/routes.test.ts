/* eslint-env jest */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { ArticleError, articleErrorMessages } from './errors';
import { createArticleRouter } from './routes';
import { Article, IArticle } from './model';
import { ProductEventService } from '../product-events/service';

const ownerId = 'guest_12345678-abcd-4000-8000-123456789abc';

const makeArticle = (): IArticle => ({
  _id: new mongoose.Types.ObjectId(),
  ownerId,
  originalUrl: 'https://example.com/story',
  canonicalUrl: 'https://example.com/story',
  title: 'A useful English article',
  source: 'Example',
  language: 'en',
  content: 'Useful article content.',
  excerpt: 'Useful article content.',
  wordCount: 320,
  status: 'extracted',
  createdAt: new Date('2026-07-20T10:00:00Z'),
  updatedAt: new Date('2026-07-20T10:00:00Z'),
} as IArticle);

const createApp = (extractor?: Parameters<typeof createArticleRouter>[0]) => {
  const app = express();
  app.use(express.json());
  app.use('/api/articles', createArticleRouter(extractor, new ProductEventService(async () => undefined)));
  return app;
};

const createUserApp = (userId: string) => {
  const app = express();
  app.use((req, _res, next) => { req.identity = { type: 'user', id: userId, ownerId: `user_${userId}` }; next(); });
  app.use('/api/articles', createArticleRouter(undefined, new ProductEventService(async () => undefined)));
  return app;
};

describe('article routes', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns INVALID_URL when the URL is missing', async () => {
    const response = await request(createApp(jest.fn())).post('/api/articles/extract').set('user-id', ownerId).send({});
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_URL');
  });

  it('returns INVALID_URL for a blocked private URL', async () => {
    const response = await request(createApp()).post('/api/articles/extract').set('user-id', ownerId).send({ url: 'http://127.0.0.1' });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'INVALID_URL' });
  });

  it('returns a successfully extracted article', async () => {
    const response = await request(createApp(jest.fn().mockResolvedValue(makeArticle())))
      .post('/api/articles/extract')
      .set('user-id', ownerId)
      .send({ url: 'https://example.com/story' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ title: 'A useful English article', wordCount: 320, language: 'en' });
  });

  it('returns a stable business error for failed extraction', async () => {
    const extractor = jest.fn().mockRejectedValue(new ArticleError('ARTICLE_BLOCKED', articleErrorMessages.ARTICLE_BLOCKED));
    const response = await request(createApp(extractor)).post('/api/articles/extract').set('user-id', ownerId).send({ url: 'https://example.com/blocked' });
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ code: 'ARTICLE_BLOCKED', message: articleErrorMessages.ARTICLE_BLOCKED });
  });

  it('returns an owned article and blocks another guest', async () => {
    const article = makeArticle();
    jest.spyOn(Article, 'findById').mockResolvedValue(article);
    const allowed = await request(createApp()).get(`/api/articles/${article._id}`).set('user-id', ownerId);
    const forbidden = await request(createApp()).get(`/api/articles/${article._id}`)
      .set('user-id', 'guest_aaaaaaaa-bbbb-4000-8000-cccccccccccc');
    expect(allowed.status).toBe(200);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('ARTICLE_FORBIDDEN');
  });

  it('does not let an authenticated user switch owner with a forged guest header', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const article = { ...makeArticle(), ownerId: `user_${userId}` } as IArticle;
    jest.spyOn(Article, 'findById').mockResolvedValue(article);
    const response = await request(createUserApp(userId)).get(`/api/articles/${article._id}`).set('user-id', ownerId);
    expect(response.status).toBe(200);
  });
});
