import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { environment } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { openaiRateLimiter } from './middleware/rateLimiter';
import { connectDB } from './config/mongodb';
import { configureOpenAIAgents } from './agents';

// Import routes
import listRoutes from './api/lists/routes';
import wordRoutes from './api/words/routes';
import learnRoutes from './api/learn/routes';
import quizRoutes from './api/quiz/routes';
import templateRoutes from './api/templates/routes';
import preferencesRoutes from './api/preferences/routes';
import imageDescriptionRoutes from './api/image-description/routes';
import vocabularyRoutes from './api/vocabulary/routes';
import languageValidationRoutes from './api/language-validation/routes';
import audioRoutes from './api/audio/routes';
import voiceRoutes from './api/voice/routes';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Apply rate limiter only to OpenAI-powered routes
app.use('/api/learn', openaiRateLimiter);
app.use('/api/quiz', openaiRateLimiter);
app.use('/api/describe', openaiRateLimiter);
app.use('/api/vocabulary', openaiRateLimiter);
app.use('/api/language-validation', openaiRateLimiter);
app.use('/api/audio', openaiRateLimiter); // Audio routes use ElevenLabs API
app.use('/api/voice', openaiRateLimiter); // Voice routes use OpenAI Realtime API

// Routes
app.use('/api/lists', listRoutes);
app.use('/api/lists', wordRoutes);
app.use('/api/learn', learnRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/describe', imageDescriptionRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/language-validation', languageValidationRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/voice', voiceRoutes);

// Error handling
app.use(errorHandler);

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = environment.port;
  
  // Configure OpenAI agents
  configureOpenAIAgents();
  
  // Connect to MongoDB and start server
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${environment.nodeEnv} mode`);
    });
  });
}

export default app; 