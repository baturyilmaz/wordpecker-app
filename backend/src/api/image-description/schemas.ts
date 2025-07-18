import { z } from 'zod';
import mongoose from 'mongoose';

export const startExerciseSchema = {
  body: z.object({
    context: z.string().optional(),
    imageSource: z.enum(['ai', 'stock']).default('ai')
  })
};

export const submitDescriptionSchema = {
  body: z.object({
    context: z.string().optional(),
    imageUrl: z.string().url(),
    imageAlt: z.string().optional(),
    userDescription: z.string().min(10)
  })
};

export const addWordsSchema = {
  body: z.object({
    exerciseId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid exercise ID'),
    listId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid list ID').optional(),
    selectedWords: z.array(z.object({
      word: z.string().min(1),
      meaning: z.string().min(1)
    })),
    createNewList: z.boolean().optional()
  })
};

export const historyQuerySchema = {
  query: z.object({
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10')
  })
};