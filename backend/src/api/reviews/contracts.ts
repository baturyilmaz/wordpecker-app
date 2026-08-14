import { z } from 'zod';

export const ReviewRatingSchema = z.object({ rating: z.enum(['forgot', 'unsure', 'remembered']) });
