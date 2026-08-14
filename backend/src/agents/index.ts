import { configureOpenAIAgents as configureProvider } from './config';
import { environment } from '../config/environment';
import { definitionAgent } from './definition-agent';
import { vocabularyAgent } from './vocabulary-agent';
import { exerciseAgent } from './exercise-agent';
import { quizAgent } from './quiz-agent';
import { validationAgent } from './validation-agent';
import { examplesAgent } from './examples-agent';
import { similarWordsAgent } from './similar-words-agent';
import { readingAgent } from './reading-agent';
import { languageValidationAgent } from './language-validation-agent';
import { imageAnalysisAgent } from './image-analysis-agent';
import { imageGenerationAgent } from './image-generation-agent';
import { contextualImageAgent } from './contextual-image-agent';
import { lessonAgent } from './lesson-agent';
import { lessonRefillAgent } from './lesson-refill-agent';

const agents = [
  definitionAgent,
  vocabularyAgent,
  exerciseAgent,
  quizAgent,
  validationAgent,
  examplesAgent,
  similarWordsAgent,
  readingAgent,
  languageValidationAgent,
  imageAnalysisAgent,
  imageGenerationAgent,
  contextualImageAgent,
  lessonAgent,
  lessonRefillAgent,
];

export const configureOpenAIAgents = async (): Promise<void> => {
  for (const agent of agents) agent.model = environment.openaiModel;
  await configureProvider();
};

export {
  definitionAgent,
  vocabularyAgent,
  exerciseAgent,
  quizAgent,
  validationAgent,
  examplesAgent,
  similarWordsAgent,
  readingAgent,
  languageValidationAgent,
  imageAnalysisAgent,
  imageGenerationAgent,
  contextualImageAgent,
  lessonAgent,
  lessonRefillAgent,
};
