/* eslint-env jest */
import mongoose from 'mongoose';
import { Lesson } from '../lessons/model';
import { LessonQuiz } from './model';
import { buildQuizQuestions, LessonQuizService, normalizeQuizAnswer } from './service';

const ownerId = 'guest_12345678-abcd-4000-8000-123456789abc';
const lessonId = new mongoose.Types.ObjectId();

const lesson = (status: 'ready' | 'generating' = 'ready', count = 12) => new Lesson({
  _id: lessonId,
  ownerId,
  articleId: new mongoose.Types.ObjectId(),
  levelAtGeneration: 'intermediate',
  status,
  contentDensity: 'normal',
  summary: 'Summary.',
  difficulty: 'intermediate',
  items: Array.from({ length: count }, (_, index) => ({
    type: index % 2 ? 'word' : 'phrase',
    term: index % 2 ? `term${index}` : `use term${index}`,
    meaningEn: `English meaning ${index}`,
    meaningZh: `含义${index}`,
    contextSentence: `The article can use term${index} in this context.`,
    explanation: `Explanation ${index}.`,
    exampleSentence: `We use term${index} in another example.`,
  })),
  generationMeta: { promptVersion: 'v2', articleWordCount: 200, truncated: false },
});

describe('LessonQuizService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('builds at most ten questions with stable LessonItem references and only MVP types', () => {
    const source = lesson('ready', 12);
    const questions = buildQuizQuestions(source);
    expect(questions).toHaveLength(10);
    expect(questions.every((question) => ['multiple_choice', 'fill_in_the_blank'].includes(question.type))).toBe(true);
    expect(questions.every((question) => source.items.id(question.lessonItemId))).toBe(true);
  });

  it('uses the Lesson item count when fewer than ten', () => {
    expect(buildQuizQuestions(lesson('ready', 5))).toHaveLength(5);
  });

  it('builds new multiple-choice answers from English meanings', () => {
    const questions = buildQuizQuestions(lesson('ready', 8));
    const multipleChoice = questions.find((question) => question.type === 'multiple_choice');
    expect(multipleChoice?.options).toContain('English meaning 1');
    expect(multipleChoice?.options.some((option) => option.startsWith('含义'))).toBe(false);
  });

  it('falls back to Chinese meanings for legacy lessons without meaningEn', () => {
    const legacy = lesson('ready', 8);
    legacy.items.forEach((item) => { item.meaningEn = undefined; });
    expect(() => buildQuizQuestions(legacy)).not.toThrow();
    expect(buildQuizQuestions(legacy).some((question) => question.options.some((option) => option.startsWith('含义')))).toBe(true);
  });

  it('creates and resumes one active attempt', async () => {
    const source = lesson();
    const active = new LessonQuiz({ ownerId, lessonId, status: 'active', questionCount: 1, questions: [buildQuizQuestions(source)[0]] });
    jest.spyOn(Lesson, 'findById').mockResolvedValue(source);
    jest.spyOn(LessonQuiz, 'findOne').mockResolvedValueOnce(null).mockResolvedValueOnce(active);
    jest.spyOn(LessonQuiz, 'create').mockResolvedValue(active as never);
    const service = new LessonQuizService();
    expect(await service.createOrResume(ownerId, lessonId.toString())).toBe(active);
    expect(await service.createOrResume(ownerId, lessonId.toString())).toBe(active);
  });

  it('rejects a Lesson that is not ready', async () => {
    jest.spyOn(Lesson, 'findById').mockResolvedValue(lesson('generating'));
    await expect(new LessonQuizService().createOrResume(ownerId, lessonId.toString()))
      .rejects.toMatchObject({ code: 'LESSON_NOT_READY' });
  });

  it('persists correct and wrong answers, completes, and makes duplicate submission idempotent', async () => {
    const source = lesson('ready', 2);
    const questions = buildQuizQuestions(source);
    const quiz = new LessonQuiz({ ownerId, lessonId, status: 'active', questionCount: 2, correctCount: 0, totalCount: 0, questions });
    quiz.save = jest.fn().mockResolvedValue(quiz);
    jest.spyOn(LessonQuiz, 'findById').mockResolvedValue(quiz);
    const service = new LessonQuizService();
    const firstId = quiz.questions[0]._id.toString();
    await service.answer(ownerId, quiz._id.toString(), firstId, { answer: quiz.questions[0].correctAnswer });
    expect(quiz.questions[0].isCorrect).toBe(true);
    expect(quiz.totalCount).toBe(1);
    await service.answer(ownerId, quiz._id.toString(), firstId, { answer: 'different' });
    expect(quiz.totalCount).toBe(1);
    await service.answer(ownerId, quiz._id.toString(), quiz.questions[1]._id.toString(), { answer: 'wrong' });
    expect(quiz.questions[1].isCorrect).toBe(false);
    expect(quiz.status).toBe('completed');
    expect(quiz.correctCount).toBe(1);
  });

  it('enforces owner isolation', async () => {
    const quiz = new LessonQuiz({ ownerId: 'guest_other-owner', lessonId, questionCount: 1, questions: [buildQuizQuestions(lesson())[0]] });
    jest.spyOn(LessonQuiz, 'findById').mockResolvedValue(quiz);
    await expect(new LessonQuizService().getOwned(ownerId, quiz._id.toString()))
      .rejects.toMatchObject({ code: 'QUIZ_FORBIDDEN' });
  });

  it('normalizes fill answers without AI scoring', () => {
    expect(normalizeQuizAnswer('  Take   Off! ')).toBe(normalizeQuizAnswer('take off'));
  });
});
