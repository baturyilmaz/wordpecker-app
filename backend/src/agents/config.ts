import 'dotenv/config';
import OpenAI from 'openai';

export async function configureOpenAIAgents(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  try {
    const { setDefaultOpenAIClient, setDefaultOpenAIKey, setTracingDisabled } = await import('@openai/agents');
    setDefaultOpenAIKey(apiKey);
    const openAIClient = new OpenAI({
      apiKey,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
    // The app and the early Agents SDK pin different OpenAI type versions,
    // although both expose the same runtime client interface used here.
    setDefaultOpenAIClient(
      openAIClient as unknown as Parameters<typeof setDefaultOpenAIClient>[0],
    );
    // Relay credentials cannot export traces to OpenAI's tracing endpoint.
    setTracingDisabled(true);
  } catch (error) {
    console.error('Error loading @openai/agents.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    process.exit(1);
  }
}
