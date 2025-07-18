import { z } from 'zod';

export const ImageGenerationResult = z.object({
  id: z.string().describe('Unique identifier for the generated AI image'),
  url: z.string().describe('Direct URL to the generated image'),
  alt_description: z.string().describe('Alternative text description of the image'),
  description: z.string().describe('Detailed description of the image content'),
  prompt: z.string().describe('The enhanced prompt used to generate the image'),
  source: z.literal('dall-e').describe('Source of the image - AI generated via DALL-E')
});

export type ImageGenerationResultType = z.infer<typeof ImageGenerationResult>;