declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      NODE_ENV: 'development' | 'production' | 'test';
      OPENAI_API_KEY: string;
      OPENAI_BASE_URL?: string;
      OPENAI_MODEL: string;
      MONGODB_URL: string;
    }
  }
}

export {};
