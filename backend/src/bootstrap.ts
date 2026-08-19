import { configureOpenAIAgents } from './agents';
import { connectDB } from './config/mongodb';

let agentConfigurationPromise: Promise<void> | null = null;

const configureAgentsOnce = async (): Promise<void> => {
  if (!agentConfigurationPromise) agentConfigurationPromise = configureOpenAIAgents();
  try {
    await agentConfigurationPromise;
  } catch (error) {
    agentConfigurationPromise = null;
    throw error;
  }
};

export const initializeApplication = async (): Promise<void> => {
  await Promise.all([configureAgentsOnce(), connectDB()]);
};
