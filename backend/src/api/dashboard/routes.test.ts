/* eslint-env jest */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { createDashboardRouter } from './routes';
import { Article } from '../articles/model';
import { Lesson } from '../lessons/model';
import { LessonQuiz } from '../lesson-quizzes/model';
import { VocabularyService } from '../vocabulary/service';

const chain = (value: unknown) => ({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(value) });

describe('dashboard route', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns one owner-scoped dashboard payload', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const ownerId = `user_${userId}`;
    jest.spyOn(Lesson, 'find').mockReturnValue(chain([]) as never);
    jest.spyOn(LessonQuiz, 'findOne').mockReturnValue(chain(null) as never);
    const now = Date.now();
    const vocabulary = { list: jest.fn().mockResolvedValue([
      { knowledgeStatus: 'unknown', saved: true, review: { nextReviewAt: new Date(now - 2_000) } },
      { knowledgeStatus: 'unknown', saved: false, review: { nextReviewAt: new Date(now - 1_000) } },
      { knowledgeStatus: 'known', saved: true, review: { nextReviewAt: new Date(now + 60_000) } },
    ]) } as unknown as VocabularyService;
    jest.spyOn(Article, 'find').mockReturnValue({ lean: jest.fn().mockResolvedValue([]) } as never);
    jest.spyOn(LessonQuiz, 'find').mockReturnValue(chain([]) as never);
    const app = express();
    app.use((req, _res, next) => { req.identity = { type: 'user', id: userId, ownerId }; next(); });
    app.use('/api/dashboard', createDashboardRouter(vocabulary));
    const response = await request(app).get('/api/dashboard');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ continueLearning: null, reviewDueCount: 2, vocabularyCounts: { totalEligible: 3, unknown: 2, saved: 2 }, recentLessons: [] });
    expect(Lesson.find).toHaveBeenCalledWith(expect.objectContaining({ ownerId, status: 'ready' }));
    expect(vocabulary.list).toHaveBeenCalledWith(ownerId);
  });

  it('requires authentication', async () => {
    const app = express();
    app.use('/api/dashboard', createDashboardRouter());
    const response = await request(app).get('/api/dashboard');
    expect(response.status).toBe(401);
  });
});
