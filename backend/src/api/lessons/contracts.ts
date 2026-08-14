import { z } from 'zod';

export const lessonLevels = ['basic', 'intermediate', 'upper_intermediate', 'advanced'] as const;
export const LessonLevelSchema = z.enum(lessonLevels);
export type LessonLevel = z.infer<typeof LessonLevelSchema>;

export const LessonItemOutputSchema = z.object({
  type: z.enum(['word', 'phrase']),
  term: z.string().trim().min(1),
  meaningZh: z.string().trim().min(1),
  contextSentence: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  exampleSentence: z.string().trim().min(1),
  importanceReason: z.string().trim().min(1).nullable(),
  difficulty: LessonLevelSchema.nullable(),
});

export const LessonOverviewSchema = z.object({
  summary: z.string().trim().min(1),
  difficulty: LessonLevelSchema,
  learningFocus: z.string().trim().min(1),
});

export const LessonInitialOutputSchema = LessonOverviewSchema.extend({
  // The prompt target is 12–15, but accepting 8+ here lets orchestration
  // salvage an under-target response instead of discarding usable items.
  items: z.array(LessonItemOutputSchema).min(8).max(15)
    .refine((items) => new Set(items.map((item) => item.term.toLocaleLowerCase())).size === items.length, {
      message: 'Lesson terms must be unique',
    }),
});

export const LessonRefillOutputSchema = z.object({
  items: z.array(LessonItemOutputSchema).min(1).max(10)
    .refine((items) => new Set(items.map((item) => item.term.toLocaleLowerCase())).size === items.length, {
      message: 'Lesson terms must be unique',
    }),
});

export const LessonGenerationOutputSchema = LessonOverviewSchema.extend({
  items: z.array(LessonItemOutputSchema).min(5).max(15)
    .refine((items) => new Set(items.map((item) => item.term.toLocaleLowerCase())).size === items.length, {
      message: 'Lesson terms must be unique',
    }),
});

export const CreateLessonBodySchema = z.object({
  articleId: z.string().trim().min(1),
  level: LessonLevelSchema,
});

export const InteractionBodySchema = z.object({
  knowledgeStatus: z.enum(['unset', 'known', 'unknown']).optional(),
  saved: z.boolean().optional(),
}).refine((body) => body.knowledgeStatus !== undefined || body.saved !== undefined, {
  message: 'At least one interaction field is required',
});

export type LessonGenerationOutput = z.infer<typeof LessonGenerationOutputSchema>;
export type LessonInitialOutput = z.infer<typeof LessonInitialOutputSchema>;
export type LessonRefillOutput = z.infer<typeof LessonRefillOutputSchema>;
export type LessonItemOutput = z.infer<typeof LessonItemOutputSchema>;
