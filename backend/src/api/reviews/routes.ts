import { Response, Router } from 'express';
import { getRequestOwnerId } from '../../utils/owner';
import { ReviewError } from './errors';
import { ReviewService, reviewService } from './service';

const sendError = (response: Response, error: unknown) => {
  if (error instanceof ReviewError) return response.status(error.statusCode).json({ code: error.code, message: error.message });
  console.error('Review request failed:', error);
  return response.status(500).json({ code: 'REVIEW_NOT_FOUND', message: 'We could not load reviews.' });
};

export const createReviewRouter = (service: ReviewService = reviewService) => {
  const router = Router();
  router.get('/due', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    try {
      const items = await service.due(ownerId);
      return res.json({ items, count: items.length });
    } catch (error) {
      return sendError(res, error);
    }
  });
  router.put('/:term', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    try {
      return res.json(await service.rate(ownerId, decodeURIComponent(req.params.term), req.body));
    } catch (error) {
      return sendError(res, error);
    }
  });
  return router;
};

export default createReviewRouter();
