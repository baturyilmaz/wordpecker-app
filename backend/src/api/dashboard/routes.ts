import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { Article } from '../articles/model';
import { Lesson } from '../lessons/model';
import { LessonQuiz } from '../lesson-quizzes/model';
import { VocabularyService, vocabularyService } from '../vocabulary/service';

export const createDashboardRouter = (vocabulary: VocabularyService = vocabularyService) => {
  const router = Router();
  router.get('/', requireAuth, async (request, response, next) => {
    const ownerId = request.identity!.ownerId;
    try {
      const now = new Date();
      const [recentLessons, activeQuiz, vocabularyEntries] = await Promise.all([
        Lesson.find({ ownerId, status: 'ready' }).sort({ createdAt: -1 }).limit(5).lean(),
        LessonQuiz.findOne({ ownerId, status: 'active' }).sort({ updatedAt: -1 }).lean(),
        vocabulary.list(ownerId),
      ]);
      const articleIds = [...new Set(recentLessons.map((lesson) => lesson.articleId.toString()))];
      const articles = await Article.find({ ownerId, _id: { $in: articleIds } }).lean();
      const articleById = new Map(articles.map((article) => [article._id.toString(), article]));
      const lessonIds = recentLessons.map((lesson) => lesson._id);
      const quizzes = await LessonQuiz.find({ ownerId, lessonId: { $in: lessonIds } }).sort({ createdAt: -1 }).lean();
      const quizByLesson = new Map<string, typeof quizzes[number]>();
      quizzes.forEach((quiz) => { if (!quizByLesson.has(quiz.lessonId.toString())) quizByLesson.set(quiz.lessonId.toString(), quiz); });
      const reviewDueCount = vocabularyEntries.filter((entry) => entry.review.nextReviewAt <= now).length;
      return response.json({
        continueLearning: activeQuiz ? { type: 'quiz', id: activeQuiz._id.toString(), lessonId: activeQuiz.lessonId.toString() } : null,
        reviewDueCount,
        vocabularyCounts: {
          totalEligible: vocabularyEntries.length,
          unknown: vocabularyEntries.filter((entry) => entry.knowledgeStatus === 'unknown').length,
          saved: vocabularyEntries.filter((entry) => entry.saved).length,
        },
        recentLessons: recentLessons.map((lesson) => {
          const article = articleById.get(lesson.articleId.toString());
          const quiz = quizByLesson.get(lesson._id.toString());
          return {
            id: lesson._id.toString(),
            articleTitle: article?.title || 'Personalized English lesson',
            source: article?.source || '',
            level: lesson.levelAtGeneration,
            createdAt: lesson.createdAt.toISOString(),
            savedAt: lesson.savedAt?.toISOString(),
            quizState: quiz?.status || 'not_started',
          };
        }),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
};

export default createDashboardRouter();
