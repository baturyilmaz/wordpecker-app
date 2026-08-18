import { Request, Response, Router } from 'express';
import { getRequestOwnerId } from '../../utils/owner';
import { ReviewError } from './errors';
import { ReviewService, reviewService } from './service';
import { requireAuth } from '../../middleware/auth';
import { eventDedupeKey, ProductEventService, productEventService } from '../product-events/service';
import { logRequestError } from '../../utils/request-log';

const sendError = (request: Request, response: Response, error: unknown) => {
  if (error instanceof ReviewError) return response.status(error.statusCode).json({ code: error.code, message: error.message });
  logRequestError(request, 500, 'REVIEW_NOT_FOUND', error);
  return response.status(500).json({ code: 'REVIEW_NOT_FOUND', message: 'We could not load reviews.' });
};

export const createReviewRouter = (
  service: ReviewService = reviewService,
  events: ProductEventService = productEventService,
) => {
  const router = Router();
  router.use(requireAuth);
  router.get('/due', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    try {
      const items = await service.due(ownerId);
      await events.record({
        identity: req.identity!,
        eventName: 'review_started',
        metadata: { dueCount: items.length },
        dedupeKey: eventDedupeKey(req.identity!, 'review_started', events.utcDay()),
        requestId: req.requestId,
      });
      return res.json({ items, count: items.length });
    } catch (error) {
      return sendError(req, res, error);
    }
  });
  router.put('/:term', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    try {
      const item = await service.rate(ownerId, decodeURIComponent(req.params.term), req.body);
      try {
        const remaining = await service.due(ownerId);
        if (!remaining.length) {
          await events.record({
            identity: req.identity!,
            eventName: 'review_completed',
            dedupeKey: eventDedupeKey(req.identity!, 'review_completed', events.utcDay()),
            requestId: req.requestId,
          });
        }
      } catch (error) {
        console.warn('Review completion metric check failed.', {
          requestId: req.requestId,
          identity: req.identity!.type,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      }
      return res.json(item);
    } catch (error) {
      return sendError(req, res, error);
    }
  });
  return router;
};

export default createReviewRouter();
