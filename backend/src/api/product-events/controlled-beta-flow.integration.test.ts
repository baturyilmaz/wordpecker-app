/* eslint-env jest */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { Article, IArticle } from '../articles/model';
import { createArticleRouter } from '../articles/routes';
import { GuestMigrationService } from '../auth/migration-service';
import { createLessonQuizRouter } from '../lesson-quizzes/routes';
import { LessonQuizService } from '../lesson-quizzes/service';
import { LessonInteractionService } from '../lessons/interaction-service';
import { Lesson } from '../lessons/model';
import { createLessonRouter } from '../lessons/routes';
import { LessonService } from '../lessons/service';
import { createReviewRouter } from '../reviews/routes';
import { ReviewService } from '../reviews/service';
import { createVocabularyRouter } from '../vocabulary/routes';
import { VocabularyService } from '../vocabulary/service';
import { RequestIdentity } from '../../utils/owner';
import { calculateBetaMetrics } from './metrics';
import { ProductEvent } from './model';
import { ProductEventService } from './service';

const guestId = 'guest_43a2b3c4-d5e6-4789-8123-abcdef123456';
const userId = new mongoose.Types.ObjectId();
const guestIdentity: RequestIdentity = { type: 'guest', id: guestId, ownerId: guestId };
const userIdentity: RequestIdentity = { type: 'user', id: userId.toString(), ownerId: `user_${userId}` };

const integrationUrl = () => {
  const configured = process.env.MONGODB_URL;
  if (!configured) throw new Error('MONGODB_URL is required for controlled Beta metric coverage.');
  return configured.replace(/\/[^/?]+(\?|$)/, '/wordpecker_phase43_metrics_test$1');
};

const itemTerms = ['signal', 'context', 'credible', 'distinct', 'return'];

