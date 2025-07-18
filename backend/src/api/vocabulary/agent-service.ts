import { run } from '@openai/agents';
import { vocabularyAgent } from '../../agents';
import { VocabularyResultType, VocabularyWordType } from '../../agents/vocabulary-agent/schemas';

export class VocabularyAgentService {
  async generateWords(count: number, difficulty: string, context: string, baseLanguage: string, targetLanguage: string, excludeWords: string[]): Promise<VocabularyWordType[]> {
    const prompt = `Generate ${count} ${difficulty}-level vocabulary words for the context "${context}". Generate words in ${targetLanguage} with definitions in ${baseLanguage}. Exclude these words: ${excludeWords.join(', ')}.`;
    const response = await run(vocabularyAgent, prompt);
    const result = response.finalOutput as VocabularyResultType;
    return result.words;
  }

  async getWordDetails(word: string, context: string, baseLanguage: string, targetLanguage: string): Promise<VocabularyWordType> {
    const prompt = `Provide detailed information about the word "${word}" in the context of "${context}". The word is in ${targetLanguage} and the definition should be in ${baseLanguage}. The example sentence must be in ${targetLanguage}.`;
    const response = await run(vocabularyAgent, prompt);
    const result = response.finalOutput as VocabularyResultType;
    return result.words[0]; // Get first word from response
  }
}

export const vocabularyAgentService = new VocabularyAgentService();