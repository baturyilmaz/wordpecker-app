/* eslint-env jest */
import mongoose from 'mongoose';
import { Article, IArticle } from '../articles/model';
import { LessonInteraction } from './interaction-model';
import { Lesson, ILesson } from './model';
import { LessonService } from './service';
import { LessonError } from './errors';

const ownerId = 'guest_12345678-abcd-4000-8000-123456789abc';
const articleId = new mongoose.Types.ObjectId();

const article = (owner = ownerId) => ({
  _id: articleId,
  ownerId: owner,
  title: 'A test article',
  source: 'Example',
  content: 'A sufficiently useful article body.',
  wordCount: 500,
} as IArticle);

const generatingLesson = () => ({
  _id: new mongoose.Types.ObjectId(),
  ownerId,
  articleId,
  levelAtGeneration: 'intermediate',
  status: 'generating',
  items: [],
  generationMeta: { promptVersion: 'v2', articleWordCount: 500, truncated: false },
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(undefined),
} as unknown as ILesson);

const readyLesson = () => ({ ...generatingLesson(), status: 'ready' } as ILesson);

const historyQuery = (items: Array<{ term: string }>) => {
  const query = {
    sort: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn().mockResolvedValue(items),
  };
  query.sort.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
};

const generated = {
  output: {
    summary: 'A short summary. A second sentence.',
    difficulty: 'intermediate' as const,
    learningFocus: 'Practice reusable language.',
    items: Array.from({ length: 8 }, (_, index) => ({
      type: 'word' as const,
      term: `term${index}`,
      meaningZh: '含义',
      contextSentence: `Context ${index}`,
      explanation: 'Explanation',
      exampleSentence: `Example ${index}`,
      importanceReason: null,
      difficulty: 'intermediate' as const,
    })),
  },
  durationMs: 1200,
  truncated: false,
  initialRawCount: 14,
  finalValidCount: 10,
  refillCount: 0,
  attempts: [],
};

