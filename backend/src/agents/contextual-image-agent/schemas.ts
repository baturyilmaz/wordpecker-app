import { z } from 'zod';

export const ContextualImageResult = z.object({
  searchQuery: z.string().describe('A concise search query (2-4 words) for finding relevant images'),
  enhancedContext: z.string().describe('An enhanced, detailed context description for vocabulary learning')
});

export type ContextualImageResultType = z.infer<typeof ContextualImageResult>;