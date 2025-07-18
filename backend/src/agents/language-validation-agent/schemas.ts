import { z } from 'zod';

export const LanguageParameter = z.object({
  type: z.enum(['script', 'dialect', 'formality', 'region', 'learning_focus']).describe('Type of language parameter'),
  value: z.string().describe('The parameter value'),
  description: z.string().describe('Human-readable description of what this parameter means')
});

export const LanguageValidationResult = z.object({
  isValid: z.boolean().describe('Whether the language name is valid'),
  languageCode: z.string().nullable().describe('The standardized language code (e.g., "en", "tr", "es") if valid'),
  standardizedName: z.string().nullable().describe('The standardized language name (e.g., "English", "Turkish", "Spanish") if valid'),
  parameters: z.array(LanguageParameter).nullable().describe('Additional language parameters like script, dialect, etc.'),
  explanation: z.string().nullable().describe('Explanation for the validation result or suggestions for corrections')
});

export type LanguageValidationResultType = z.infer<typeof LanguageValidationResult>;
export type LanguageParameterType = z.infer<typeof LanguageParameter>;