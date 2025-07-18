import { z } from 'zod';
import mongoose from 'mongoose';

export const listIdSchema = {
  params: z.object({
    listId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid list ID')
  })
};