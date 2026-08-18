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

    const reviewDays = new Set(ownerEvents
      .filter((event) => event.eventName === 'review_started')
      .map((event) => event.createdAt.toISOString().slice(0, 10)));
    if (reviewDays.size) reviewStarterOwners.add(ownerId);
    if (reviewDays.size >= 2) reviewReturnOwners.add(ownerId);
  });

  const activatedInFunnel = new Set([...eligibleActivatedOwners]);
  const engagedInFunnel = [...engagedOwners].filter((ownerId) => activatedInFunnel.has(ownerId)).length;
  const secondInFunnel = [...secondLessonOwners].filter((ownerId) => activatedInFunnel.has(ownerId)).length;

  return {
    uniqueOwners: byOwner.size,
    uniqueUsers: new Set(events.flatMap((event) => event.userId ? [event.userId.toString()] : [])).size,
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
