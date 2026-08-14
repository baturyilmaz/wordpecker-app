/* eslint-env jest */
import mongoose from 'mongoose';
import { GuestMigrationService } from './migration-service';
import { GuestMigration } from './migration-model';
import { Article } from '../articles/model';
import { Lesson } from '../lessons/model';
import { LessonInteraction } from '../lessons/interaction-model';
import { LessonQuiz } from '../lesson-quizzes/model';
import { ReviewState } from '../reviews/model';
import { ProductEvent } from '../product-events/model';

describe('GuestMigrationService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('moves every Langsift owner domain and is idempotent when repeated', async () => {
    const guestId = 'guest_12345678-abcd-4000-8000-123456789abc';
    const userId = new mongoose.Types.ObjectId().toString();
    const articleId = new mongoose.Types.ObjectId();
    const lessonId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const article = { _id: articleId, ownerId: guestId, canonicalUrl: 'https://example.com/a', status: 'extracted', save: jest.fn() };
    const lesson = { _id: lessonId, ownerId: guestId, articleId, levelAtGeneration: 'intermediate', items: [{ _id: itemId, term: 'useful' }], save: jest.fn() };
    const interaction = { ownerId: guestId, lessonId, articleId, lessonItemId: itemId, saved: true, knowledgeStatus: 'unknown', save: jest.fn() };
    const quiz = { _id: new mongoose.Types.ObjectId(), ownerId: guestId, lessonId, status: 'completed', totalCount: 1, questions: [{ lessonId, lessonItemId: itemId }], save: jest.fn() };
    const review = { ownerId: guestId, normalizedTerm: 'useful', reviewCount: 1, rememberedCount: 0, unsureCount: 0, forgotCount: 1, nextReviewAt: new Date(), save: jest.fn() };
    const productEvent = { ownerId: guestId, guestId, eventName: 'lesson_created', lessonId, dedupeKey: `${guestId}:lesson_created:${lessonId}`, save: jest.fn() };
    const counts = { articles: 1, lessons: 1, interactions: 1, quizzes: 1, reviews: 1, events: 1 };
    jest.spyOn(mongoose, 'startSession').mockResolvedValue({
      withTransaction: async (callback: () => Promise<void>) => callback(),
      endSession: jest.fn(),
    } as never);
    jest.spyOn(GuestMigration, 'findOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: 'completed', counts } as never);
    jest.spyOn(GuestMigration, 'findOneAndUpdate').mockResolvedValue({} as never);
    jest.spyOn(Article, 'find').mockResolvedValue([article] as never);
    jest.spyOn(Article, 'findOne').mockResolvedValue(null);
    jest.spyOn(Article, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as never);
    jest.spyOn(Lesson, 'find').mockResolvedValue([lesson] as never);
    jest.spyOn(Lesson, 'findOne').mockResolvedValue(null);
    jest.spyOn(Lesson, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as never);
    jest.spyOn(LessonInteraction, 'find').mockResolvedValue([interaction] as never);
    jest.spyOn(LessonInteraction, 'findOne').mockResolvedValue(null);
    jest.spyOn(LessonQuiz, 'find').mockResolvedValue([quiz] as never);
    jest.spyOn(ReviewState, 'find').mockResolvedValue([review] as never);
    jest.spyOn(ReviewState, 'findOne').mockResolvedValue(null);
    jest.spyOn(ProductEvent, 'find').mockResolvedValue([productEvent] as never);
    jest.spyOn(ProductEvent, 'findOne').mockResolvedValue(null);

    const service = new GuestMigrationService();
    await expect(service.migrate(guestId, userId)).resolves.toEqual(counts);
    expect(article.ownerId).toBe(`user_${userId}`);
    expect(lesson.ownerId).toBe(`user_${userId}`);
    expect(interaction.ownerId).toBe(`user_${userId}`);
    expect(quiz.ownerId).toBe(`user_${userId}`);
    expect(review.ownerId).toBe(`user_${userId}`);
    expect(productEvent.ownerId).toBe(`user_${userId}`);
    expect(productEvent.guestId).toBeUndefined();
    expect(productEvent.dedupeKey).toBe(`user_${userId}:lesson_created:${lessonId}`);
    await expect(service.migrate(guestId, userId)).resolves.toEqual(counts);
    expect(Article.find).toHaveBeenCalledTimes(1);
    expect(Lesson.find).toHaveBeenCalledTimes(1);
    expect(LessonInteraction.find).toHaveBeenCalledTimes(1);
    expect(LessonQuiz.find).toHaveBeenCalledTimes(1);
    expect(ReviewState.find).toHaveBeenCalledTimes(1);
    expect(ProductEvent.find).toHaveBeenCalledTimes(1);
  });
});
