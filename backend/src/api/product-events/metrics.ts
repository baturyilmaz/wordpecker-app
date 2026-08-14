import { ProductEventMetadata, ProductEventName } from './model';

export interface MetricEvent {
  ownerId: string;
  userId?: { toString(): string } | string;
  eventName: ProductEventName;
  metadata?: ProductEventMetadata;
  createdAt: Date;
}

export const calculateBetaMetrics = (events: MetricEvent[]) => {
  const byOwner = new Map<string, MetricEvent[]>();
  events.forEach((event) => {
    const ownerEvents = byOwner.get(event.ownerId) || [];
    ownerEvents.push(event);
    byOwner.set(event.ownerId, ownerEvents);
  });
  const count = (eventName: ProductEventName) => events.filter((event) => event.eventName === eventName).length;
  const activationOwners = new Set(events.filter((event) => event.eventName === 'lesson_created').map((event) => event.ownerId));
  const secondLessonOwners = [...byOwner.values()].filter((ownerEvents) => ownerEvents.filter((event) => event.eventName === 'lesson_created').length >= 2).length;
  const reviewReturnOwners = [...byOwner.values()].filter((ownerEvents) => {
    const firstLesson = ownerEvents
      .filter((event) => event.eventName === 'lesson_created')
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0];
    if (!firstLesson) return false;
    const firstLessonDay = firstLesson.createdAt.toISOString().slice(0, 10);
    return ownerEvents.some((event) => event.eventName === 'review_started' && event.createdAt.toISOString().slice(0, 10) > firstLessonDay);
  }).length;

  return {
    uniqueUsers: new Set(events.flatMap((event) => event.userId ? [event.userId.toString()] : [])).size,
    activationOwners: activationOwners.size,
    lessonsCreated: count('lesson_created'),
    lessonCompletionProxy: count('quiz_started'),
    quizzesStarted: count('quiz_started'),
    quizzesCompleted: count('quiz_completed'),
    termsSaved: count('term_saved'),
    secondLessonOwners,
    reviewReturnOwners,
    lowDensityLessons: events.filter((event) => event.eventName === 'lesson_created' && event.metadata?.contentDensity === 'low').length,
  };
};
