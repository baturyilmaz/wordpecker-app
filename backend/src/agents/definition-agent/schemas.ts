import { z } from 'zod';

export const DefinitionResult = z.object({
  definition: z.string().describe('Clear, concise definition of the word')
});

export type DefinitionResultType = z.infer<typeof DefinitionResult>;