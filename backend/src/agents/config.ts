import 'dotenv/config';
import { setDefaultOpenAIKey } from '@openai/agents';

export function configureOpenAIAgents(): void {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  setDefaultOpenAIKey(apiKey);
}