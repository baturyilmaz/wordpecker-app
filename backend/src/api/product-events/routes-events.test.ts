/* eslint-env jest */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { createArticleRouter } from '../articles/routes';
import { IArticle } from '../articles/model';
import { createLessonRouter } from '../lessons/routes';
import { ILesson } from '../lessons/model';
import { LessonInteractionService } from '../lessons/interaction-service';
import { LessonService } from '../lessons/service';
import { createLessonQuizRouter } from '../lesson-quizzes/routes';
import { LessonQuizService } from '../lesson-quizzes/service';
import { LessonQuiz } from '../lesson-quizzes/model';
import { createVocabularyRouter } from '../vocabulary/routes';
import { VocabularyService } from '../vocabulary/service';
import { createReviewRouter } from '../reviews/routes';
import { ReviewService } from '../reviews/service';
import { ProductEventDocument, ProductEventService } from './service';

const userId = '507f1f77bcf86cd799439011';
const ownerId = `user_${userId}`;
const articleId = new mongoose.Types.ObjectId();
const lessonId = new mongoose.Types.ObjectId();
const itemId = new mongoose.Types.ObjectId();

const readyLesson = () => ({
  _id: lessonId, ownerId, articleId, levelAtGeneration: 'advanced', status: 'ready', contentDensity: 'normal',
  summary: 'Summary.', difficulty: 'advanced', learningFocus: 'Nuance.',
  items: [{ _id: itemId, type: 'word', term: 'precise', meaningEn: 'exact', meaningZh: '精确', contextSentence: 'A precise result.', explanation: 'Exact in context.', exampleSentence: 'Use precise language.' }],
  generationMeta: { model: 'test-model', promptVersion: 'v3', durationMs: 1200, articleWordCount: 500, truncated: false },
  createdAt: new Date(), updatedAt: new Date(),
} as unknown as ILesson);

const appFor = (router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.requestId = 'request-id'; req.identity = { type: 'user', id: userId, ownerId }; next(); });
  app.use(router);
  return app;
};

describe('ProductEvent route hooks', () => {
  let documents: ProductEventDocument[];
  let events: ProductEventService;

  beforeEach(() => {
    documents = [];
    events = new ProductEventService(async (document) => { documents.push(document); });
  });

  it('records article extraction without article content', async () => {
    const article = { _id: articleId, ownerId, originalUrl: 'https://example.com', canonicalUrl: 'https://example.com', title: 'Title', source: 'Example', language: 'en', content: 'private article content', excerpt: 'Excerpt', wordCount: 400, status: 'extracted', createdAt: new Date(), updatedAt: new Date() } as IArticle;
    const response = await request(appFor(createArticleRouter(jest.fn().mockResolvedValue(article), events))).post('/extract').send({ url: 'https://example.com' });
    expect(response.status).toBe(201);
    expect(documents[0]).toMatchObject({ eventName: 'article_extracted', articleId: articleId.toString() });
    expect(documents[0].metadata).toBeUndefined();
  });

  it('records created/opened lessons and saved terms with dedupe metadata', async () => {
    const lesson = readyLesson();
    const interactions = {
      list: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), ownerId, articleId, lessonId, lessonItemId: itemId, term: 'precise', knowledgeStatus: 'unknown', saved: true, createdAt: new Date(), updatedAt: new Date() }),
    } as unknown as LessonInteractionService;
    const lessons = { create: jest.fn().mockResolvedValue(lesson), getOwned: jest.fn().mockResolvedValue(lesson) } as unknown as LessonService;
    const app = appFor(createLessonRouter(lessons, interactions, events));
    await request(app).post('/').send({ articleId: articleId.toString(), level: 'advanced' });
    await request(app).get(`/${lessonId}`);
    await request(app).put(`/${lessonId}/items/${itemId}/interaction`).send({ saved: true });
    expect(documents.map((event) => event.eventName)).toEqual(['lesson_created', 'lesson_opened', 'term_saved']);
    expect(documents[0].metadata).toMatchObject({ contentDensity: 'normal', itemCount: 1, level: 'advanced', promptVersion: 'v3' });
    expect(documents[0].dedupeKey).toContain('lesson_created');
    expect(documents[2].metadata).toBeUndefined();
  });

  it('records quiz start and completion exactly at successful backend mutations', async () => {
    const active = new LessonQuiz({ _id: new mongoose.Types.ObjectId(), ownerId, lessonId, status: 'active', questionCount: 1, correctCount: 0, totalCount: 0, startedAt: new Date(), questions: [] });
    const completed = new LessonQuiz({ ...active.toObject(), status: 'completed', totalCount: 1, correctCount: 1, completedAt: new Date() });
    const service = { createOrResume: jest.fn().mockResolvedValue(active), answer: jest.fn().mockResolvedValue(completed) } as unknown as LessonQuizService;
    const app = appFor(createLessonQuizRouter(service, events));
    await request(app).post('/').send({ lessonId: lessonId.toString() });
    await request(app).put(`/${active._id}/questions/${new mongoose.Types.ObjectId()}/answer`).send({ answer: 'precise' });
    expect(documents.map((event) => event.eventName)).toEqual(['quiz_started', 'quiz_completed']);
    expect(documents.every((event) => Boolean(event.dedupeKey))).toBe(true);
  });

  it('records daily vocabulary and review lifecycle events', async () => {
    const vocabulary = { list: jest.fn().mockResolvedValue([]) } as unknown as VocabularyService;
    await request(appFor(createVocabularyRouter(vocabulary, events))).get('/?filter=all');
    const review = { due: jest.fn().mockResolvedValue([]), rate: jest.fn().mockResolvedValue({ normalizedTerm: 'precise' }) } as unknown as ReviewService;
    const reviewApp = appFor(createReviewRouter(review, events));
    await request(reviewApp).get('/due');
    await request(reviewApp).put('/precise').send({ rating: 'remembered' });
    expect(documents.map((event) => event.eventName)).toEqual(['vocabulary_opened', 'review_started', 'review_completed']);
    expect(documents.every((event) => Boolean(event.dedupeKey))).toBe(true);
  });
});
