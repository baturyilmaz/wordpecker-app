import { z } from 'zod';

export const updatePreferencesSchema = {
  body: z.object({
    exerciseTypes: z.object({
      multiple_choice: z.boolean().optional(),
      fill_blank: z.boolean().optional(),
      matching: z.boolean().optional(),
      true_false: z.boolean().optional(),
      sentence_completion: z.boolean().optional()
    }).optional(),
    baseLanguage: z.string().optional(),
    targetLanguage: z.string().optional()
  })
};