import { configureOpenAIAgents } from './agents';
import { connectDB } from './config/mongodb';

let initializationPromise: Promise<void> | null = null;

export const initializeApplication = async (): Promise<void> => {
  if (!initializationPromise) {
    initializationPromise = Promise.all([
      configureOpenAIAgents(),
      connectDB(),
    ]).then(() => undefined);
  }

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
};
