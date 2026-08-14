/* eslint-env jest */
import { ReviewState } from './model';
import { ReviewService } from './service';
import { VocabularyEntry, VocabularyService } from '../vocabulary/service';

const ownerId = 'guest_12345678-abcd-4000-8000-123456789abc';
const now = new Date('2026-08-13T12:00:00Z');
const entry = (saved = false, knowledgeStatus: 'unknown' | 'known' = 'unknown'): VocabularyEntry => ({
  normalizedTerm: 'take off', term: 'Take Off', knowledgeStatus, saved,
  occurrences: [{
    articleId: 'article', articleTitle: 'Article', sourceUrl: 'https://example.com', sourceName: 'Example',
    lessonId: 'lesson', lessonItemId: 'item', contextSentence: 'The plane will take off.', meaningAtOccurrence: '起飞',
    explanation: 'A phrasal verb.', exampleSentence: 'Sales took off.', firstSeenAt: now,
  }],
  review: { nextReviewAt: now, reviewCount: 0, rememberedCount: 0, unsureCount: 0, forgotCount: 0 },
});

describe('ReviewService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns only the vocabulary due query', async () => {
    const vocabulary = { list: jest.fn().mockResolvedValue([entry()]) } as unknown as VocabularyService;
    expect(await new ReviewService(vocabulary).due(ownerId, now)).toHaveLength(1);
    expect(vocabulary.list).toHaveBeenCalledWith(ownerId, 'due', now);
  });

  it.each([
    ['forgot', 10 * 60 * 1000, 'forgotCount'],
    ['unsure', 24 * 60 * 60 * 1000, 'unsureCount'],
    ['remembered', 3 * 24 * 60 * 60 * 1000, 'rememberedCount'],
  ] as const)('schedules %s with controlled UTC time and increments counters', async (rating, interval, counter) => {
    const vocabulary = { get: jest.fn().mockResolvedValue(entry()) } as unknown as VocabularyService;
    const update = jest.spyOn(ReviewState, 'findOneAndUpdate').mockResolvedValue({} as never);
    await new ReviewService(vocabulary).rate(ownerId, 'take off', { rating }, now);
    expect(update).toHaveBeenCalledWith(
      { ownerId, normalizedTerm: 'take off' },
      expect.objectContaining({
        $set: { lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + interval) },
        $inc: { reviewCount: 1, [counter]: 1 },
      }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it('rejects a known unsaved term that is no longer eligible', async () => {
    const vocabulary = { get: jest.fn().mockRejectedValue(new Error('not eligible')) } as unknown as VocabularyService;
    await expect(new ReviewService(vocabulary).rate(ownerId, 'take off', { rating: 'remembered' }, now))
      .rejects.toMatchObject({ code: 'REVIEW_NOT_ELIGIBLE' });
  });

  it('allows a known saved term to remain reviewable', async () => {
    const vocabulary = { get: jest.fn().mockResolvedValue(entry(true, 'known')) } as unknown as VocabularyService;
    jest.spyOn(ReviewState, 'findOneAndUpdate').mockResolvedValue({} as never);
    await expect(new ReviewService(vocabulary).rate(ownerId, 'take off', { rating: 'remembered' }, now)).resolves.toBeDefined();
  });

  it('rejects invalid ratings', async () => {
    await expect(new ReviewService({} as VocabularyService).rate(ownerId, 'take off', { rating: 'easy' }, now))
      .rejects.toMatchObject({ code: 'REVIEW_INVALID_RATING' });
  });
});
