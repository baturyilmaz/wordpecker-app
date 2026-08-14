import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'OPENAI_MODEL', 'MONGODB_URL'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const environment = {
  port: process.env.PORT || 3100,
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: process.env.OPENAI_API_KEY!,
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
  openaiModel: process.env.OPENAI_MODEL!,
  mongodbUrl: process.env.MONGODB_URL!
} as const;
