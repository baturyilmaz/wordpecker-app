import { run } from '@openai/agents';
import { 
  definitionAgent, 
  validationAgent, 
  examplesAgent, 
  similarWordsAgent, 
  readingAgent 
} from '../../agents';
import { DefinitionResultType } from '../../agents/definition-agent/schemas';
import { ValidationResultType } from '../../agents/validation-agent/schemas';
import { ExamplesResultType, SentenceExampleType } from '../../agents/examples-agent/schemas';
import { SimilarWordsResultType } from '../../agents/similar-words-agent/schemas';
import { ReadingResultType } from '../../agents/reading-agent/schemas';

export class WordAgentService {
  async generateDefinition(word: string, context: string, baseLanguage: string, targetLanguage: string): Promise<string> {
    const prompt = `Generate a clear definition for the word "${word}" in the context of "${context}". The word is in ${targetLanguage} and the definition should be in ${baseLanguage}.`;
    const response = await run(definitionAgent, prompt);
    const result = response.finalOutput as DefinitionResultType;
    return result.definition;
  }

  async validateAnswer(userAnswer: string, correctAnswer: string, context: string, baseLanguage: string, targetLanguage: string): Promise<ValidationResultType> {
    const prompt = `Validate if the user's answer "${userAnswer}" is correct for the expected answer "${correctAnswer}". Context: ${context || 'General language exercise'}. User speaks ${baseLanguage} and is learning ${targetLanguage}.`;
    const result = await run(validationAgent, prompt);
    return result.finalOutput as ValidationResultType;
  }

  async generateExamples(word: string, meaning: string, context: string, baseLanguage: string, targetLanguage: string): Promise<SentenceExampleType[]> {
    const prompt = `Generate 3-5 sentence examples for the word "${word}" with meaning "${meaning}" in the context of "${context}". Examples should be in ${targetLanguage} with explanations in ${baseLanguage}.`;
    const response = await run(examplesAgent, prompt);
    const result = response.finalOutput as ExamplesResultType;
    return result.examples;
  }

  async generateSimilarWords(word: string, meaning: string, context: string, baseLanguage: string, targetLanguage: string): Promise<SimilarWordsResultType> {
    const prompt = `Find similar words and synonyms for the word "${word}" with meaning "${meaning}" in the context of "${context}". Find words in ${targetLanguage} with definitions in ${baseLanguage}.`;
    const similarWords = await run(similarWordsAgent, prompt);
    return similarWords.finalOutput as SimilarWordsResultType;
  }

  async generateLightReading(words: Array<{value: string, meaning: string}>, context: string, baseLanguage: string, targetLanguage: string): Promise<ReadingResultType> {
    const prompt = `Create an intermediate-level reading passage in ${targetLanguage} that incorporates these vocabulary words: ${words.map(w => `${w.value} (${w.meaning})`).join(', ')}. Context: "${context}". The passage should be suitable for ${baseLanguage} speakers learning ${targetLanguage}.`;
    const reading = await run(readingAgent, prompt);
    return reading.finalOutput as ReadingResultType;
  }
}

export const wordAgentService = new WordAgentService();