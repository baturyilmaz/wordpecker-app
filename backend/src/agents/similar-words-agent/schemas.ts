import { z } from 'zod';

export const SimilarWord = z.object({
  word: z.string().describe('The similar word'),
  definition: z.string().describe('Definition in base language'),
  example: z.string().describe('Example sentence in target language'),
  usage_note: z.string().describe('When to use this word vs the original')
});

export const SimilarWordsResult = z.object({
  synonyms: z.array(SimilarWord).describe('Words with very similar meanings'),
  interchangeable_words: z.array(SimilarWord).describe('Words that can be used in similar contexts but may not be exact synonyms')
});

export type SimilarWordType = z.infer<typeof SimilarWord>;
export type SimilarWordsResultType = z.infer<typeof SimilarWordsResult>;