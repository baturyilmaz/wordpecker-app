import { Request, Response, Router } from 'express';
import { getRequestOwnerId } from '../../utils/owner';
import { VocabularyError } from './errors';
import { VocabularyEntry, VocabularyService, vocabularyService } from './service';
import { requireAuth } from '../../middleware/auth';
import { eventDedupeKey, ProductEventService, productEventService, utcDay } from '../product-events/service';
import { logRequestError } from '../../utils/request-log';

const serialize = (entry: VocabularyEntry) => ({
  ...entry,
  review: {
    ...entry.review,
    nextReviewAt: entry.review.nextReviewAt.toISOString(),
    lastReviewedAt: entry.review.lastReviewedAt?.toISOString(),
  },
  occurrences: entry.occurrences.map((occurrence) => ({ ...occurrence, firstSeenAt: occurrence.firstSeenAt.toISOString() })),
});

const sendError = (request: Request, response: Response, error: unknown) => {
  if (error instanceof VocabularyError) return response.status(error.statusCode).json({ code: error.code, message: error.message });
  logRequestError(request, 500, 'SERVER_ERROR', error);
  return response.status(500).json({ code: 'SERVER_ERROR', message: 'We could not load vocabulary.' });
};

export const createVocabularyRouter = (
  service: VocabularyService = vocabularyService,
  events: ProductEventService = productEventService,
) => {
  const router = Router();
  router.use(requireAuth);
  router.get('/', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    const candidate = typeof req.query.filter === 'string' ? req.query.filter : 'all';
    const filter = ['all', 'unknown', 'saved', 'due'].includes(candidate) ? candidate as 'all' | 'unknown' | 'saved' | 'due' : 'all';
    try {
      const items = (await service.list(ownerId, filter)).map(serialize);
      if (filter === 'all') {
        await events.record({
          identity: req.identity!,
          eventName: 'vocabulary_opened',
          metadata: { itemCount: items.length },
          dedupeKey: eventDedupeKey(req.identity!, 'vocabulary_opened', utcDay()),
          requestId: req.requestId,
        });
      }
      return res.json({ items });
    } catch (error) {
      return sendError(req, res, error);
    }
  });
  router.get('/:term', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    try {
      return res.json(serialize(await service.get(ownerId, decodeURIComponent(req.params.term))));
    } catch (error) {
      return sendError(req, res, error);
    }
  });
  return router;
};

export default createVocabularyRouter();