describe('LessonService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('generates and stores a ready lesson with compressed history', async () => {
    const pending = generatingLesson();
    const ready = readyLesson();
    jest.spyOn(Article, 'findById').mockResolvedValue(article());
    jest.spyOn(Lesson, 'findOne').mockResolvedValue(null);
    jest.spyOn(Lesson, 'create').mockResolvedValue(pending as never);
    jest.spyOn(Lesson, 'findByIdAndUpdate').mockResolvedValue(ready);
    jest.spyOn(LessonInteraction, 'find')
      .mockReturnValueOnce(historyQuery([{ term: 'easy' }]) as never)
      .mockReturnValueOnce(historyQuery([{ term: 'difficult' }]) as never);
    const generator = jest.fn().mockResolvedValue(generated);

    const result = await new LessonService(generator).create(ownerId, articleId.toString(), 'intermediate');

    expect(result.status).toBe('ready');
    expect(generator).toHaveBeenCalledWith(expect.anything(), 'intermediate', {
      knownTerms: ['easy'],
      unknownTerms: ['difficult'],
    });
    expect(Lesson.findByIdAndUpdate).toHaveBeenCalledWith(pending._id, expect.objectContaining({
      $set: expect.objectContaining({
        generationMeta: expect.objectContaining({
          promptVersion: 'v2',
          initialRawCount: 14,
          finalValidCount: 10,
          refillCount: 0,
        }),
      }),
    }), { new: true });
  });

  it('returns an existing ready lesson without generating a duplicate', async () => {
    const existing = readyLesson();
    jest.spyOn(Article, 'findById').mockResolvedValue(article());
    jest.spyOn(Lesson, 'findOne').mockResolvedValue(existing);
    const generator = jest.fn();
    const result = await new LessonService(generator).create(ownerId, articleId.toString(), 'intermediate');
    expect(result).toBe(existing);
    expect(generator).not.toHaveBeenCalled();
  });

  it('regenerates an existing failed Lesson', async () => {
    const existing = { ...generatingLesson(), status: 'failed' } as ILesson;
    const ready = readyLesson();
    jest.spyOn(Article, 'findById').mockResolvedValue(article());
    jest.spyOn(Lesson, 'findOne').mockResolvedValue(existing);
    jest.spyOn(Lesson, 'findByIdAndUpdate').mockResolvedValue(ready);
    jest.spyOn(LessonInteraction, 'find')
      .mockReturnValueOnce(historyQuery([]) as never)
      .mockReturnValueOnce(historyQuery([]) as never);
    const generator = jest.fn().mockResolvedValue(generated);
    const result = await new LessonService(generator).create(ownerId, articleId.toString(), 'intermediate');
    expect(result.status).toBe('ready');
    expect(existing.save).toHaveBeenCalled();
    expect(generator).toHaveBeenCalledTimes(1);
  });

  it('regenerates a stale generating Lesson', async () => {
    const existing = generatingLesson();
    existing.updatedAt = new Date(Date.now() - (3 * 60 * 1000));
    const ready = readyLesson();
    jest.spyOn(Article, 'findById').mockResolvedValue(article());
    jest.spyOn(Lesson, 'findOne').mockResolvedValue(existing);
    jest.spyOn(Lesson, 'findByIdAndUpdate').mockResolvedValue(ready);
    jest.spyOn(LessonInteraction, 'find')
      .mockReturnValueOnce(historyQuery([]) as never)
      .mockReturnValueOnce(historyQuery([]) as never);
    const generator = jest.fn().mockResolvedValue(generated);
    await new LessonService(generator).create(ownerId, articleId.toString(), 'intermediate');
    expect(existing.save).toHaveBeenCalled();
    expect(generator).toHaveBeenCalledTimes(1);
  });

  it('reuses an active generating Lesson without starting AI again', async () => {
    const existing = generatingLesson();
    jest.spyOn(Article, 'findById').mockResolvedValue(article());
    jest.spyOn(Lesson, 'findOne').mockResolvedValue(existing);
    const generator = jest.fn();
    const result = await new LessonService(generator).create(ownerId, articleId.toString(), 'intermediate');
    expect(result).toBe(existing);
    expect(generator).not.toHaveBeenCalled();
  });

  it('shares one in-process generation across concurrent duplicate requests', async () => {
    const pending = generatingLesson();
    const ready = readyLesson();
    jest.spyOn(Article, 'findById').mockResolvedValue(article());
    jest.spyOn(Lesson, 'findOne').mockResolvedValue(null);
    jest.spyOn(Lesson, 'create').mockResolvedValue(pending as never);
    jest.spyOn(Lesson, 'findByIdAndUpdate').mockResolvedValue(ready);
    jest.spyOn(LessonInteraction, 'find')
      .mockReturnValueOnce(historyQuery([]) as never)
      .mockReturnValueOnce(historyQuery([]) as never);
    const generator = jest.fn().mockResolvedValue(generated);
    const service = new LessonService(generator);
    const [first, second] = await Promise.all([
      service.create(ownerId, articleId.toString(), 'intermediate'),
      service.create(ownerId, articleId.toString(), 'intermediate'),
    ]);
    expect(first).toBe(second);
    expect(generator).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing article', async () => {
    jest.spyOn(Article, 'findById').mockResolvedValue(null);
    await expect(new LessonService(jest.fn()).create(ownerId, articleId.toString(), 'intermediate'))
      .rejects.toMatchObject({ code: 'ARTICLE_NOT_FOUND' });
  });

  it('rejects an article owned by another guest', async () => {
    jest.spyOn(Article, 'findById').mockResolvedValue(article('guest_aaaaaaaa-bbbb-4000-8000-cccccccccccc'));
    await expect(new LessonService(jest.fn()).create(ownerId, articleId.toString(), 'intermediate'))
      .rejects.toMatchObject({ code: 'ARTICLE_FORBIDDEN' });
  });

  it('marks the lesson failed when AI output is invalid', async () => {
    const pending = generatingLesson();
    jest.spyOn(Article, 'findById').mockResolvedValue(article());
    jest.spyOn(Lesson, 'findOne').mockResolvedValue(null);
    jest.spyOn(Lesson, 'create').mockResolvedValue(pending as never);
    const update = jest.spyOn(Lesson, 'findByIdAndUpdate').mockResolvedValue(null);
    jest.spyOn(LessonInteraction, 'find')
      .mockReturnValueOnce(historyQuery([]) as never)
      .mockReturnValueOnce(historyQuery([]) as never);
    const generator = jest.fn().mockRejectedValue(new LessonError('LESSON_OUTPUT_INVALID', 'invalid'));
    await expect(new LessonService(generator).create(ownerId, articleId.toString(), 'intermediate'))
      .rejects.toMatchObject({ code: 'LESSON_OUTPUT_INVALID' });
    expect(update).toHaveBeenCalledWith(pending._id, expect.objectContaining({
      $set: expect.objectContaining({ status: 'failed', failureCode: 'LESSON_OUTPUT_INVALID' }),
    }));
  });

  it('stores five to seven items as low density', async () => {
    const pending = generatingLesson();
    const ready = readyLesson();
    jest.spyOn(Article, 'findById').mockResolvedValue(article());
    jest.spyOn(Lesson, 'findOne').mockResolvedValue(null);
    jest.spyOn(Lesson, 'create').mockResolvedValue(pending as never);
    const update = jest.spyOn(Lesson, 'findByIdAndUpdate').mockResolvedValue(ready);
    jest.spyOn(LessonInteraction, 'find')
      .mockReturnValueOnce(historyQuery([]) as never)
      .mockReturnValueOnce(historyQuery([]) as never);
    const lowDensity = { ...generated, output: { ...generated.output, items: generated.output.items.slice(0, 5) }, finalValidCount: 5 };
    await new LessonService(jest.fn().mockResolvedValue(lowDensity)).create(ownerId, articleId.toString(), 'intermediate');
    expect(update).toHaveBeenCalledWith(pending._id, expect.objectContaining({
      $set: expect.objectContaining({ contentDensity: 'low' }),
    }), { new: true });
  });
});
