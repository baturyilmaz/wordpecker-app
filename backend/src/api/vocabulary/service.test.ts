/* eslint-env jest */
import mongoose from 'mongoose';
import { Article } from '../articles/model';
import { LessonInteraction } from '../lessons/interaction-model';
import { Lesson } from '../lessons/model';
import { ReviewState } from '../reviews/model';
import { normalizeVocabularyTerm, VocabularyService } from './service';

const ownerId = 'guest_12345678-abcd-4000-8000-123456789abc';
const lessonId = new mongoose.Types.ObjectId();
const articleId = new mongoose.Types.ObjectId();
const itemId = new mongoose.Types.ObjectId();
const now = new Date('2026-08-13T12:00:00Z');

const interaction = (overrides: Record<string, unknown> = {}) => ({
  _id: new mongoose.Types.ObjectId(), ownerId, lessonId, articleId, lessonItemId: itemId,
  term: 'Take Off', knowledgeStatus: 'unknown', saved: false,
  createdAt: new Date('2026-08-12T12:00:00Z'), updatedAt: now, ...overrides,
});
const lesson = (id = lessonId, article = articleId, item = itemId, term = 'Take Off') => ({
  _id: id, ownerId, articleId: article,
  items: [{ _id: item, term, meaningEn: 'to begin flying or become successful quickly', meaningZh: '起飞；迅速成功', contextSentence: 'The plane will take off soon.', explanation: 'A phrasal verb.', exampleSentence: 'Sales may take off soon.' }],
});
const article = (id = articleId, title = 'First article') => ({ _id: id, ownerId, title, source: 'Example', canonicalUrl: 'https://example.com/article' });
const review = (term = 'take off', nextReviewAt = now) => ({ ownerId, normalizedTerm: term, nextReviewAt, reviewCount: 0, rememberedCount: 0, unsureCount: 0, forgotCount: 0 });

const query = <T>(value: T) => ({ sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(value) });
const leanQuery = <T>(value: T) => ({ lean: jest.fn().mockResolvedValue(value) });

describe('VocabularyService', () => {
  afterEach(() => jest.restoreAllMocks());

  const mockData = (interactions: ReturnType<typeof interaction>[], lessons = [lesson()], articles = [article()]) => {
    jest.spyOn(LessonInteraction, 'find').mockReturnValue(query(interactions) as never);
    jest.spyOn(Lesson, 'find').mockReturnValue(leanQuery(lessons) as never);
    jest.spyOn(Article, 'find').mockReturnValue(leanQuery(articles) as never);
    jest.spyOn(ReviewState, 'findOne').mockResolvedValue(review() as never);
  };

  it('creates an immediately due ReviewState on first eligibility', async () => {
    const update = jest.spyOn(ReviewState, 'findOneAndUpdate').mockResolvedValue(review() as never);
    await new VocabularyService().ensureReviewState(ownerId, ' Take   Off ', now);
    expect(update).toHaveBeenCalledWith(
      { ownerId, normalizedTerm: 'take off' },
      { $setOnInsert: { ownerId, normalizedTerm: 'take off', nextReviewAt: now } },
      expect.objectContaining({ upsert: true }),
    );
  });

  it.each([
    ['unknown', false, true],
    ['unset', true, true],
    ['unknown', true, true],
    ['known', true, true],
  ] as const)('%s + saved=%s is active vocabulary', async (knowledgeStatus, saved, expected) => {
    mockData([interaction({ knowledgeStatus, saved })]);
    expect((await new VocabularyService().list(ownerId)).length > 0).toBe(expected);
  });

  it('excludes known + unsaved because it is not eligible', async () => {
    mockData([]);
    expect(await new VocabularyService().list(ownerId)).toEqual([]);
    expect(LessonInteraction.find).toHaveBeenCalledWith(expect.objectContaining({ ownerId }));
  });

  it('deduplicates normalized terms and preserves multi-source occurrences', async () => {
    const secondLessonId = new mongoose.Types.ObjectId();
    const secondArticleId = new mongoose.Types.ObjectId();
    const secondItemId = new mongoose.Types.ObjectId();
    const interactions = [
      interaction(),
      interaction({ lessonId: secondLessonId, articleId: secondArticleId, lessonItemId: secondItemId, term: 'take   off', saved: true }),
    ];
    mockData(interactions, [lesson(), lesson(secondLessonId, secondArticleId, secondItemId, 'take   off')], [article(), article(secondArticleId, 'Second article')]);
    const entries = await new VocabularyService().list(ownerId);
    expect(entries).toHaveLength(1);
    expect(entries[0].normalizedTerm).toBe('take off');
    expect(entries[0].occurrences).toHaveLength(2);
    expect(entries[0].occurrences[0]).toMatchObject({
      meaningEnAtOccurrence: 'to begin flying or become successful quickly',
      meaningZhAtOccurrence: '起飞；迅速成功',
    });
  });

  it('filters unknown, saved, and due while preserving owner-scoped queries', async () => {
    mockData([interaction({ knowledgeStatus: 'unknown', saved: true })]);
    const service = new VocabularyService();
    expect(await service.list(ownerId, 'unknown', now)).toHaveLength(1);
    expect(await service.list(ownerId, 'saved', now)).toHaveLength(1);
    expect(await service.list(ownerId, 'due', now)).toHaveLength(1);
    expect(normalizeVocabularyTerm('  Take   Off ')).toBe('take off');
  });
});
