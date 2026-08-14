import mongoose from 'mongoose';
import { environment } from '../../config/environment';
import { Article } from '../articles/model';
import { LessonInteraction } from './interaction-model';
import { Lesson, ILesson } from './model';
import { GenerateLesson, generateLessonWithAgent, LESSON_PROMPT_VERSION, PersonalizationHistory } from './generator';
import { LessonError, lessonErrorMessages } from './errors';
import { LessonLevel } from './contracts';

export const STALE_GENERATION_MS = 2 * 60 * 1000;

const providerName = () => {
  if (!environment.openaiBaseUrl) return 'openai-default';
  try {
    return new URL(environment.openaiBaseUrl).hostname;
  } catch {
    return 'openai-compatible';
  }
};

export const getPersonalizationHistory = async (ownerId: string): Promise<PersonalizationHistory> => {
  const [known, unknown] = await Promise.all([
    LessonInteraction.find({ ownerId, knowledgeStatus: 'known' }).sort({ updatedAt: -1 }).limit(50).lean(),
    LessonInteraction.find({ ownerId, knowledgeStatus: 'unknown' }).sort({ updatedAt: -1 }).limit(50).lean(),
  ]);
  return {
    knownTerms: known.map((item) => item.term),
    unknownTerms: unknown.map((item) => item.term),
  };
};

export class LessonService {
  private readonly inFlight = new Map<string, Promise<ILesson>>();

  constructor(private readonly generate: GenerateLesson = generateLessonWithAgent) {}

  async create(ownerId: string, articleId: string, level: LessonLevel): Promise<ILesson> {
    const generationKey = `${ownerId}:${articleId}:${level}`;
    const existingGeneration = this.inFlight.get(generationKey);
    if (existingGeneration) return existingGeneration;

    const generation = this.createOnce(ownerId, articleId, level);
    this.inFlight.set(generationKey, generation);
    try {
      return await generation;
    } finally {
      if (this.inFlight.get(generationKey) === generation) this.inFlight.delete(generationKey);
    }
  }

  private async createOnce(ownerId: string, articleId: string, level: LessonLevel): Promise<ILesson> {
    const article = await Article.findById(articleId);
    if (!article) throw new LessonError('ARTICLE_NOT_FOUND', lessonErrorMessages.ARTICLE_NOT_FOUND);
    if (article.ownerId !== ownerId) throw new LessonError('ARTICLE_FORBIDDEN', lessonErrorMessages.ARTICLE_FORBIDDEN);

    const query = { ownerId, articleId: article._id, levelAtGeneration: level };
    let lesson = await Lesson.findOne(query);
    if (lesson?.status === 'ready') return lesson;
    if (lesson?.status === 'generating' && Date.now() - lesson.updatedAt.getTime() <= STALE_GENERATION_MS) {
      return lesson;
    }

    if (lesson) {
      lesson.status = 'generating';
      lesson.failureCode = undefined;
      lesson.failureMessage = undefined;
      await lesson.save();
    } else {
      try {
        lesson = await Lesson.create({
          ...query,
          status: 'generating',
          items: [],
          generationMeta: {
            model: environment.openaiModel,
            provider: providerName(),
            promptVersion: LESSON_PROMPT_VERSION,
            articleWordCount: article.wordCount,
            truncated: false,
          },
        });
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 11000) {
          const duplicate = await Lesson.findOne(query);
          if (duplicate) return duplicate;
        }
        throw error;
      }
    }

    try {
      const history = await getPersonalizationHistory(ownerId);
      const generated = await this.generate(article, level, history);
      const ready = await Lesson.findByIdAndUpdate(lesson._id, {
        $set: {
          status: 'ready',
          summary: generated.output.summary,
          difficulty: generated.output.difficulty,
          learningFocus: generated.output.learningFocus,
          contentDensity: generated.output.items.length < 8 ? 'low' : 'normal',
          items: generated.output.items.map((item) => ({
            ...item,
            importanceReason: item.importanceReason || undefined,
            difficulty: item.difficulty || undefined,
          })),
          generationMeta: {
            provider: providerName(),
            model: environment.openaiModel,
            generatedAt: new Date(),
            promptVersion: LESSON_PROMPT_VERSION,
            durationMs: generated.durationMs,
            initialRawCount: generated.initialRawCount,
            finalValidCount: generated.finalValidCount,
            refillCount: generated.refillCount,
            articleWordCount: article.wordCount,
            truncated: generated.truncated,
          },
          failureCode: undefined,
          failureMessage: undefined,
        },
      }, { new: true });
      if (!ready) throw new Error('Lesson disappeared during generation');
      return ready;
    } catch (error) {
      const lessonError = error instanceof LessonError
        ? error
        : new LessonError('LESSON_GENERATION_FAILED', lessonErrorMessages.LESSON_GENERATION_FAILED);
      await Lesson.findByIdAndUpdate(lesson._id, {
        $set: { status: 'failed', failureCode: lessonError.code, failureMessage: lessonError.message },
      });
      throw lessonError;
    }
  }

  async getOwned(ownerId: string, lessonId: string): Promise<ILesson> {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      throw new LessonError('LESSON_NOT_FOUND', lessonErrorMessages.LESSON_NOT_FOUND);
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new LessonError('LESSON_NOT_FOUND', lessonErrorMessages.LESSON_NOT_FOUND);
    if (lesson.ownerId !== ownerId) throw new LessonError('LESSON_FORBIDDEN', lessonErrorMessages.LESSON_FORBIDDEN);
    if (lesson.status === 'generating' && Date.now() - lesson.updatedAt.getTime() > STALE_GENERATION_MS) {
      lesson.status = 'failed';
      lesson.failureCode = 'LESSON_GENERATION_FAILED';
      lesson.failureMessage = 'Lesson generation was interrupted. Please try again.';
      await lesson.save();
    }
    return lesson;
  }
}

export const lessonService = new LessonService();
