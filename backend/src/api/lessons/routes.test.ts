/* eslint-env jest */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { LessonError } from './errors';
import { LessonInteractionService } from './interaction-service';
import { ILesson } from './model';
import { createLessonRouter } from './routes';
import { LessonService } from './service';
import { ProductEventService } from '../product-events/service';

const ownerId = 'guest_12345678-abcd-4000-8000-123456789abc';
const lessonId = new mongoose.Types.ObjectId();
const articleId = new mongoose.Types.ObjectId();

const lesson = () => {
  const itemId = new mongoose.Types.ObjectId();
  return {
    _id: lessonId,
    ownerId,
    articleId,
    levelAtGeneration: 'intermediate',
    status: 'ready',
    summary: 'A summary. Another sentence.',
    difficulty: 'intermediate',
    learningFocus: 'Practice useful expressions.',
    items: [{
      _id: itemId,
      type: 'phrase',
      term: 'pave the way',
      meaningEn: 'to make future progress possible',
      meaningZh: '为……铺平道路',
      contextSentence: 'The research could pave the way for better treatments.',
      explanation: 'It means to make future progress possible.',
      exampleSentence: 'This agreement may pave the way for further cooperation.',
    }],
    generationMeta: { promptVersion: 'v1', model: 'configured-model', articleWordCount: 500, truncated: false },
    createdAt: new Date('2026-08-13T10:00:00Z'),
    updatedAt: new Date('2026-08-13T10:00:00Z'),
  } as unknown as ILesson;
};

const appWith = (lessons: Partial<LessonService>, authenticated = false) => {
  const app = express();
  app.use(express.json());
  if (authenticated) app.use((req, _res, next) => { req.identity = { type: 'user', id: '507f1f77bcf86cd799439011', ownerId: 'user_507f1f77bcf86cd799439011' }; next(); });
  const interactions = { list: jest.fn().mockResolvedValue([]) } as unknown as LessonInteractionService;
  app.use('/api/lessons', createLessonRouter(lessons as LessonService, interactions, new ProductEventService(async () => undefined)));
  return app;
};

describe('Lesson API', () => {
  it('creates a lesson', async () => {
    const service = { create: jest.fn().mockResolvedValue(lesson()) };
    const response = await request(appWith(service))
      .post('/api/lessons')
      .set('user-id', ownerId)
      .send({ articleId: articleId.toString(), level: 'intermediate' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: lessonId.toString(), levelAtGeneration: 'intermediate', status: 'ready' });
  });

  it('gets an owned lesson', async () => {
    const service = { getOwned: jest.fn().mockResolvedValue(lesson()) };
    const response = await request(appWith(service)).get(`/api/lessons/${lessonId}`).set('user-id', ownerId);
    expect(response.status).toBe(200);
    expect(response.body.items[0].interaction).toMatchObject({ knowledgeStatus: 'unset', saved: false });
  });

  it('rejects another owner lesson', async () => {
    const service = { getOwned: jest.fn().mockRejectedValue(new LessonError('LESSON_FORBIDDEN', 'forbidden')) };
    const response = await request(appWith(service)).get(`/api/lessons/${lessonId}`).set('user-id', ownerId);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('LESSON_FORBIDDEN');
  });

  it('rejects an invalid level', async () => {
    const service = { create: jest.fn() };
    const response = await request(appWith(service))
      .post('/api/lessons')
      .set('user-id', ownerId)
      .send({ articleId: articleId.toString(), level: 'expert' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_LEVEL');
  });

  it('returns the same lesson for duplicate create requests', async () => {
    const existing = lesson();
    const service = { create: jest.fn().mockResolvedValue(existing) };
    const app = appWith(service);
    const first = await request(app).post('/api/lessons').set('user-id', ownerId)
      .send({ articleId: articleId.toString(), level: 'intermediate' });
    const second = await request(app).post('/api/lessons').set('user-id', ownerId)
      .send({ articleId: articleId.toString(), level: 'intermediate' });
    expect(second.body.id).toBe(first.body.id);
  });

  it('requires auth for save term but keeps know and unknown available to guests', async () => {
    const interactions = { update: jest.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId(), lessonItemId: new mongoose.Types.ObjectId(), term: 'useful',
      knowledgeStatus: 'unknown', saved: false, createdAt: new Date(), updatedAt: new Date(),
    }) } as unknown as LessonInteractionService;
    const app = express();
    app.use(express.json());
    app.use('/api/lessons', createLessonRouter({} as LessonService, interactions, new ProductEventService(async () => undefined)));
    const save = await request(app).put(`/api/lessons/${lessonId}/items/${new mongoose.Types.ObjectId()}/interaction`).set('user-id', ownerId).send({ saved: true });
    const unknown = await request(app).put(`/api/lessons/${lessonId}/items/${new mongoose.Types.ObjectId()}/interaction`).set('user-id', ownerId).send({ knowledgeStatus: 'unknown' });
    expect(save.status).toBe(401);
    expect(unknown.status).toBe(200);
  });

  it('saves a lesson once for an authenticated owner', async () => {
    const owned = lesson();
    owned.ownerId = 'user_507f1f77bcf86cd799439011';
    owned.save = jest.fn().mockResolvedValue(owned);
    const service = { getOwned: jest.fn().mockResolvedValue(owned) };
    const response = await request(appWith(service, true)).put(`/api/lessons/${lessonId}/save`).send({});
    expect(response.status).toBe(200);
    expect(owned.savedAt).toBeInstanceOf(Date);
    expect(owned.save).toHaveBeenCalledTimes(1);
  });
});
