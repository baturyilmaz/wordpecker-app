import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { environment } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import {
  articleFetchRateLimiter,
  authRateLimiter,
  lessonGenerationConcurrencyLimiter,
  lessonGenerationRateLimiter,
  openaiRateLimiter,
} from './middleware/rateLimiter';
import mongoose from 'mongoose';

// Import routes
import listRoutes from './api/lists/routes';
import wordRoutes from './api/words/routes';
import learnRoutes from './api/learn/routes';
import quizRoutes from './api/quiz/routes';
import templateRoutes from './api/templates/routes';
import preferencesRoutes from './api/preferences/routes';
import imageDescriptionRoutes from './api/image-description/routes';
import langsiftVocabularyRoutes from './api/vocabulary/routes';
import legacyVocabularyRoutes from './api/legacy-vocabulary/routes';
import languageValidationRoutes from './api/language-validation/routes';
import audioRoutes from './api/audio/routes';
import voiceRoutes from './api/voice/routes';
import articleRoutes from './api/articles/routes';
import lessonRoutes from './api/lessons/routes';
import lessonQuizRoutes from './api/lesson-quizzes/routes';
import reviewRoutes from './api/reviews/routes';
import authRoutes from './api/auth/routes';
import dashboardRoutes from './api/dashboard/routes';
import { optionalAuth, protectAuthenticatedMutation } from './middleware/auth';
import { requestContext } from './middleware/request-context';

const app = express();

if (environment.trustProxyHops > 0) app.set('trust proxy', environment.trustProxyHops);

// Global middleware
app.use(helmet());
app.use(requestContext);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || origin === environment.frontendUrl),
  credentials: true,
}));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(optionalAuth);
app.use(protectAuthenticatedMutation);

app.get('/api/health', (_request, response) => {
  if (mongoose.connection.readyState !== 1) return response.status(503).json({ status: 'unavailable' });
  return response.json({ status: 'ok' });
});

// Apply rate limiter only to OpenAI-powered routes
app.use('/api/learn', openaiRateLimiter);
app.use('/api/quiz', openaiRateLimiter);
app.use('/api/describe', openaiRateLimiter);
app.use('/api/legacy/vocabulary', openaiRateLimiter);
app.use('/api/language-validation', openaiRateLimiter);
app.use('/api/audio', openaiRateLimiter); // Audio routes use ElevenLabs API
app.use('/api/voice', openaiRateLimiter); // Voice routes use OpenAI Realtime API
app.post('/api/lists/:listId/words', openaiRateLimiter);
app.post('/api/lists/validate-answer', openaiRateLimiter);
app.post('/api/lists/word/:wordId/sentences', openaiRateLimiter);
app.post('/api/articles/extract', articleFetchRateLimiter);
app.post('/api/lessons', lessonGenerationRateLimiter, lessonGenerationConcurrencyLimiter);
app.post('/api/auth/google', authRateLimiter);

// Routes
app.use('/api/lists', listRoutes);
app.use('/api/lists', wordRoutes);
app.use('/api/learn', learnRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/describe', imageDescriptionRoutes);
app.use('/api/vocabulary', langsiftVocabularyRoutes);
app.use('/api/legacy/vocabulary', legacyVocabularyRoutes);
app.use('/api/language-validation', languageValidationRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/lesson-quizzes', lessonQuizRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use(errorHandler);

export default app;
