import { ReviewRatingSchema } from './contracts';
import { ReviewError } from './errors';
import { ReviewState } from './model';
import { VocabularyEntry, VocabularyService, vocabularyService } from '../vocabulary/service';

const intervals = {
  forgot: 10 * 60 * 1000,
  unsure: 24 * 60 * 60 * 1000,
  remembered: 3 * 24 * 60 * 60 * 1000,
} as const;

export class ReviewService {
  constructor(private readonly vocabulary: VocabularyService = vocabularyService) {}

  async due(ownerId: string, now = new Date()): Promise<VocabularyEntry[]> {
    return this.vocabulary.list(ownerId, 'due', now);
  }

  async rate(ownerId: string, normalizedTerm: string, input: unknown, now = new Date()): Promise<VocabularyEntry> {
    const parsed = ReviewRatingSchema.safeParse(input);
    if (!parsed.success) throw new ReviewError('REVIEW_INVALID_RATING', 'Choose Forgot, Unsure, or Remembered.');
    let entry: VocabularyEntry;
    try {
      entry = await this.vocabulary.get(ownerId, normalizedTerm);
    } catch {
      throw new ReviewError('REVIEW_NOT_ELIGIBLE', 'This term is no longer active vocabulary.');
    }
    const rating = parsed.data.rating;
    const update: Record<string, unknown> = {
      $set: { lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + intervals[rating]) },
      $inc: { reviewCount: 1, [`${rating}Count`]: 1 },
    };
    await ReviewState.findOneAndUpdate(
      { ownerId, normalizedTerm: entry.normalizedTerm },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return this.vocabulary.get(ownerId, normalizedTerm);
  }
}

export const reviewService = new ReviewService();
