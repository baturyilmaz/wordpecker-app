/* eslint-env jest */
import mongoose from 'mongoose';
import { Article } from '../articles/model';
import { Lesson } from '../lessons/model';
import { LessonInteraction } from '../lessons/interaction-model';
import { ReviewState } from '../reviews/model';
import { VocabularyService } from '../vocabulary/service';
import { GuestMigrationService } from './migration-service';

const guestId = 'guest_41a2b3c4-d5e6-4789-8123-abcdef123456';
const userId = new mongoose.Types.ObjectId();
const userOwnerId = `user_${userId}`;
const now = new Date('2026-08-14T07:00:00.000Z');

const integrationUrl = () => {
  const configured = process.env.MONGODB_URL;
  if (!configured) throw new Error('MONGODB_URL is required for owner migration integration coverage.');
  return configured.replace(/\/[^/?]+(\?|$)/, '/wordpecker_phase41_test$1');
};

describe('guest authentication → owner migration → vocabulary integration', () => {
  beforeAll(async () => {
    await mongoose.connect(integrationUrl(), { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('preserves unknown and saved terms while excluding known + unsaved across every filter', async () => {
    const article = await Article.create({
      ownerId: guestId,
      originalUrl: 'https://example.com/phase-41',
      canonicalUrl: 'https://example.com/phase-41',
      title: 'Phase 4.1 integration article',
      source: 'Example',
      content: 'Unknown term appears here. Saved phrase appears here. Known only appears here.',
      wordCount: 12,
      language: 'en',
      status: 'extracted',
    });
    const items = [
      ['unknown term', 'a term the learner does not yet understand', '不认识的词'],
      ['saved phrase', 'a phrase deliberately kept for later study', '已保存的短语'],
      ['known only', 'a term the learner already understands', '已掌握的词'],
    ].map(([term, meaningEn, meaningZh]) => ({
      type: term.includes(' ') ? 'phrase' : 'word',
      term,
      meaningEn,
      meaningZh,
      contextSentence: `${term} appears here.`,
      explanation: `This explains how ${term} works in English.`,
      exampleSentence: `A new example uses ${term} naturally.`,
      difficulty: 'intermediate',
    }));
    const lesson = await Lesson.create({
      ownerId: guestId,
      articleId: article._id,
      levelAtGeneration: 'intermediate',
      status: 'ready',
      summary: 'An integration lesson.',
      difficulty: 'intermediate',
      learningFocus: 'Owner migration.',
      contentDensity: 'low',
      items: [...items, ...items.slice(0, 2).map((item, index) => ({ ...item, term: `${item.term} extra ${index}`, contextSentence: `${item.term} extra ${index} appears here.`, exampleSentence: `We use ${item.term} extra ${index} in a new example.` }))],
      generationMeta: { promptVersion: 'v3', articleWordCount: 12, truncated: false },
    });
    const [unknown, saved, knownOnly] = lesson.items;
    await LessonInteraction.create([
      { ownerId: guestId, lessonId: lesson._id, lessonItemId: unknown._id, articleId: article._id, term: unknown.term, knowledgeStatus: 'unknown', saved: false },
      { ownerId: guestId, lessonId: lesson._id, lessonItemId: saved._id, articleId: article._id, term: saved.term, knowledgeStatus: 'known', saved: true },
      { ownerId: guestId, lessonId: lesson._id, lessonItemId: knownOnly._id, articleId: article._id, term: knownOnly.term, knowledgeStatus: 'known', saved: false },
    ]);
    await ReviewState.create([
      { ownerId: guestId, normalizedTerm: unknown.term, nextReviewAt: now },
      { ownerId: guestId, normalizedTerm: saved.term, nextReviewAt: new Date(now.getTime() + 86_400_000) },
    ]);

    const counts = await new GuestMigrationService().migrate(guestId, userId.toString());
    expect(counts).toMatchObject({ articles: 1, lessons: 1, interactions: 3, reviews: 2 });
    expect(await Article.countDocuments({ ownerId: guestId })).toBe(0);
    expect(await Lesson.countDocuments({ ownerId: guestId })).toBe(0);
    expect(await LessonInteraction.countDocuments({ ownerId: guestId })).toBe(0);
    expect(await ReviewState.countDocuments({ ownerId: guestId })).toBe(0);

    const vocabulary = new VocabularyService();
    const all = await vocabulary.list(userOwnerId, 'all', now);
    const unknownItems = await vocabulary.list(userOwnerId, 'unknown', now);
    const savedItems = await vocabulary.list(userOwnerId, 'saved', now);
    const dueItems = await vocabulary.list(userOwnerId, 'due', now);
    expect(all.map((item) => item.normalizedTerm).sort()).toEqual(['saved phrase', 'unknown term']);
    expect(unknownItems.map((item) => item.normalizedTerm)).toEqual(['unknown term']);
    expect(savedItems.map((item) => item.normalizedTerm)).toEqual(['saved phrase']);
    expect(dueItems.map((item) => item.normalizedTerm)).toEqual(['unknown term']);
    expect(all.find((item) => item.normalizedTerm === 'unknown term')?.occurrences[0].meaningEnAtOccurrence)
      .toBe('a term the learner does not yet understand');
  });
});
