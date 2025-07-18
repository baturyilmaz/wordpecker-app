import { z } from 'zod';
import { run } from '@openai/agents';
import { contextualImageAgent } from '../../agents';
import { ContextualImageResultType } from '../../agents/contextual-image-agent/schemas';


// User-based image tracking to avoid duplicates within sessions
const userImageHistory = new Map<string, { images: Set<string>, lastAccess: number }>();

// Clean up inactive user sessions periodically (24 hours)
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of userImageHistory) {
    if (now - data.lastAccess > 24 * 60 * 60 * 1000) { // 24 hours
      userImageHistory.delete(userId);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

export const StockPhotoResult = z.object({
  id: z.string().describe('Unique identifier for the stock photo'),
  url: z.string().describe('Direct URL to the stock photo'),
  alt_description: z.string().describe('Alternative text description of the photo'),
  description: z.string().describe('Detailed description of the photo content'),
  prompt: z.string().describe('The search query used to find the photo'),
  source: z.literal('pexels').describe('Source of the image - Pexels stock photo')
});

export type StockPhotoResultType = z.infer<typeof StockPhotoResult>;

export class StockPhotoService {
  async findStockImage(context: string, sessionId?: string): Promise<StockPhotoResultType> {
    try {
      // Create search query for Pexels using contextual agent
      const contextResult = await run(contextualImageAgent, `Generate a search query for stock photos based on this context: ${context}`);
      const contextualResult = contextResult.finalOutput as ContextualImageResultType;
      const searchQuery = contextualResult.searchQuery || context;
      console.log('🔍 Pexels search query:', searchQuery);
      
      // Get images from Pexels search API
      const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=15`, {
        headers: {
          'Authorization': process.env.PEXELS_API_KEY || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if any photos were found
      if (!data.photos || data.photos.length === 0) {
        throw new Error('No matching photos found');
      }

      // Get user history if available
      const userData = sessionId ? userImageHistory.get(sessionId) : null;
      const usedImages = userData ? userData.images : new Set();
      
      // Filter out already used images
      const availablePhotos = data.photos.filter((photo: any) => !usedImages.has(photo.src.large));
      
      // If all images have been used, allow reusing them but prefer unused ones
      const photosToChooseFrom = availablePhotos.length > 0 ? availablePhotos : data.photos;
      
      // Pick a random photo from available photos
      const randomIndex = Math.floor(Math.random() * photosToChooseFrom.length);
      const randomPhoto = photosToChooseFrom[randomIndex];
      
      // Track this image for the user session if sessionId provided
      if (sessionId) {
        if (!userImageHistory.has(sessionId)) {
          userImageHistory.set(sessionId, { images: new Set(), lastAccess: Date.now() });
        }
        const userData = userImageHistory.get(sessionId)!;
        userData.images.add(randomPhoto.src.large);
        userData.lastAccess = Date.now();
      }
      
      // Generate ID and descriptions
      const imageId = `pexels_${Date.now()}_${randomPhoto.id}`;
      
      return {
        id: imageId,
        url: randomPhoto.src.large,
        alt_description: randomPhoto.alt || `A photograph related to ${context}`,
        description: `Stock photograph from Pexels depicting ${context} with rich vocabulary opportunities`,
        prompt: searchQuery,
        source: 'pexels' as const
      };
    } catch (error) {
      console.error('Error fetching stock image from Pexels:', error);
      throw new Error(`Failed to find stock image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}

export const stockPhotoService = new StockPhotoService();