import { Request, Response, Router } from 'express';
import { getRequestOwnerId } from '../../utils/owner';
import { CreateQuizBodySchema } from './contracts';
import { QuizError } from './errors';
import { ILessonQuiz } from './model';
import { LessonQuizService, lessonQuizService } from './service';
import { requireIdentity } from '../../middleware/auth';
import { eventDedupeKey, ProductEventService, productEventService } from '../product-events/service';
import { logRequestError } from '../../utils/request-log';

export const serializeQuiz = (quiz: ILessonQuiz) => ({
  id: quiz._id.toString(),
  lessonId: quiz.lessonId.toString(),
  status: quiz.status,
  questionCount: quiz.questionCount,
  correctCount: quiz.correctCount,
  totalCount: quiz.totalCount,
  score: quiz.questionCount ? Math.round((quiz.correctCount / quiz.questionCount) * 100) : 0,
  startedAt: quiz.startedAt.toISOString(),
  completedAt: quiz.completedAt?.toISOString(),
  questions: quiz.questions.map((question) => ({
    id: question._id.toString(),
    lessonId: question.lessonId.toString(),
    lessonItemId: question.lessonItemId.toString(),
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    explanation: question.answeredAt ? question.explanation : undefined,
    userAnswer: question.userAnswer,
    isCorrect: question.isCorrect,
    correctAnswer: question.answeredAt ? question.correctAnswer : undefined,
    answeredAt: question.answeredAt?.toISOString(),
  })),
});

const sendError = (request: Request, response: Response, error: unknown) => {
  if (error instanceof QuizError) return response.status(error.statusCode).json({ code: error.code, message: error.message });
  logRequestError(request, 500, 'QUIZ_NOT_FOUND', error);
  return response.status(500).json({ code: 'QUIZ_NOT_FOUND', message: 'We could not load this quiz.' });
};

export const createLessonQuizRouter = (
  service: LessonQuizService = lessonQuizService,
  events: ProductEventService = productEventService,
) => {
  const router = Router();
  router.use(requireIdentity);
  router.post('/', async (req, res) => {
    const ownerId = getRequestOwnerId(req)!;
    const parsed = CreateQuizBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ code: 'LESSON_NOT_READY', message: 'Lesson is not ready.' });
    try {
      const quiz = await service.createOrResume(ownerId, parsed.data.lessonId);
      await events.record({
        identity: req.identity!,
        eventName: 'quiz_started',
        lessonId: quiz.lessonId.toString(),
        quizId: quiz._id.toString(),
        metadata: { questionCount: quiz.questionCount },
        dedupeKey: eventDedupeKey(req.identity!, 'quiz_started', quiz._id.toString()),
        requestId: req.requestId,
      });
      return res.status(201).json(serializeQuiz(quiz));
    } catch (error) {
      return sendError(req, res, error);
    }
  });
  router.get('/:id', async (req, res) => {
    const ownerId = getRequestOwnerId(req)!;
    try {
      return res.json(serializeQuiz(await service.getOwned(ownerId, req.params.id)));
    } catch (error) {
      return sendError(req, res, error);
    }
  });
  router.put('/:quizId/questions/:questionId/answer', async (req, res) => {
    const ownerId = getRequestOwnerId(req)!;
    try {
      const quiz = await service.answer(ownerId, req.params.quizId, req.params.questionId, req.body);
      if (quiz.status === 'completed') {
        await events.record({
          identity: req.identity!,
          eventName: 'quiz_completed',
          lessonId: quiz.lessonId.toString(),
          quizId: quiz._id.toString(),
          metadata: { questionCount: quiz.questionCount, correctCount: quiz.correctCount },
          dedupeKey: eventDedupeKey(req.identity!, 'quiz_completed', quiz._id.toString()),
          requestId: req.requestId,
        });
      }
      return res.json(serializeQuiz(quiz));
    } catch (error) {
      return sendError(req, res, error);
    }
  });
  return router;
};

export default createLessonQuizRouter();
