import mongoose, { ClientSession, Types } from 'mongoose';
import { Article } from '../articles/model';
import { Lesson } from '../lessons/model';
import { LessonInteraction } from '../lessons/interaction-model';
import { LessonQuiz } from '../lesson-quizzes/model';
import { ReviewState } from '../reviews/model';
import { GuestMigration, MigrationCounts } from './migration-model';
import { GUEST_ID_PATTERN, userOwnerId } from '../../utils/owner';
import { ProductEvent } from '../product-events/model';

const emptyCounts = (): MigrationCounts => ({ articles: 0, lessons: 0, interactions: 0, quizzes: 0, reviews: 0, events: 0 });
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();

export class GuestMigrationService {
  async migrate(guestId: string | undefined, userId: string): Promise<MigrationCounts> {
    if (!guestId || !GUEST_ID_PATTERN.test(guestId)) return emptyCounts();
    const existing = await GuestMigration.findOne({ guestId, userId, status: 'completed' });
    if (existing) return existing.counts;

    const mongoSession = await mongoose.startSession();
    try {
      let counts = emptyCounts();
      try {
        await mongoSession.withTransaction(async () => { counts = await this.run(guestId, userId, mongoSession); });
      } catch (error) {
        const code = error instanceof Error && 'code' in error ? Number(error.code) : 0;
        if (code !== 20) throw error;
        // Local standalone MongoDB has no transactions. Every operation below is
        // collision-aware and repeatable, with the unique audit record as its lock.
        counts = await this.run(guestId, userId);
      }
      return counts;
    } finally {
      await mongoSession.endSession();
    }
  }

