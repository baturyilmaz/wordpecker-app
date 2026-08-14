import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { ArticleError, articleErrorMessages } from './errors';
import { extractAndSaveArticle } from './article-service';
import { Article, IArticle } from './model';
import { getRequestOwnerId } from '../../utils/owner';
import { requireIdentity } from '../../middleware/auth';
import { eventDedupeKey, ProductEventService, productEventService } from '../product-events/service';
import { logRequestError } from '../../utils/request-log';

type ExtractArticle = typeof extractAndSaveArticle;

export const serializeArticle = (article: IArticle) => ({
  id: article._id.toString(),
  originalUrl: article.originalUrl,
  canonicalUrl: article.canonicalUrl,
  title: article.title,
  source: article.source,
  author: article.author,
  publishedAt: article.publishedAt?.toISOString(),
  language: article.language,
  wordCount: article.wordCount,
  excerpt: article.excerpt,
  content: article.content,
  status: article.status,
  createdAt: article.createdAt.toISOString(),
  updatedAt: article.updatedAt.toISOString(),
});

const sendArticleError = (req: Request, res: Response, error: unknown) => {
  if (error instanceof ArticleError) {
    return res.status(error.statusCode).json({ code: error.code, message: error.message });
  }
  logRequestError(req, 500, 'ARTICLE_UNAVAILABLE', error);
  return res.status(500).json({ code: 'ARTICLE_UNAVAILABLE', message: articleErrorMessages.ARTICLE_UNAVAILABLE });
};

export const createArticleRouter = (
  extractArticle: ExtractArticle = extractAndSaveArticle,
  events: ProductEventService = productEventService,
) => {
  const router = Router();
  router.use(requireIdentity);

  router.post('/extract', async (req, res) => {
    const ownerId = getRequestOwnerId(req)!;
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url) {
      return res.status(400).json({ code: 'INVALID_URL', message: articleErrorMessages.INVALID_URL });
    }

    try {
      const article = await extractArticle(url, ownerId);
      await events.record({
        identity: req.identity!,
        eventName: 'article_extracted',
        articleId: article._id.toString(),
        dedupeKey: eventDedupeKey(req.identity!, 'article_extracted', article._id.toString()),
        requestId: req.requestId,
      });
      return res.status(201).json(serializeArticle(article));
    } catch (error) {
      return sendArticleError(req, res, error);
    }
  });

  router.get('/:id', async (req, res) => {
    const ownerId = getRequestOwnerId(req)!;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ code: 'INVALID_ARTICLE_ID', message: 'Invalid article ID.' });
    }

    try {
      const article = await Article.findById(req.params.id);
      if (!article) return res.status(404).json({ code: 'ARTICLE_NOT_FOUND', message: 'Article not found.' });
      if (article.ownerId !== ownerId) {
        return res.status(403).json({ code: 'ARTICLE_FORBIDDEN', message: 'You do not have access to this article.' });
      }
      return res.json(serializeArticle(article));
    } catch (error) {
      logRequestError(req, 500, 'ARTICLE_UNAVAILABLE', error);
      return res.status(500).json({ code: 'ARTICLE_UNAVAILABLE', message: articleErrorMessages.ARTICLE_UNAVAILABLE });
    }
  });

  return router;
};

export default createArticleRouter();
