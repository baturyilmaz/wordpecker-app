import { z } from 'zod';
import mongoose from 'mongoose';

export const listIdSchema = {
  params: z.object({
    listId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid list ID')
  })
};

export const updatePointsSchema = {
  ...listIdSchema,
  body: z.object({
    results: z.array(z.object({
      wordId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid word ID'),
      correct: z.boolean()
    }))
  })
};