  private async run(guestId: string, userId: string, session?: ClientSession): Promise<MigrationCounts> {
    const ownerId = userOwnerId(userId);
    const completed = await GuestMigration.findOne({ guestId, userId, status: 'completed' }, null, { session });
    if (completed) return completed.counts;
    await GuestMigration.findOneAndUpdate(
      { guestId, userId },
      { $setOnInsert: { guestId, userId, status: 'running', counts: emptyCounts() } },
      { upsert: true, new: true, session },
    );
    const counts = emptyCounts();
    const articleMap = new Map<string, Types.ObjectId>();
    const duplicateArticles: Types.ObjectId[] = [];
    const guestArticles = await Article.find({ ownerId: guestId }, null, { session });
    counts.articles = guestArticles.length;
    for (const article of guestArticles) {
      const duplicate = await Article.findOne({ ownerId, canonicalUrl: article.canonicalUrl, status: article.status }, null, { session });
      if (duplicate) {
        articleMap.set(article._id.toString(), duplicate._id);
        duplicateArticles.push(article._id);
      } else {
        article.ownerId = ownerId;
        await article.save({ session });
        articleMap.set(article._id.toString(), article._id);
      }
    }

    const lessonMap = new Map<string, Types.ObjectId>();
    const itemMap = new Map<string, Types.ObjectId>();
    const duplicateLessons: Types.ObjectId[] = [];
    const guestLessons = await Lesson.find({ ownerId: guestId }, null, { session });
    counts.lessons = guestLessons.length;
    for (const lesson of guestLessons) {
      const articleId = articleMap.get(lesson.articleId.toString()) || lesson.articleId;
      const duplicate = await Lesson.findOne({ ownerId, articleId, levelAtGeneration: lesson.levelAtGeneration }, null, { session });
      if (duplicate) {
        lessonMap.set(lesson._id.toString(), duplicate._id);
        duplicateLessons.push(lesson._id);
        for (const item of lesson.items) {
          const target = duplicate.items.find((candidate) => normalize(candidate.term) === normalize(item.term));
          if (target) itemMap.set(item._id.toString(), target._id);
        }
        if (lesson.savedAt && (!duplicate.savedAt || lesson.savedAt < duplicate.savedAt)) {
          duplicate.savedAt = lesson.savedAt;
          await duplicate.save({ session });
        }
      } else {
        lesson.ownerId = ownerId;
        lesson.articleId = articleId;
        await lesson.save({ session });
        lessonMap.set(lesson._id.toString(), lesson._id);
        lesson.items.forEach((item) => itemMap.set(item._id.toString(), item._id));
      }
    }

    const interactions = await LessonInteraction.find({ ownerId: guestId }, null, { session });
    counts.interactions = interactions.length;
    for (const interaction of interactions) {
      const lessonId = lessonMap.get(interaction.lessonId.toString()) || interaction.lessonId;
      const articleId = articleMap.get(interaction.articleId.toString()) || interaction.articleId;
      const lessonItemId = itemMap.get(interaction.lessonItemId.toString());
      if (!lessonItemId) throw new Error('MIGRATION_CONFLICT: a lesson item could not be mapped without data loss');
      const target = await LessonInteraction.findOne({ ownerId, lessonId, lessonItemId }, null, { session });
      if (target) {
        target.saved = target.saved || interaction.saved;
        if (interaction.knowledgeStatus === 'unknown' || target.knowledgeStatus === 'unset') {
          target.knowledgeStatus = interaction.knowledgeStatus;
        }
        await target.save({ session });
        await interaction.deleteOne({ session });
      } else {
        interaction.ownerId = ownerId;
        interaction.lessonId = lessonId;
        interaction.articleId = articleId;
        interaction.lessonItemId = lessonItemId;
        await interaction.save({ session });
      }
    }

    const quizMap = new Map<string, Types.ObjectId>();
    const quizzes = await LessonQuiz.find({ ownerId: guestId }, null, { session });
    counts.quizzes = quizzes.length;
    for (const quiz of quizzes) {
      const lessonId = lessonMap.get(quiz.lessonId.toString()) || quiz.lessonId;
      const active = quiz.status === 'active' ? await LessonQuiz.findOne({ ownerId, lessonId, status: 'active' }, null, { session }) : null;
      if (active) {
        if (quiz.totalCount > active.totalCount) {
          await active.deleteOne({ session });
        } else {
          quizMap.set(quiz._id.toString(), active._id);
          await quiz.deleteOne({ session });
          continue;
        }
      }
      quiz.ownerId = ownerId;
      quiz.lessonId = lessonId;
      quiz.questions.forEach((question) => {
        question.lessonId = lessonId;
        const mappedItemId = itemMap.get(question.lessonItemId.toString());
        if (!mappedItemId) throw new Error('MIGRATION_CONFLICT: a quiz item could not be mapped without data loss');
        question.lessonItemId = mappedItemId;
      });
      await quiz.save({ session });
      quizMap.set(quiz._id.toString(), quiz._id);
    }

    const reviews = await ReviewState.find({ ownerId: guestId }, null, { session });
    counts.reviews = reviews.length;
    for (const review of reviews) {
      const target = await ReviewState.findOne({ ownerId, normalizedTerm: review.normalizedTerm }, null, { session });
      if (target) {
        target.reviewCount += review.reviewCount;
        target.rememberedCount += review.rememberedCount;
        target.unsureCount += review.unsureCount;
        target.forgotCount += review.forgotCount;
        if (!target.lastReviewedAt || (review.lastReviewedAt && review.lastReviewedAt > target.lastReviewedAt)) target.lastReviewedAt = review.lastReviewedAt;
        if (review.nextReviewAt < target.nextReviewAt) target.nextReviewAt = review.nextReviewAt;
        await target.save({ session });
        await review.deleteOne({ session });
      } else {
        review.ownerId = ownerId;
        await review.save({ session });
      }
    }

    const productEvents = await ProductEvent.find({ ownerId: guestId }, null, { session });
    counts.events = productEvents.length;
    for (const event of productEvents) {
      const dedupeKey = event.dedupeKey?.startsWith(`${guestId}:`)
        ? `${ownerId}:${event.dedupeKey.slice(guestId.length + 1)}`
        : event.dedupeKey;
      const duplicate = dedupeKey
        ? await ProductEvent.findOne({ ownerId, dedupeKey }, null, { session })
        : null;
      if (duplicate) {
        await event.deleteOne({ session });
        continue;
      }
      event.ownerId = ownerId;
      event.userId = new Types.ObjectId(userId);
      event.guestId = undefined;
      event.dedupeKey = dedupeKey;
      if (event.articleId) event.articleId = articleMap.get(event.articleId.toString()) || event.articleId;
      if (event.lessonId) event.lessonId = lessonMap.get(event.lessonId.toString()) || event.lessonId;
      if (event.quizId) event.quizId = quizMap.get(event.quizId.toString()) || event.quizId;
      await event.save({ session });
    }

    if (duplicateLessons.length) await Lesson.deleteMany({ _id: { $in: duplicateLessons }, ownerId: guestId }, { session });
    if (duplicateArticles.length) await Article.deleteMany({ _id: { $in: duplicateArticles }, ownerId: guestId }, { session });
    await GuestMigration.findOneAndUpdate(
      { guestId, userId },
      { $set: { status: 'completed', counts, migratedAt: new Date() } },
      { session },
    );
    return counts;
  }
}

export const guestMigrationService = new GuestMigrationService();
