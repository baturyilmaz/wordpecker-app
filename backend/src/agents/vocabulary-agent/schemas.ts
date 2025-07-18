import { z } from 'zod';

export const VocabularyWord = z.object({
  word: z.string().describe('The vocabulary word'),
  meaning: z.string().describe('Definition in base language'),
  example: z.string().describe('Example sentence in target language'),
  difficulty_level: z.enum(['basic', 'intermediate', 'advanced']).describe('Word difficulty'),
  context: z.string().nullable().describe('Context where word is relevant (null if not applicable)')
});

export const VocabularyResult = z.object({
  words: z.array(VocabularyWord).describe('Array of vocabulary words')
});

export type VocabularyResultType = z.infer<typeof VocabularyResult>;
export type VocabularyWordType = z.infer<typeof VocabularyWord>;