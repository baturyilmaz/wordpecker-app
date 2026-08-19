import { ProductEventMetadata, ProductEventName } from './model';

export interface MetricEvent {
  ownerId: string;
  userId?: { toString(): string } | string;
  eventName: ProductEventName;
  articleId?: { toString(): string } | string;
  lessonId?: { toString(): string } | string;
  lessonItemId?: { toString(): string } | string;
  quizId?: { toString(): string } | string;
  dedupeKey?: string;
  metadata?: ProductEventMetadata;
  createdAt: Date;
}

export interface MetricRatio {
  numerator: number;
  denominator: number;
  rate: number | null;
}

export interface LessonQualityRecord {
  status: 'generating' | 'ready' | 'failed';
  contentDensity?: 'low' | 'normal';
  itemCount: number;
  durationMs?: number;
}

export const parseBetaWindowStart = (args: string[], now = Date.now()): Date | undefined => {
  const daysIndex = args.indexOf('--days');
  const sinceIndex = args.indexOf('--since');
  if (daysIndex >= 0 && sinceIndex >= 0) throw new Error('Use either --days or --since, not both.');
  if (daysIndex >= 0) {
    const days = Number(args[daysIndex + 1]);
    if (!Number.isInteger(days) || days <= 0) throw new Error('--days must be a positive integer.');
    return new Date(now - days * 24 * 60 * 60 * 1000);
  }
  if (sinceIndex >= 0) {
    const since = new Date(args[sinceIndex + 1]);
    if (Number.isNaN(since.getTime())) throw new Error('--since must be a valid ISO date or timestamp.');
    return since;
  }
  return undefined;
};

const ratio = (numerator: number, denominator: number): MetricRatio => ({
  numerator,
  denominator,
  rate: denominator ? Number((numerator / denominator).toFixed(4)) : null,
});

const resourceId = (value?: { toString(): string } | string): string | null => value ? value.toString() : null;
const dedupeResource = (event: MetricEvent): string | null => {
  if (!event.dedupeKey) return null;
  const marker = `:${event.eventName}:`;
  const index = event.dedupeKey.indexOf(marker);
  return index >= 0 ? event.dedupeKey.slice(index + marker.length) : null;
};

