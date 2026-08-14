import { Response, Router } from 'express';
import { getRequestOwnerId } from '../../utils/owner';
import { VocabularyError } from './errors';
import { VocabularyEntry, VocabularyService, vocabularyService } from './service';

const serialize = (entry: VocabularyEntry) => ({
  ...entry,
  review: {
    ...entry.review,
    nextReviewAt: entry.review.nextReviewAt.toISOString(),
    lastReviewedAt: entry.review.lastReviewedAt?.toISOString(),
  },
  occurrences: entry.occurrences.map((occurrence) => ({ ...occurrence, firstSeenAt: occurrence.firstSeenAt.toISOString() })),
});

const sendError = (response: Response, error: unknown) => {
  if (error instanceof VocabularyError) return response.status(error.statusCode).json({ code: error.code, message: error.message });
  console.error('Vocabulary request failed:', error);
  return response.status(500).json({ code: 'VOCABULARY_NOT_FOUND', message: 'We could not load vocabulary.' });
};

export const createVocabularyRouter = (service: VocabularyService = vocabularyService) => {
  const router = Router();
  router.get('/', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    const candidate = typeof req.query.filter === 'string' ? req.query.filter : 'all';
    const filter = ['all', 'unknown', 'saved', 'due'].includes(candidate) ? candidate as 'all' | 'unknown' | 'saved' | 'due' : 'all';
    try {
      return res.json({ items: (await service.list(ownerId, filter)).map(serialize) });
    } catch (error) {
      return sendError(res, error);
    }
  });
  router.get('/:term', async (req, res) => {
    const ownerId = getRequestOwnerId(req);
    if (!ownerId) return res.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
    try {
      return res.json(serialize(await service.get(ownerId, decodeURIComponent(req.params.term))));
    } catch (error) {
      return sendError(res, error);
    }
  });
  return router;
};

export default createVocabularyRouter();
