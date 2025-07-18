import { z } from 'zod';
import mongoose from 'mongoose';

export const listIdSchema = {
  params: z.object({
    listId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid list ID')
  })
};

export const wordIdSchema = {
  params: z.object({
    wordId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid word ID')
  })
};

export const addWordSchema = {
  ...listIdSchema,
  body: z.object({
    word: z.string().min(1).trim(),
    meaning: z.string().optional()
  })
};

export const deleteWordSchema = {
  params: z.object({
    listId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid list ID'),
    wordId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid word ID')
  })
};

export const wordContextSchema = {
  ...wordIdSchema,
  body: z.object({
    contextIndex: z.number().min(0).default(0)
  })
};

export const validateAnswerSchema = {
  body: z.object({
    userAnswer: z.string().min(1),
    correctAnswer: z.string().min(1),
    context: z.string().optional()
  })
};