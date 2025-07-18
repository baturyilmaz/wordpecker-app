import { run } from '@openai/agents';
import { imageAnalysisAgent, imageGenerationAgent, contextualImageAgent } from '../../agents';
import { ImageGenerationResultType } from '../../agents/image-generation-agent/schemas';
import { ImageAnalysisResultType } from '../../agents/image-analysis-agent/schemas';
import { ContextualImageResultType } from '../../agents/contextual-image-agent/schemas';


export class ImageDescriptionAgentService {
  async generateContext(): Promise<string> {
    const topics = [
      'business meetings', 'cooking recipes', 'space exploration', 'medieval history', 'street market',
      'art gallery', 'ocean wildlife', 'mountain hiking', 'city nightlife', 'farm animals',
      'technology trends', 'fashion design', 'sports events', 'music festival', 'library study',
      'beach vacation', 'winter sports', 'garden plants', 'car mechanics', 'hospital care',
      'restaurant dining', 'school classroom', 'airport travel', 'construction site', 'wedding ceremony',
      'scientific research', 'cultural festival', 'fitness gym', 'pet care', 'home renovation',
      'photography studio', 'dance performance', 'board games', 'camping trip', 'coffee shop',
      'weather patterns', 'ancient civilizations', 'modern architecture', 'wildlife safari', 'theater production'
    ];
    
    // Add randomness with current time to ensure different results
    const randomSeed = Date.now() + Math.random();
    const randomIndex = Math.floor(randomSeed % topics.length);
    const selectedTopic = topics[randomIndex];
    
    const prompt = `Generate a vocabulary learning context similar to "${selectedTopic}" but different. Create a simple, clear topic (2-4 words maximum). Be creative and avoid repeating the same topics.`;
    const response = await run(contextualImageAgent, prompt);
    const result = response.finalOutput as ContextualImageResultType;
    return result.searchQuery || result.enhancedContext || selectedTopic;
  }

  async generateAIImage(context: string, sessionId: string): Promise<ImageGenerationResultType> {
    const imagePrompt = `Generate an AI image for the context "${context}" with session ID ${sessionId}`;
    const imageResponse = await run(imageGenerationAgent, imagePrompt);
    return imageResponse.finalOutput as ImageGenerationResultType;
  }

  async analyzeDescription(userDescription: string, imageUrl: string, context: string, baseLanguage: string, targetLanguage: string): Promise<ImageAnalysisResultType> {
    const analysisPrompt = `Analyze this image and user description:

User Description: "${userDescription.trim()}"
Context: ${context}
Base Language: ${baseLanguage}
Target Language: ${targetLanguage}

Examine the image carefully and provide vocabulary improvement suggestions.`;
    
    const analysis = await run(imageAnalysisAgent, [
      { 
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: analysisPrompt },
          { type: 'input_image', image: imageUrl }
        ]
      }
    ]);
    return analysis.finalOutput as ImageAnalysisResultType;
  }
}

export const imageDescriptionAgentService = new ImageDescriptionAgentService();