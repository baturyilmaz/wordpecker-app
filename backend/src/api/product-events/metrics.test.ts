/* eslint-env jest */
import { calculateBetaMetrics, calculateLessonQualityMetrics, MetricEvent, parseBetaWindowStart } from './metrics';

const at = (day: number, hour = 10) => new Date(`2026-08-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`);

describe('calculateBetaMetrics', () => {
  it('computes the six canonical Beta ratios from distinct owners and resources', () => {
    const events: MetricEvent[] = [
      { ownerId: 'user_1', userId: '1', eventName: 'article_extracted', articleId: 'article_1', createdAt: at(1) },
      { ownerId: 'user_1', userId: '1', eventName: 'lesson_created', articleId: 'article_1', lessonId: 'lesson_1', metadata: { contentDensity: 'normal' }, createdAt: at(1, 11) },
      { ownerId: 'user_1', userId: '1', eventName: 'quiz_started', lessonId: 'lesson_1', quizId: 'quiz_1', createdAt: at(1, 12) },
      { ownerId: 'user_1', userId: '1', eventName: 'term_saved', lessonId: 'lesson_1', lessonItemId: 'item_1', createdAt: at(1, 13) },
      { ownerId: 'user_1', userId: '1', eventName: 'lesson_created', articleId: 'article_2', lessonId: 'lesson_2', metadata: { contentDensity: 'low' }, createdAt: at(2) },
      { ownerId: 'user_1', userId: '1', eventName: 'review_started', createdAt: at(3) },
      { ownerId: 'user_1', userId: '1', eventName: 'review_started', createdAt: at(4) },
      { ownerId: 'guest_2', eventName: 'article_extracted', articleId: 'article_3', createdAt: at(3) },
    ];

    expect(calculateBetaMetrics(events)).toEqual({
      uniqueOwners: 2,
      uniqueUsers: 1,
      uniqueActivatedUsers: 1,
      lessonCreators: 1,
      secondLessonUsers: 1,
      quizStarters: 1,
      termSavers: 1,
      reviewReturnUsers: 1,
      activation: { numerator: 1, denominator: 2, rate: 0.5 },
      lessonEngagementProxy: { numerator: 1, denominator: 1, rate: 1 },
      quizStart: { count: 1, owners: 1 },
      vocabularySave: { count: 1, owners: 1 },
      secondLesson: { numerator: 1, denominator: 1, rate: 1 },
      reviewReturn: { numerator: 1, denominator: 1, rate: 1 },
      eventCounts: {
        article_extracted: 2,
        lesson_created: 2,
        quiz_started: 1,
        review_started: 2,
        term_saved: 1,
      },
      lowDensityLessons: 1,
    });
  });

  it('does not inflate engagement, second lesson, or review return from opens, retries, or one-day review activity', () => {
    const events: MetricEvent[] = [
      { ownerId: 'guest_1', eventName: 'article_extracted', articleId: 'article_1', createdAt: at(1) },
      { ownerId: 'guest_1', eventName: 'lesson_created', lessonId: 'lesson_1', createdAt: at(1, 11) },
      { ownerId: 'guest_1', eventName: 'lesson_created', lessonId: 'lesson_1', createdAt: at(1, 12) },
      { ownerId: 'guest_1', eventName: 'lesson_opened', lessonId: 'lesson_1', createdAt: at(1, 13) },
      { ownerId: 'guest_1', eventName: 'lesson_opened', lessonId: 'lesson_1', createdAt: at(2, 13) },
      { ownerId: 'guest_1', eventName: 'review_started', createdAt: at(1, 14) },
      { ownerId: 'guest_1', eventName: 'review_started', createdAt: at(1, 18) },
    ];
    const result = calculateBetaMetrics(events);
    expect(result.lessonEngagementProxy.numerator).toBe(0);
    expect(result.secondLesson.numerator).toBe(0);
    expect(result.reviewReturn).toEqual({ numerator: 0, denominator: 1, rate: 0 });
  });

  it('requires quiz engagement to reference a lesson created by the same owner', () => {
    const events: MetricEvent[] = [
      { ownerId: 'user_1', eventName: 'article_extracted', articleId: 'article_1', createdAt: at(1) },
      { ownerId: 'user_1', eventName: 'lesson_created', lessonId: 'lesson_1', createdAt: at(1) },
      { ownerId: 'user_1', eventName: 'quiz_started', lessonId: 'other_lesson', createdAt: at(1) },
    ];
    expect(calculateBetaMetrics(events).lessonEngagementProxy.numerator).toBe(0);
  });

  it('requires Review Return to happen on a UTC date after the first Lesson', () => {
    const events: MetricEvent[] = [
      { ownerId: 'user_1', eventName: 'lesson_created', lessonId: 'lesson_1', createdAt: at(2, 10) },
      { ownerId: 'user_1', eventName: 'review_started', createdAt: at(2, 18) },
    ];
    expect(calculateBetaMetrics(events).reviewReturnUsers).toBe(0);
    events.push({ ownerId: 'user_1', eventName: 'review_started', createdAt: at(3, 8) });
    expect(calculateBetaMetrics(events).reviewReturnUsers).toBe(1);
  });

  it('separates normal and low-density Lesson quality aggregates', () => {
    expect(calculateLessonQualityMetrics([
      { status: 'ready', contentDensity: 'normal', itemCount: 10, durationMs: 1200 },
      { status: 'ready', contentDensity: 'low', itemCount: 6, durationMs: 800 },
      { status: 'failed', itemCount: 0 },
    ])).toEqual({
      lessonGenerationCount: 3,
      normalLessonCount: 1,
      lowDensityLessonCount: 1,
      averageItemCount: 8,
      averageGenerationDurationMs: 1000,
      lessonGenerationFailures: 1,
    });
  });

  it('parses bounded Beta metric windows', () => {
    expect(parseBetaWindowStart(['--days', '7'], Date.parse('2026-08-19T00:00:00Z'))?.toISOString())
      .toBe('2026-08-12T00:00:00.000Z');
    expect(parseBetaWindowStart(['--since', '2026-08-01'])?.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(() => parseBetaWindowStart(['--days', '0'])).toThrow('--days must be a positive integer.');
    expect(() => parseBetaWindowStart(['--days', '7', '--since', '2026-08-01'])).toThrow('Use either');
  });
});
