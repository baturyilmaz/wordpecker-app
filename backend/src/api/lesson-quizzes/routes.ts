import { Response, Router } from 'express';
import { getRequestOwnerId } from '../../utils/owner';
import { CreateQuizBodySchema } from './contracts';
import { QuizError } from './errors';
import { ILessonQuiz } from './model';
import { LessonQuizService, lessonQuizService } from './service';

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

const sendError = (response: Response, error: unknown) => {
  if (error instanceof QuizError) return response.status(error.statusCode).json({ code: error.code, message: error.message });
  console.error('Quiz request failed:', error);
  return response.status(500).json({ code: 'QUIZ_NOT_FOUND', message: 'We could not load this quiz.' });
};

export const createLessonQuizRouter = (service: LessonQuizService = lessonQuizService) => {
  const router = Router();
  router.post('/', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    const parsed = CreateQuizBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ code: 'LESSON_NOT_READY', message: 'Lesson is not ready.' });
    try {
      const quiz = await service.createOrResume(ownerId, parsed.data.lessonId);
      return res.status(201).json(serializeQuiz(quiz));
    } catch (error) {
      return sendError(res, error);
    }
  });
  router.get('/:id', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    try {
      return res.json(serializeQuiz(await service.getOwned(ownerId, req.params.id)));
    } catch (error) {
      return sendError(res, error);
    }
  });
  router.put('/:quizId/questions/:questionId/answer', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    try {
      return res.json(serializeQuiz(await service.answer(ownerId, req.params.quizId, req.params.questionId, req.body)));
    } catch (error) {
      return sendError(res, error);
    }
  });
  return router;
};

export default createLessonQuizRouter();