describe('controlled URL → Lesson → Quiz → migration → Vocabulary → Review metrics flow', () => {
  beforeAll(async () => {
    await mongoose.connect(integrationUrl(), { serverSelectionTimeoutMS: 5000 });
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    await ProductEvent.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('produces exact canonical metrics without retry or migration inflation', async () => {
    let metricClock = new Date('2026-08-20T08:00:00.000Z');
    const events = new ProductEventService(undefined, () => metricClock);
    const vocabulary = new VocabularyService();
    const lessons = new LessonService(async (article, level) => ({
      output: {
        summary: `A controlled lesson for ${article.title}.`,
        difficulty: level,
        learningFocus: 'Public Beta verification.',
        items: itemTerms.map((term, index) => ({
          type: 'word' as const,
          term: `${term} ${article.title.slice(-1)}`,
          meaningEn: `Controlled English meaning ${index + 1}.`,
          meaningZh: `测试释义 ${index + 1}`,
          contextSentence: `${term} ${article.title.slice(-1)} appears in this controlled article.`,
          explanation: `This explains ${term} in learner-friendly English.`,
          exampleSentence: `Readers use ${term} ${article.title.slice(-1)} in a different example.`,
          importanceReason: null,
          difficulty: level,
        })),
      },
      durationMs: 25,
      truncated: false,
      initialRawCount: 5,
      finalValidCount: 5,
      refillCount: 0,
      attempts: [],
    }));
    const interactions = new LessonInteractionService(lessons, vocabulary);
    const quizzes = new LessonQuizService();
    const reviews = new ReviewService(vocabulary);
    const clockedReviews = {
      due: (ownerId: string) => reviews.due(ownerId, metricClock),
      rate: (ownerId: string, term: string, input: unknown) => reviews.rate(ownerId, term, input, metricClock),
    } as ReviewService;
    const extract = async (url: string, ownerId: string): Promise<IArticle> => {
      const existing = await Article.findOne({ ownerId, canonicalUrl: url });
      if (existing) return existing;
      const suffix = url.endsWith('/second') ? 'B' : 'A';
      return Article.create({
        ownerId,
        originalUrl: url,
        canonicalUrl: url,
        title: `Controlled article ${suffix}`,
        source: 'Example',
        content: itemTerms.map((term) => `${term} ${suffix} appears in this controlled article.`).join(' '),
        wordCount: 150,
        language: 'en',
        status: 'extracted',
      });
    };
    const buildApp = (identity: RequestIdentity) => {
      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => { req.requestId = 'phase43-controlled'; req.identity = identity; next(); });
      app.use('/articles', createArticleRouter(extract, events));
      app.use('/lessons', createLessonRouter(lessons, interactions, events));
      app.use('/quizzes', createLessonQuizRouter(quizzes, events));
      app.use('/vocabulary', createVocabularyRouter(vocabulary, events));
      app.use('/reviews', createReviewRouter(clockedReviews, events));
      return app;
    };

    const guestApp = buildApp(guestIdentity);
    const firstArticle = await request(guestApp).post('/articles/extract').send({ url: 'https://example.com/first' });
    expect(firstArticle.status).toBe(201);
    expect((await request(guestApp).post('/articles/extract').send({ url: 'https://example.com/first' })).status).toBe(201);
    const firstLesson = await request(guestApp).post('/lessons').send({ articleId: firstArticle.body.id, level: 'intermediate' });
    expect(firstLesson.status).toBe(201);
    expect((await request(guestApp).post('/lessons').send({ articleId: firstArticle.body.id, level: 'intermediate' })).body.id).toBe(firstLesson.body.id);
    await request(guestApp).get(`/lessons/${firstLesson.body.id}`).expect(200);
    await request(guestApp).get(`/lessons/${firstLesson.body.id}`).expect(200);

    const firstItem = firstLesson.body.items[0];
    await request(guestApp)
      .put(`/lessons/${firstLesson.body.id}/items/${firstItem.id}/interaction`)
      .send({ knowledgeStatus: 'unknown' })
      .expect(200);

    const quiz = await request(guestApp).post('/quizzes').send({ lessonId: firstLesson.body.id });
    expect(quiz.status).toBe(201);
    expect((await request(guestApp).post('/quizzes').send({ lessonId: firstLesson.body.id })).body.id).toBe(quiz.body.id);
    for (const question of quiz.body.questions) {
      await request(guestApp)
        .put(`/quizzes/${quiz.body.id}/questions/${question.id}/answer`)
        .send({ answer: 'controlled answer' })
        .expect(200);
    }

    const secondArticle = await request(guestApp).post('/articles/extract').send({ url: 'https://example.com/second' });
    const secondLesson = await request(guestApp).post('/lessons').send({ articleId: secondArticle.body.id, level: 'intermediate' });
    expect(secondLesson.status).toBe(201);
    expect(secondLesson.body.id).not.toBe(firstLesson.body.id);

    const migration = new GuestMigrationService();
    const migrationCounts = await migration.migrate(guestId, userId.toString());
    expect(migrationCounts).toMatchObject({ articles: 2, lessons: 2, interactions: 1, quizzes: 1 });
    await expect(migration.migrate(guestId, userId.toString())).resolves.toEqual(migrationCounts);

    const userApp = buildApp(userIdentity);
    await request(userApp)
      .put(`/lessons/${firstLesson.body.id}/items/${firstItem.id}/interaction`)
      .send({ saved: true })
      .expect(200);
    const vocabularyResponse = await request(userApp).get('/vocabulary?filter=all');
    expect(vocabularyResponse.status).toBe(200);
    expect(vocabularyResponse.body.items).toHaveLength(1);

    const firstReview = await request(userApp).get('/reviews/due');
    expect(firstReview.status).toBe(200);
    expect(firstReview.body.items).toHaveLength(1);
    await request(userApp)
      .put(`/reviews/${encodeURIComponent(firstReview.body.items[0].normalizedTerm)}`)
      .send({ rating: 'remembered' })
      .expect(200);
    metricClock = new Date('2026-08-24T08:00:00.000Z');
    expect((await request(userApp).get('/reviews/due')).body.items).toHaveLength(1);

    const stored = await ProductEvent.find({}).sort({ createdAt: 1 }).lean();
    expect(stored).toHaveLength(13);
    expect(new Set(stored.map((event) => event.ownerId))).toEqual(new Set([userIdentity.ownerId]));
    expect(stored.every((event) => event.userId?.toString() === userId.toString() && !event.guestId)).toBe(true);
    expect(stored.filter((event) => event.eventName === 'lesson_created')).toHaveLength(2);
    expect(new Set(stored.filter((event) => event.eventName === 'lesson_created').map((event) => event.lessonId?.toString())).size).toBe(2);
    const dedupeKeys = stored.flatMap((event) => event.dedupeKey ? [event.dedupeKey] : []);
    expect(new Set(dedupeKeys).size).toBe(dedupeKeys.length);
    expect(JSON.stringify(stored)).not.toMatch(/controlled article content|authorization|cookie|token|api[_-]?key/i);

    expect(calculateBetaMetrics(stored)).toMatchObject({
      uniqueOwners: 1,
      uniqueUsers: 1,
      activation: { numerator: 1, denominator: 1, rate: 1 },
      lessonEngagementProxy: { numerator: 1, denominator: 1, rate: 1 },
      quizStart: { count: 1, owners: 1 },
      vocabularySave: { count: 1, owners: 1 },
      secondLesson: { numerator: 1, denominator: 1, rate: 1 },
      reviewReturn: { numerator: 1, denominator: 1, rate: 1 },
      eventCounts: {
        article_extracted: 2,
        lesson_created: 2,
        lesson_opened: 2,
        quiz_started: 1,
        quiz_completed: 1,
        term_saved: 1,
        vocabulary_opened: 1,
        review_started: 2,
        review_completed: 1,
      },
    });
  });

  it('collapses guest events onto an existing user resource instead of manufacturing a second lesson', async () => {
    const articleData = {
      originalUrl: 'https://example.com/shared',
      canonicalUrl: 'https://example.com/shared',
      title: 'Shared article',
      source: 'Example',
      content: 'A shared controlled article body.',
      wordCount: 150,
      language: 'en',
      status: 'extracted' as const,
    };
    const [guestArticle, userArticle] = await Article.create([
      { ...articleData, ownerId: guestId },
      { ...articleData, ownerId: userIdentity.ownerId },
    ]);
    const lessonData = (ownerId: string, articleId: mongoose.Types.ObjectId) => ({
      ownerId,
      articleId,
      levelAtGeneration: 'intermediate' as const,
      status: 'ready' as const,
      summary: 'Shared lesson.',
      difficulty: 'intermediate' as const,
      learningFocus: 'Migration dedupe.',
      contentDensity: 'low' as const,
      items: itemTerms.map((term, index) => ({
        type: 'word' as const,
        term,
        meaningEn: `Meaning ${index}`,
        meaningZh: `释义 ${index}`,
        contextSentence: `${term} appears here.`,
        explanation: `${term} explained.`,
        exampleSentence: `Use ${term} naturally.`,
        difficulty: 'intermediate' as const,
      })),
      generationMeta: { promptVersion: 'v3', articleWordCount: 150, truncated: false },
    });
    const [guestLesson, userLesson] = await Lesson.create([
      lessonData(guestId, guestArticle._id),
      lessonData(userIdentity.ownerId, userArticle._id),
    ]);
    const createdAt = new Date('2026-08-20T08:00:00.000Z');
    await ProductEvent.create([
      {
        ownerId: userIdentity.ownerId,
        userId,
        eventName: 'article_extracted',
        articleId: userArticle._id,
        dedupeKey: `${userIdentity.ownerId}:article_extracted:${userArticle._id}`,
        createdAt,
      },
      {
        ownerId: userIdentity.ownerId,
        userId,
        eventName: 'lesson_created',
        articleId: userArticle._id,
        lessonId: userLesson._id,
        dedupeKey: `${userIdentity.ownerId}:lesson_created:${userLesson._id}`,
        createdAt,
      },
      {
        ownerId: guestId,
        guestId,
        eventName: 'article_extracted',
        articleId: guestArticle._id,
        dedupeKey: `${guestId}:article_extracted:${guestArticle._id}`,
        createdAt,
      },
      {
        ownerId: guestId,
        guestId,
        eventName: 'lesson_created',
        articleId: guestArticle._id,
        lessonId: guestLesson._id,
        dedupeKey: `${guestId}:lesson_created:${guestLesson._id}`,
        createdAt,
      },
    ]);

    await new GuestMigrationService().migrate(guestId, userId.toString());
    const events = await ProductEvent.find({ ownerId: userIdentity.ownerId }).lean();
    expect(events.filter((event) => event.eventName === 'article_extracted')).toHaveLength(1);
    expect(events.filter((event) => event.eventName === 'lesson_created')).toHaveLength(1);
    expect(events.find((event) => event.eventName === 'lesson_created')?.lessonId?.toString()).toBe(userLesson._id.toString());
    expect(calculateBetaMetrics(events).secondLesson).toEqual({ numerator: 0, denominator: 1, rate: 0 });
  });
});
