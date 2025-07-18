import { z } from 'zod';

export const ReadingResult = z.object({
  title: z.string().describe('Title of the reading passage'),
  text: z.string().describe('The reading passage text'),
  highlighted_words: z.array(z.object({
    word: z.string().describe('The vocabulary word used in the passage'),
    definition: z.string().describe('Definition in base language'),
    position: z.number().nullable().describe('Position in text where word appears (null if not applicable)')
  })).describe('Vocabulary words with their definitions'),
  word_count: z.number().describe('Total word count of the passage'),
  difficulty_level: z.string().describe('Reading difficulty level'),
  theme: z.string().describe('Main theme or topic of the passage')
});

export type ReadingResultType = z.infer<typeof ReadingResult>;