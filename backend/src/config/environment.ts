import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'OPENAI_MODEL', 'MONGODB_URL'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const validateProductionEnvironment = (values: {
  nodeEnv?: string;
  googleClientId?: string;
  frontendUrl?: string;
  sessionDays?: number;
}) => {
  if (values.nodeEnv !== 'production') return;
  if (!values.googleClientId) throw new Error('GOOGLE_CLIENT_ID is required in production.');
  if (!values.frontendUrl?.startsWith('https://')) throw new Error('FRONTEND_URL must use HTTPS in production.');
  if (!Number.isFinite(values.sessionDays) || (values.sessionDays || 0) < 1 || (values.sessionDays || 0) > 90) {
    throw new Error('SESSION_DAYS must be between 1 and 90.');
  }
};

const nodeEnv = process.env.NODE_ENV || 'development';
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const sessionDays = Number(process.env.SESSION_DAYS || 30);

validateProductionEnvironment({ nodeEnv, googleClientId, frontendUrl, sessionDays });

export const environment = {
  port: process.env.PORT || 3100,
  nodeEnv,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
  openaiModel: process.env.OPENAI_MODEL!,
  mongodbUrl: process.env.MONGODB_URL!,
  googleClientId,
  frontendUrl,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'langsift_session',
  sessionDays,
  trustProxyHops: Math.max(0, Number(process.env.TRUST_PROXY_HOPS || 0)),
} as const;
