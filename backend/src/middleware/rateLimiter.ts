import rateLimit from 'express-rate-limit';
import { NextFunction, Request, Response } from 'express';

const rateLimitHandler = (code: string, message: string) => (request: Request, response: Response) => response.status(429).json({
  code,
  message,
  requestId: request.requestId,
});

// Default rate limiter for general endpoints
export const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for authentication-related endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: rateLimitHandler('AUTH_RATE_LIMITED', 'Too many sign-in attempts. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for learning-related endpoints (quiz, learn)
export const learningRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // Limit each IP to 200 requests per hour
  message: 'You have exceeded the learning requests limit. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for list management
export const listManagementRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 list operations per hour
  message: 'Too many list operations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter specifically for OpenAI-powered routes (learning and quiz)
export const openaiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 OpenAI requests per hour
  message: 'Too many AI-powered requests. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const articleFetchRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  handler: rateLimitHandler('ARTICLE_RATE_LIMITED', 'Too many article requests. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

export const lessonGenerationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  handler: rateLimitHandler('LESSON_RATE_LIMITED', 'Too many lesson generation requests. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

export const createConcurrencyLimiter = (maxConcurrent = 2) => {
  const activeByOwner = new Map<string, number>();
  return (request: Request, response: Response, next: NextFunction) => {
    const key = request.identity?.ownerId || request.ip || request.socket.remoteAddress || 'unknown';
    const active = activeByOwner.get(key) || 0;
    if (active >= maxConcurrent) {
      return response.status(429).json({
        code: 'LESSON_CONCURRENCY_LIMITED',
        message: 'Another lesson is still being generated. Please wait and try again.',
        requestId: request.requestId,
      });
    }
    activeByOwner.set(key, active + 1);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      const remaining = (activeByOwner.get(key) || 1) - 1;
      if (remaining > 0) activeByOwner.set(key, remaining);
      else activeByOwner.delete(key);
    };
    response.once('finish', release);
    response.once('close', release);
    return next();
  };
};

export const lessonGenerationConcurrencyLimiter = createConcurrencyLimiter();
