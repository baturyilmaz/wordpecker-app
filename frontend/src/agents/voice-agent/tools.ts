import { tool } from '@openai/agents-realtime';
import { z } from 'zod';
import { apiService } from '../../services/api';
import { VoiceAgentContextData } from './types';

// Add word to list tool - enhanced for better learning assistance
export const createAddWordTool = (getContext: () => VoiceAgentContextData | null) => tool({
  name: 'add_word_to_list',
  description: 'Add a new TARGET LANGUAGE word to the current word list. CRITICAL: The word must be in the user\'s target language (the language they are learning), NOT their base language. Use this when the user agrees to add a target language word you suggested or when they encounter a new target language word they want to learn.',
  parameters: z.object({
    word: z.string().describe('The word to add to the list in the TARGET LANGUAGE (the language the user is learning) - should be a single word or short phrase'),
    meaning: z.string().describe('A clear, concise definition or meaning of the target language word explained in the user\'s BASE LANGUAGE (their native language)'),
  }),
  async execute({ word, meaning }) {
    try {
      const contextData = getContext();
      const listId = contextData?.listId;
      if (!listId) {
        return 'Error: No active word list found. Please make sure you have a word list selected.';
      }
      
      // Clean up the word (remove extra spaces, but preserve case for proper nouns)
      const cleanWord = word.trim();
      
      await apiService.addWord(listId, cleanWord, meaning);
      return `Excellent! I've successfully added the target language word "${cleanWord}" with the meaning "${meaning}" to your "${contextData?.listName}" list. Now you can practice using this word in our conversations!`;
    } catch (error) {
      console.error('Error adding word:', error);
      return `I encountered an issue while trying to add "${word}" to your list. This might be because the word already exists or there was a connection problem. Let's try again, or you can add it manually later.`;
    }
  },
});