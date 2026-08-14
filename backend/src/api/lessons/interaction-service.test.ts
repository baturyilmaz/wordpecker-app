/* eslint-env jest */
import mongoose from 'mongoose';
import { LessonInteraction, ILessonInteraction } from './interaction-model';
import { LessonInteractionService } from './interaction-service';
import { ILesson } from './model';
import { LessonError } from './errors';
import { LessonService } from './service';

const ownerId = 'guest_12345678-abcd-4000-8000-123456789abc';
const lessonId = new mongoose.Types.ObjectId();
const articleId = new mongoose.Types.ObjectId();
const itemId = new mongoose.Types.ObjectId();
const item = { _id: itemId, term: 'pave the way' };
const items = Object.assign([item], { id: (id: string) => id === itemId.toString() ? item : null });
const lesson = { _id: lessonId, ownerId, articleId, items } as unknown as ILesson;
const vocabulary = { ensureReviewState: jest.fn().mockResolvedValue(undefined) };

const interaction = (knowledgeStatus: 'unset' | 'known' | 'unknown', saved: boolean) => ({
  _id: new mongoose.Types.ObjectId(),
  ownerId,
  lessonId,
  lessonItemId: itemId,
  articleId,
  term: item.term,
  knowledgeStatus,
  saved,
  createdAt: new Date(),
  updatedAt: new Date(),
} as ILessonInteraction);

describe('LessonInteractionService', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['known', 'unknown'] as const)('persists %s knowledge status', async (knowledgeStatus) => {
    const lessons = { getOwned: jest.fn().mockResolvedValue(lesson) } as unknown as LessonService;
    jest.spyOn(LessonInteraction, 'findOneAndUpdate').mockResolvedValue(interaction(knowledgeStatus, false));
    const result = await new LessonInteractionService(lessons, vocabulary as never).update(ownerId, lessonId.toString(), itemId.toString(), { knowledgeStatus });
    expect(result.knowledgeStatus).toBe(knowledgeStatus);
    expect(LessonInteraction.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId, lessonItemId: itemId }),
      expect.objectContaining({ $set: { knowledgeStatus } }),
      expect.objectContaining({ upsert: true }),
    );
    if (knowledgeStatus === 'unknown') expect(vocabulary.ensureReviewState).toHaveBeenCalledWith(ownerId, item.term);
  });

  it('persists save on and off independently from knowledge status', async () => {
    const lessons = { getOwned: jest.fn().mockResolvedValue(lesson) } as unknown as LessonService;
    const update = jest.spyOn(LessonInteraction, 'findOneAndUpdate')
      .mockResolvedValueOnce(interaction('unknown', true))
      .mockResolvedValueOnce(interaction('unknown', false));
    const service = new LessonInteractionService(lessons, vocabulary as never);
    expect((await service.update(ownerId, lessonId.toString(), itemId.toString(), { saved: true })).saved).toBe(true);
    expect((await service.update(ownerId, lessonId.toString(), itemId.toString(), { saved: false })).saved).toBe(false);
    expect(update).toHaveBeenNthCalledWith(1, expect.anything(), expect.objectContaining({ $set: { saved: true } }), expect.anything());
    expect(update).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({ $set: { saved: false } }), expect.anything());
    expect(vocabulary.ensureReviewState).toHaveBeenCalledWith(ownerId, item.term);
  });

  it('reloads persisted interactions for the owner', async () => {
    const lessons = { getOwned: jest.fn().mockResolvedValue(lesson) } as unknown as LessonService;
    const persisted = interaction('unknown', true);
    jest.spyOn(LessonInteraction, 'find').mockReturnValue({ lean: jest.fn().mockResolvedValue([persisted]) } as never);
    const result = await new LessonInteractionService(lessons).list(ownerId, lessonId.toString());
    expect(result).toEqual([persisted]);
  });

  it('enforces owner isolation before reading interactions', async () => {
    const lessons = {
      getOwned: jest.fn().mockRejectedValue(new LessonError('LESSON_FORBIDDEN', 'forbidden')),
    } as unknown as LessonService;
    const find = jest.spyOn(LessonInteraction, 'find');
    await expect(new LessonInteractionService(lessons).list(ownerId, lessonId.toString()))
      .rejects.toMatchObject({ code: 'LESSON_FORBIDDEN' });
    expect(find).not.toHaveBeenCalled();
  });
});
