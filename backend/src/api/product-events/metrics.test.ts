/* eslint-env jest */
import { calculateBetaMetrics, MetricEvent } from './metrics';

describe('calculateBetaMetrics', () => {
  it('computes the six Beta signals without email or content data', () => {
    const events: MetricEvent[] = [
      { ownerId: 'user_1', userId: '1', eventName: 'lesson_created', metadata: { contentDensity: 'normal' }, createdAt: new Date('2026-08-01T10:00:00Z') },
      { ownerId: 'user_1', userId: '1', eventName: 'quiz_started', createdAt: new Date('2026-08-01T10:05:00Z') },
      { ownerId: 'user_1', userId: '1', eventName: 'quiz_completed', createdAt: new Date('2026-08-01T10:10:00Z') },
      { ownerId: 'user_1', userId: '1', eventName: 'term_saved', createdAt: new Date('2026-08-01T10:11:00Z') },
      { ownerId: 'user_1', userId: '1', eventName: 'lesson_created', metadata: { contentDensity: 'low' }, createdAt: new Date('2026-08-02T10:00:00Z') },
      { ownerId: 'user_1', userId: '1', eventName: 'review_started', createdAt: new Date('2026-08-03T10:00:00Z') },
      { ownerId: 'guest_2', eventName: 'lesson_created', metadata: { contentDensity: 'normal' }, createdAt: new Date('2026-08-03T11:00:00Z') },
    ];
    expect(calculateBetaMetrics(events)).toEqual({
      uniqueUsers: 1,
      activationOwners: 2,
      lessonsCreated: 3,
      lessonCompletionProxy: 1,
      quizzesStarted: 1,
      quizzesCompleted: 1,
      termsSaved: 1,
      secondLessonOwners: 1,
      reviewReturnOwners: 1,
      lowDensityLessons: 1,
    });
  });
});
