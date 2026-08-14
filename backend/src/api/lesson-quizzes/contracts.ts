import { z } from 'zod';

export const CreateQuizBodySchema = z.object({ lessonId: z.string().trim().min(1) });
export const QuizAnswerBodySchema = z.object({ answer: z.string().trim().min(1).max(500) });
