import { Article } from '../articles/model';
import { LessonInteraction } from '../lessons/interaction-model';
import { Lesson } from '../lessons/model';
import { ReviewState } from '../reviews/model';
import { VocabularyError } from './errors';

export const normalizeVocabularyTerm = (value: string): string => value
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export interface VocabularyOccurrence {
  articleId: string;
  articleTitle: string;
  sourceUrl: string;
  sourceName: string;
  lessonId: string;
  lessonItemId: string;
  contextSentence: string;
  meaningAtOccurrence: string;
  explanation: string;
  exampleSentence: string;
  firstSeenAt: Date;
}

export interface VocabularyEntry {
  normalizedTerm: string;
  term: string;
  knowledgeStatus: 'unset' | 'known' | 'unknown';
  saved: boolean;
  occurrences: VocabularyOccurrence[];
  review: {
    nextReviewAt: Date;
    lastReviewedAt?: Date;
    reviewCount: number;
    rememberedCount: number;
    unsureCount: number;
    forgotCount: number;
  };
}

const eligibleQuery = { $or: [{ knowledgeStatus: 'unknown' }, { saved: true }] };

export class VocabularyService {
  async ensureReviewState(ownerId: string, term: string, now = new Date()) {
    return ReviewState.findOneAndUpdate(
      { ownerId, normalizedTerm: normalizeVocabularyTerm(term) },
      { $setOnInsert: { ownerId, normalizedTerm: normalizeVocabularyTerm(term), nextReviewAt: now } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  async list(ownerId: string, filter: 'all' | 'unknown' | 'saved' | 'due' = 'all', now = new Date()): Promise<VocabularyEntry[]> {
    const interactions = await LessonInteraction.find({ ownerId, ...eligibleQuery }).sort({ createdAt: -1 }).lean();
    if (!interactions.length) return [];
    const lessonIds = [...new Set(interactions.map((item) => item.lessonId.toString()))];
    const articleIds = [...new Set(interactions.map((item) => item.articleId.toString()))];
    const [lessons, articles] = await Promise.all([
      Lesson.find({ _id: { $in: lessonIds }, ownerId }).lean(),
      Article.find({ _id: { $in: articleIds }, ownerId }).lean(),
    ]);
    const lessonById = new Map(lessons.map((lesson) => [lesson._id.toString(), lesson]));
    const articleById = new Map(articles.map((article) => [article._id.toString(), article]));
    const grouped = new Map<string, { term: string; interactions: typeof interactions }>();
    for (const interaction of interactions) {
      const key = normalizeVocabularyTerm(interaction.term);
      const group = grouped.get(key) || { term: interaction.term, interactions: [] as typeof interactions };
      group.interactions.push(interaction);
      grouped.set(key, group);
    }

    const states = await Promise.all([...grouped.keys()].map(async (normalizedTerm) => {
      const state = await ReviewState.findOne({ ownerId, normalizedTerm });
      return [normalizedTerm, state || await this.ensureReviewState(ownerId, normalizedTerm, now)] as const;
    }));
    const stateByTerm = new Map(states);
    const entries: VocabularyEntry[] = [];

    for (const [normalizedTerm, group] of grouped) {
      const latest = group.interactions[0];
      const knowledgeStatus = group.interactions.some((item) => item.knowledgeStatus === 'unknown') ? 'unknown'
        : group.interactions.some((item) => item.knowledgeStatus === 'known') ? 'known' : 'unset';
      const saved = group.interactions.some((item) => item.saved);
      const occurrences = group.interactions.flatMap<VocabularyOccurrence>((interaction) => {
        const lesson = lessonById.get(interaction.lessonId.toString());
        const article = articleById.get(interaction.articleId.toString());
        const item = lesson?.items.find((candidate) => candidate._id.toString() === interaction.lessonItemId.toString());
        if (!lesson || !article || !item) return [];
        return [{
          articleId: article._id.toString(),
          articleTitle: article.title,
          sourceUrl: article.canonicalUrl,
          sourceName: article.source,
          lessonId: lesson._id.toString(),
          lessonItemId: item._id.toString(),
          contextSentence: item.contextSentence,
          meaningAtOccurrence: item.meaningZh,
          explanation: item.explanation,
          exampleSentence: item.exampleSentence,
          firstSeenAt: interaction.createdAt,
        }];
      });
      const state = stateByTerm.get(normalizedTerm)!;
      const entry: VocabularyEntry = {
        normalizedTerm,
        term: latest.term,
        knowledgeStatus,
        saved,
        occurrences,
        review: {
          nextReviewAt: state.nextReviewAt,
          lastReviewedAt: state.lastReviewedAt,
          reviewCount: state.reviewCount,
          rememberedCount: state.rememberedCount,
          unsureCount: state.unsureCount,
          forgotCount: state.forgotCount,
        },
      };
      if (filter === 'unknown' && knowledgeStatus !== 'unknown') continue;
      if (filter === 'saved' && !saved) continue;
      if (filter === 'due' && state.nextReviewAt > now) continue;
      entries.push(entry);
    }
    return entries.sort((a, b) => a.review.nextReviewAt.getTime() - b.review.nextReviewAt.getTime());
  }

  async get(ownerId: string, normalizedTerm: string): Promise<VocabularyEntry> {
    const entry = (await this.list(ownerId)).find((item) => item.normalizedTerm === normalizeVocabularyTerm(normalizedTerm));
    if (!entry) throw new VocabularyError('VOCABULARY_NOT_FOUND', 'Vocabulary item not found.');
    return entry;
  }
}

export const vocabularyService = new VocabularyService();
