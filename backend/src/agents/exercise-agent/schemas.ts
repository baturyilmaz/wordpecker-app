import { z } from 'zod';

export const Exercise = z.object({
  type: z.enum(['multiple_choice', 'fill_blank', 'true_false', 'sentence_completion', 'matching']),
  word: z.string().describe('The target word'),
  question: z.string().describe('The exercise question'),
  options: z.array(z.string()).nullable().describe('Answer options for multiple choice (null if not applicable)'),
  optionLabels: z.array(z.string()).nullable().describe('Labels for options (null if not applicable)'),
  correctAnswer: z.string().describe('The correct answer'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Exercise difficulty'),
  hint: z.string().nullable().describe('Optional hint (null if not applicable)'),
  feedback: z.string().nullable().describe('Feedback after answering (null if not applicable)'),
  // For matching questions
  pairs: z.array(z.object({
    word: z.string().describe('Word to match'),
    definition: z.string().describe('Definition to match with')
  })).nullable().describe('Pairs of words and definitions for matching questions (null if not applicable)')
});

export const ExerciseResult = z.object({
  exercises: z.array(Exercise).describe('Array of learning exercises')
});

export type ExerciseResultType = z.infer<typeof ExerciseResult>;
export type ExerciseType = z.infer<typeof Exercise>;

// Type for exercises with wordId added after generation
export type ExerciseWithId = ExerciseType & { wordId: string | null };