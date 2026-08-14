import { Response, Router } from 'express';
import { getRequestOwnerId } from '../../utils/owner';
import { CreateLessonBodySchema, LessonLevel } from './contracts';
import { LessonError, lessonErrorMessages } from './errors';
import { ILessonInteraction } from './interaction-model';
import { LessonInteractionService, lessonInteractionService } from './interaction-service';
import { ILesson } from './model';
import { LessonService, lessonService } from './service';
import { requireAuth, requireIdentity } from '../../middleware/auth';
import { eventDedupeKey, ProductEventService, productEventService } from '../product-events/service';
import { logRequestError } from '../../utils/request-log';
import { Request } from 'express';

const serializeInteraction = (interaction: ILessonInteraction) => ({
  id: interaction._id.toString(),
  lessonItemId: interaction.lessonItemId.toString(),
  term: interaction.term,
  knowledgeStatus: interaction.knowledgeStatus,
  saved: interaction.saved,
  createdAt: interaction.createdAt.toISOString(),
  updatedAt: interaction.updatedAt.toISOString(),
});

export const serializeLesson = (lesson: ILesson, interactions: ILessonInteraction[] = []) => {
  const interactionByItem = new Map(interactions.map((item) => [item.lessonItemId.toString(), serializeInteraction(item)]));
  return {
    id: lesson._id.toString(),
    articleId: lesson.articleId.toString(),
    levelAtGeneration: lesson.levelAtGeneration,
    status: lesson.status,
    summary: lesson.summary,
    difficulty: lesson.difficulty,
    learningFocus: lesson.learningFocus,
    contentDensity: lesson.contentDensity,
    savedAt: lesson.savedAt?.toISOString(),
    items: lesson.items.map((item) => ({
      id: item._id.toString(),
      type: item.type,
      term: item.term,
      meaningEn: item.meaningEn,
      meaningZh: item.meaningZh,
      contextSentence: item.contextSentence,
      explanation: item.explanation,
      exampleSentence: item.exampleSentence,
      importanceReason: item.importanceReason,
      difficulty: item.difficulty,
      interaction: interactionByItem.get(item._id.toString()) || {
        lessonItemId: item._id.toString(),
        term: item.term,
        knowledgeStatus: 'unset',
        saved: false,
      },
    })),
    generationMeta: lesson.generationMeta,
    failureCode: lesson.failureCode,
    failureMessage: lesson.failureMessage,
    createdAt: lesson.createdAt.toISOString(),
    updatedAt: lesson.updatedAt.toISOString(),
  };
};

const sendError = (request: Request, response: Response, error: unknown) => {
  if (error instanceof LessonError) {
    return response.status(error.statusCode).json({ code: error.code, message: error.message });
  }
  logRequestError(request, 500, 'LESSON_GENERATION_FAILED', error);
  return response.status(500).json({
    code: 'LESSON_GENERATION_FAILED',
    message: lessonErrorMessages.LESSON_GENERATION_FAILED,
  });
};

export const createLessonRouter = (
  lessons: LessonService = lessonService,
  interactions: LessonInteractionService = lessonInteractionService,
  events: ProductEventService = productEventService,
) => {
  const router = Router();
  router.use(requireIdentity);

  router.post('/', async (req, res) => {
    const ownerId = getRequestOwnerId(req)!;
    const parsed = CreateLessonBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 'INVALID_LEVEL', message: lessonErrorMessages.INVALID_LEVEL });
    }
    try {
      const lesson = await lessons.create(ownerId, parsed.data.articleId, parsed.data.level as LessonLevel);
      const itemInteractions = lesson.status === 'ready' ? await interactions.list(ownerId, lesson._id.toString()) : [];
      if (lesson.status === 'ready') {
        await events.record({
          identity: req.identity!,
          eventName: 'lesson_created',
          articleId: lesson.articleId.toString(),
          lessonId: lesson._id.toString(),
          metadata: {
            contentDensity: lesson.contentDensity,
            itemCount: lesson.items.length,
            level: lesson.levelAtGeneration,
            model: lesson.generationMeta.model || 'unknown',
            promptVersion: lesson.generationMeta.promptVersion,
            durationMs: lesson.generationMeta.durationMs || 0,
          },
          dedupeKey: eventDedupeKey(req.identity!, 'lesson_created', lesson._id.toString()),
          requestId: req.requestId,
        });
      }
      return res.status(lesson.status === 'ready' ? 201 : 202).json(serializeLesson(lesson, itemInteractions));
    } catch (error) {
      return sendError(req, res, error);
    }
  });

  router.get('/:id', async (req, res) => {
    const ownerId = getRequestOwnerId(req)!;
    try {
      const lesson = await lessons.getOwned(ownerId, req.params.id);
      const itemInteractions = await interactions.list(ownerId, lesson._id.toString());
      await events.record({
        identity: req.identity!,
        eventName: 'lesson_opened',
        articleId: lesson.articleId.toString(),
        lessonId: lesson._id.toString(),
        requestId: req.requestId,
      });
      return res.json(serializeLesson(lesson, itemInteractions));
    } catch (error) {
      return sendError(req, res, error);
    }
  });

  router.put('/:lessonId/items/:itemId/interaction', async (req, res) => {
    const ownerId = getRequestOwnerId(req)!;
    if (req.body?.saved === true && req.identity?.type !== 'user') {
      return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Sign in to save vocabulary.' });
    }
    try {
      const interaction = await interactions.update(ownerId, req.params.lessonId, req.params.itemId, req.body);
      if (req.body?.saved === true) {
        await events.record({
          identity: req.identity!,
          eventName: 'term_saved',
          articleId: interaction.articleId.toString(),
          lessonId: interaction.lessonId.toString(),
          dedupeKey: eventDedupeKey(req.identity!, 'term_saved', interaction.lessonItemId.toString()),
          requestId: req.requestId,
        });
      }
      return res.json(serializeInteraction(interaction));
    } catch (error) {
      return sendError(req, res, error);
    }
  });

  router.put('/:id/save', requireAuth, async (req, res) => {
    const ownerId = getRequestOwnerId(req)!;
    try {
      const lesson = await lessons.getOwned(ownerId, req.params.id);
      if (!lesson.savedAt) {
        lesson.savedAt = new Date();
        await lesson.save();
      }
      const itemInteractions = await interactions.list(ownerId, lesson._id.toString());
      return res.json(serializeLesson(lesson, itemInteractions));
    } catch (error) {
      return sendError(req, res, error);
    }
  });

  return router;
};

export default createLessonRouter();
