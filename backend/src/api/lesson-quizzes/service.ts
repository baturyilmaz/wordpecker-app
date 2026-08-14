import mongoose from 'mongoose';
import { Lesson, ILesson, ILessonItem } from '../lessons/model';
import { QuizAnswerBodySchema } from './contracts';
import { QuizError } from './errors';
import { IQuizQuestion, LessonQuiz, ILessonQuiz } from './model';

export const normalizeQuizAnswer = (value: string): string => value
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[.,!?;:"']/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const blankTerm = (sentence: string, term: string): string | null => {
  const expression = new RegExp(term.trim().split(/\s+/).map(escapeRegExp).join('\\s+'), 'i');
  return expression.test(sentence) ? sentence.replace(expression, '_____') : null;
};

const rotate = <T>(items: T[], amount: number): T[] => [...items.slice(amount), ...items.slice(0, amount)];

export const buildQuizQuestions = (lesson: ILesson): Array<Omit<IQuizQuestion, '_id'>> => {
  const selected = lesson.items.slice(0, 10);
  const meaningFor = (item: ILessonItem) => item.meaningEn || item.meaningZh;
  const meanings = [...new Set(lesson.items.map(meaningFor))];
  return selected.map((item, index) => {
    const correctMeaning = meaningFor(item);
    const blank = blankTerm(item.contextSentence, item.term) || blankTerm(item.exampleSentence, item.term);
    const canBuildMcq = meanings.filter((meaning) => meaning !== correctMeaning).length >= 3;
    if (index % 2 === 0 && blank) {
      return {
        lessonId: lesson._id,
        lessonItemId: item._id,
        type: 'fill_in_the_blank',
        prompt: blank,
        options: [],
        correctAnswer: item.term,
        explanation: item.explanation,
      };
    }
    if (canBuildMcq) {
      const distractors = meanings
        .filter((meaning) => meaning !== correctMeaning)
        .sort((left, right) => Math.abs(left.length - correctMeaning.length) - Math.abs(right.length - correctMeaning.length))
        .slice(0, 3);
      return {
        lessonId: lesson._id,
        lessonItemId: item._id,
        type: 'multiple_choice',
        prompt: `What does “${item.term}” mean in this lesson?`,
        options: rotate([correctMeaning, ...distractors], index % 4),
        correctAnswer: correctMeaning,
        explanation: item.explanation,
      };
    }
    return {
      lessonId: lesson._id,
      lessonItemId: item._id,
      type: 'fill_in_the_blank',
      prompt: blank || `Type the expression meaning “${correctMeaning}”.`,
      options: [],
      correctAnswer: item.term,
      explanation: item.explanation,
    };
  });
};

export class LessonQuizService {
  async createOrResume(ownerId: string, lessonId: string): Promise<ILessonQuiz> {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) throw new QuizError('LESSON_NOT_READY', 'Lesson is not ready.');
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.ownerId !== ownerId || lesson.status !== 'ready') {
      throw new QuizError('LESSON_NOT_READY', 'Lesson is not ready.');
    }
    const active = await LessonQuiz.findOne({ ownerId, lessonId: lesson._id, status: 'active' });
    if (active) return active;
    const questions = buildQuizQuestions(lesson);
    try {
      return await LessonQuiz.create({
        ownerId,
        lessonId: lesson._id,
        status: 'active',
        questionCount: questions.length,
        correctCount: 0,
        totalCount: 0,
        questions,
        startedAt: new Date(),
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        const duplicate = await LessonQuiz.findOne({ ownerId, lessonId: lesson._id, status: 'active' });
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  async getOwned(ownerId: string, quizId: string): Promise<ILessonQuiz> {
    if (!mongoose.Types.ObjectId.isValid(quizId)) throw new QuizError('QUIZ_NOT_FOUND', 'Quiz not found.');
    const quiz = await LessonQuiz.findById(quizId);
    if (!quiz) throw new QuizError('QUIZ_NOT_FOUND', 'Quiz not found.');
    if (quiz.ownerId !== ownerId) throw new QuizError('QUIZ_FORBIDDEN', 'You do not have access to this quiz.');
    return quiz;
  }

  async answer(ownerId: string, quizId: string, questionId: string, input: unknown): Promise<ILessonQuiz> {
    const parsed = QuizAnswerBodySchema.safeParse(input);
    if (!parsed.success) throw new QuizError('QUIZ_INVALID_ANSWER', 'Please provide an answer.');
    const quiz = await this.getOwned(ownerId, quizId);
    const question = quiz.questions.id(questionId);
    if (!question) throw new QuizError('QUIZ_INVALID_ANSWER', 'Quiz question not found.');
    if (question.answeredAt) return quiz;
    if (quiz.status === 'completed') throw new QuizError('QUIZ_ALREADY_COMPLETED', 'This quiz is already completed.');

    question.userAnswer = parsed.data.answer;
    question.normalizedAnswer = normalizeQuizAnswer(parsed.data.answer);
    question.isCorrect = question.normalizedAnswer === normalizeQuizAnswer(question.correctAnswer);
    question.answeredAt = new Date();
    quiz.totalCount += 1;
    if (question.isCorrect) quiz.correctCount += 1;
    if (quiz.totalCount >= quiz.questionCount) {
      quiz.status = 'completed';
      quiz.completedAt = new Date();
    }
    await quiz.save();
    return quiz;
  }
}

export const lessonQuizService = new LessonQuizService();
