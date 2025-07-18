import { z } from 'zod';

export const generateWordsSchema = {
  body: z.object({
    context: z.string().min(1),
    count: z.number().min(1).max(20).default(10),
    difficulty: z.enum(['basic', 'intermediate', 'advanced']).default('intermediate')
  })
};

export const getWordDetailsSchema = {
  body: z.object({
    word: z.string().min(1),
    context: z.string().min(1)
  })
};