export const calculateBetaMetrics = (events: MetricEvent[]) => {
  const byOwner = new Map<string, MetricEvent[]>();
  events.forEach((event) => {
    const ownerEvents = byOwner.get(event.ownerId) || [];
    ownerEvents.push(event);
    byOwner.set(event.ownerId, ownerEvents);
  });

  const eventCounts = Object.fromEntries(
    [...new Set(events.map((event) => event.eventName))].sort()
      .map((eventName) => [eventName, events.filter((event) => event.eventName === eventName).length]),
  ) as Partial<Record<ProductEventName, number>>;
  const ownerSet = (predicate: (event: MetricEvent) => boolean) => new Set(events.filter(predicate).map((event) => event.ownerId));
  const extractedOwners = ownerSet((event) => event.eventName === 'article_extracted');
  const activatedOwners = ownerSet((event) => event.eventName === 'lesson_created');
  const eligibleActivatedOwners = new Set([...activatedOwners].filter((ownerId) => extractedOwners.has(ownerId)));

  const engagedOwners = new Set<string>();
  const savedOwners = new Set<string>();
  const secondLessonOwners = new Set<string>();
  const reviewStarterOwners = new Set<string>();
  const reviewReturnOwners = new Set<string>();
  const quizResources = new Set<string>();
  const savedItemResources = new Set<string>();

  byOwner.forEach((ownerEvents, ownerId) => {
    const createdLessonIds = new Set(ownerEvents
      .filter((event) => event.eventName === 'lesson_created')
      .flatMap((event) => resourceId(event.lessonId) ? [resourceId(event.lessonId)!] : []));
    if (createdLessonIds.size >= 2) secondLessonOwners.add(ownerId);
    if (ownerEvents.some((event) => event.eventName === 'quiz_started'
      && !!resourceId(event.lessonId)
      && createdLessonIds.has(resourceId(event.lessonId)!))) engagedOwners.add(ownerId);
    if (ownerEvents.some((event) => event.eventName === 'term_saved')) savedOwners.add(ownerId);
    ownerEvents.filter((event) => event.eventName === 'quiz_started').forEach((event) => {
      const id = resourceId(event.quizId) || dedupeResource(event);
      if (id) quizResources.add(`${ownerId}:${id}`);
    });
    ownerEvents.filter((event) => event.eventName === 'term_saved').forEach((event) => {
      const id = resourceId(event.lessonItemId) || dedupeResource(event);
      if (id) savedItemResources.add(`${ownerId}:${id}`);
    });

    const firstLesson = ownerEvents
      .filter((event) => event.eventName === 'lesson_created')
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0];
    const reviewDays = new Set(ownerEvents
      .filter((event) => event.eventName === 'review_started')
      .map((event) => event.createdAt.toISOString().slice(0, 10)));
    if (firstLesson) {
      reviewStarterOwners.add(ownerId);
      const firstLessonDay = firstLesson.createdAt.toISOString().slice(0, 10);
      if ([...reviewDays].some((day) => day > firstLessonDay)) reviewReturnOwners.add(ownerId);
    }
  });

  const activatedInFunnel = new Set([...eligibleActivatedOwners]);
  const engagedInFunnel = [...engagedOwners].filter((ownerId) => activatedInFunnel.has(ownerId)).length;
  const secondInFunnel = [...secondLessonOwners].filter((ownerId) => activatedInFunnel.has(ownerId)).length;

  return {
    uniqueOwners: byOwner.size,
    uniqueUsers: new Set(events.flatMap((event) => event.userId ? [event.userId.toString()] : [])).size,
    uniqueActivatedUsers: new Set(events.flatMap((event) => (
      event.eventName === 'lesson_created' && event.userId ? [event.userId.toString()] : []
    ))).size,
    lessonCreators: activatedOwners.size,
    secondLessonUsers: secondLessonOwners.size,
    quizStarters: engagedOwners.size,
    termSavers: savedOwners.size,
    reviewReturnUsers: reviewReturnOwners.size,
    activation: ratio(eligibleActivatedOwners.size, extractedOwners.size),
    lessonEngagementProxy: ratio(engagedInFunnel, activatedInFunnel.size),
    quizStart: { count: quizResources.size, owners: engagedOwners.size },
    vocabularySave: { count: savedItemResources.size, owners: savedOwners.size },
    secondLesson: ratio(secondInFunnel, activatedInFunnel.size),
    reviewReturn: ratio(reviewReturnOwners.size, reviewStarterOwners.size),
    eventCounts,
    lowDensityLessons: events.filter((event) => event.eventName === 'lesson_created'
      && event.metadata?.contentDensity === 'low').length,
  };
};

export const calculateLessonQualityMetrics = (lessons: LessonQualityRecord[]) => {
  const ready = lessons.filter((lesson) => lesson.status === 'ready');
  const durations = ready.flatMap((lesson) => typeof lesson.durationMs === 'number' ? [lesson.durationMs] : []);
  const average = (values: number[]) => values.length
    ? Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2))
    : null;

  return {
    lessonGenerationCount: lessons.length,
    normalLessonCount: ready.filter((lesson) => lesson.itemCount >= 8 && lesson.itemCount <= 15).length,
    lowDensityLessonCount: ready.filter((lesson) => lesson.itemCount >= 5 && lesson.itemCount <= 7).length,
    averageItemCount: average(ready.map((lesson) => lesson.itemCount)),
    averageGenerationDurationMs: average(durations),
    lessonGenerationFailures: lessons.filter((lesson) => lesson.status === 'failed').length,
  };
};
