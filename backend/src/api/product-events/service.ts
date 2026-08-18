import { RequestIdentity } from '../../utils/owner';
import { ProductEvent, ProductEventMetadata, ProductEventName } from './model';

export interface RecordProductEventInput {
  identity: RequestIdentity;
  eventName: ProductEventName;
  articleId?: string;
  lessonId?: string;
  lessonItemId?: string;
  quizId?: string;
  metadata?: ProductEventMetadata;
  dedupeKey?: string;
  requestId?: string;
}

export interface ProductEventDocument {
  ownerId: string;
  userId?: string;
  guestId?: string;
  eventName: ProductEventName;
  articleId?: string;
  lessonId?: string;
  lessonItemId?: string;
  quizId?: string;
  metadata?: ProductEventMetadata;
  dedupeKey?: string;
  createdAt: Date;
}

export type ProductEventWriter = (document: ProductEventDocument) => Promise<void>;

const mongooseWriter: ProductEventWriter = async (document) => {
  if (document.dedupeKey) {
    await ProductEvent.updateOne(
      { dedupeKey: document.dedupeKey },
      { $setOnInsert: document },
      { upsert: true },
    );
    return;
  }
  await ProductEvent.create(document);
};

const metadataKeys: Partial<Record<ProductEventName, readonly string[]>> = {
  lesson_created: ['contentDensity', 'itemCount', 'level', 'model', 'promptVersion', 'durationMs'],
  quiz_started: ['questionCount'],
  quiz_completed: ['questionCount', 'correctCount'],
  vocabulary_opened: ['itemCount'],
  review_started: ['dueCount'],
};

const safeMetadata = (eventName: ProductEventName, metadata?: ProductEventMetadata): ProductEventMetadata | undefined => {
  if (!metadata) return undefined;
  const allowed = metadataKeys[eventName] || [];
  const entries = Object.entries(metadata).filter(([key]) => allowed.includes(key));
  return entries.length ? Object.fromEntries(entries) : undefined;
};

export class ProductEventService {
  constructor(
    private readonly writer: ProductEventWriter = mongooseWriter,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  utcDay(): string {
    return utcDay(this.clock());
  }

  async record(input: RecordProductEventInput): Promise<void> {
    const document: ProductEventDocument = {
      ownerId: input.identity.ownerId,
      userId: input.identity.type === 'user' ? input.identity.id : undefined,
      guestId: input.identity.type === 'guest' ? input.identity.id : undefined,
      eventName: input.eventName,
      articleId: input.articleId,
      lessonId: input.lessonId,
      lessonItemId: input.lessonItemId,
      quizId: input.quizId,
      metadata: safeMetadata(input.eventName, input.metadata),
      dedupeKey: input.dedupeKey,
      createdAt: this.clock(),
    };
    try {
      await this.writer(document);
    } catch (error) {
      console.warn('Product event write failed.', {
        requestId: input.requestId,
        eventName: input.eventName,
        identity: input.identity.type,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
}

export const eventDedupeKey = (
  identity: RequestIdentity,
  eventName: ProductEventName,
  resourceOrPeriod: string,
): string => `${identity.ownerId}:${eventName}:${resourceOrPeriod}`;

export const utcDay = (date = new Date()): string => date.toISOString().slice(0, 10);

export const productEventService = new ProductEventService();
