import { InteractionBodySchema } from './contracts';
import { LessonError, lessonErrorMessages } from './errors';
import { LessonInteraction, ILessonInteraction } from './interaction-model';
import { LessonService, lessonService } from './service';
import { VocabularyService, vocabularyService } from '../vocabulary/service';

export class LessonInteractionService {
  constructor(
    private readonly lessons: LessonService = lessonService,
    private readonly vocabulary: Pick<VocabularyService, 'ensureReviewState'> = vocabularyService,
  ) {}

  async list(ownerId: string, lessonId: string): Promise<ILessonInteraction[]> {
    await this.lessons.getOwned(ownerId, lessonId);
    return LessonInteraction.find({ ownerId, lessonId }).lean() as unknown as ILessonInteraction[];
  }

  async update(
    ownerId: string,
    lessonId: string,
    itemId: string,
    input: unknown,
  ): Promise<ILessonInteraction> {
    const parsed = InteractionBodySchema.safeParse(input);
    if (!parsed.success) {
      throw new LessonError('INVALID_INTERACTION', lessonErrorMessages.INVALID_INTERACTION);
    }

    const lesson = await this.lessons.getOwned(ownerId, lessonId);
    const item = lesson.items.id(itemId);
    if (!item) throw new LessonError('INVALID_INTERACTION', lessonErrorMessages.INVALID_INTERACTION);

    const update: Record<string, unknown> = {};
    if (parsed.data.knowledgeStatus !== undefined) update.knowledgeStatus = parsed.data.knowledgeStatus;
    if (parsed.data.saved !== undefined) update.saved = parsed.data.saved;

    const interaction = await LessonInteraction.findOneAndUpdate(
      { ownerId, lessonId: lesson._id, lessonItemId: item._id },
      {
        $set: update,
        $setOnInsert: {
          ownerId,
          lessonId: lesson._id,
          lessonItemId: item._id,
          articleId: lesson.articleId,
          term: item.term,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!interaction) throw new LessonError('INVALID_INTERACTION', lessonErrorMessages.INVALID_INTERACTION);
    if (interaction.knowledgeStatus === 'unknown' || interaction.saved) {
      await this.vocabulary.ensureReviewState(ownerId, interaction.term);
    }
    return interaction;
  }
}

export const lessonInteractionService = new LessonInteractionService();
