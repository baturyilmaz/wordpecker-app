import { z } from 'zod';

export const VocabularyRecommendation = z.object({
  word: z.string().describe('The recommended vocabulary word'),
  meaning: z.string().describe('Definition in base language'),
  example: z.string().describe('Example sentence in target language'),
  difficulty_level: z.enum(['basic', 'intermediate', 'advanced']).describe('Word difficulty level')
});

export const ImageAnalysisResult = z.object({
  corrected_description: z.string().describe('Grammar-corrected version of user description'),
  feedback: z.string().describe('Encouraging and constructive feedback'),
  recommendations: z.array(VocabularyRecommendation).min(5).max(20).describe('Relevant vocabulary words that would enhance description'),
  user_strengths: z.array(z.string()).describe('What the user did well in their description'),
  missed_concepts: z.array(z.string()).describe('Important elements or concepts they missed')
});

export type ImageAnalysisResultType = z.infer<typeof ImageAnalysisResult>;