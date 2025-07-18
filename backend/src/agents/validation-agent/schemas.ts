import { z } from 'zod';

export const ValidationResult = z.object({
  isValid: z.boolean().describe('Whether the answer is correct'),
  explanation: z.string().nullable().describe('Explanation for the validation result')
});

export type ValidationResultType = z.infer<typeof ValidationResult>;