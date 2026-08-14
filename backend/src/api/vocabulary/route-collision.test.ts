/* eslint-env jest */
jest.mock('@openai/agents', () => ({ run: jest.fn() }));
jest.mock('../../agents', () => ({
  configureOpenAIAgents: jest.fn(),
  vocabularyAgent: {},
  learnAgent: {},
  quizAgent: {},
}));
jest.mock('../image-description/stock-photo-service', () => ({
  stockPhotoService: { findStockImage: jest.fn() },
}));

import request from 'supertest';
import app from '../../app';
import { vocabularyService } from './service';
import { vocabularyAgentService } from './agent-service';
import { Word } from '../words/model';
import * as languageUtilities from '../../utils/getUserLanguages';

const guestId = 'guest_12345678-abcd-4000-8000-123456789abc';

describe('Vocabulary route namespaces', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps the Langsift Vocabulary namespace protected for authenticated users', async () => {
    jest.spyOn(vocabularyService, 'list').mockResolvedValue([]);
    const response = await request(app).get('/api/vocabulary').set('user-id', guestId);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });

  it('serves legacy generate-words at /api/legacy/vocabulary', async () => {
    jest.spyOn(Word, 'find').mockReturnValue({ populate: jest.fn().mockResolvedValue([]) } as never);
    jest.spyOn(languageUtilities, 'getUserLanguages').mockResolvedValue({ baseLanguage: 'Chinese', targetLanguage: 'English' });
    jest.spyOn(vocabularyAgentService, 'generateWords').mockResolvedValue([{
      word: 'harbor', meaning: '港口', example: 'The ship entered the harbor.', difficulty_level: 'intermediate', context: 'travel',
    }]);

    const response = await request(app)
      .post('/api/legacy/vocabulary/generate-words')
      .set('user-id', guestId)
      .send({ context: 'travel', difficulty: 'intermediate', count: 1 });

    expect(response.status).toBe(200);
    expect(response.body.words[0].word).toBe('harbor');
    expect(vocabularyAgentService.generateWords).toHaveBeenCalledTimes(1);
  });

  it('serves legacy get-word-details at /api/legacy/vocabulary', async () => {
    jest.spyOn(languageUtilities, 'getUserLanguages').mockResolvedValue({ baseLanguage: 'Chinese', targetLanguage: 'English' });
    jest.spyOn(vocabularyAgentService, 'getWordDetails').mockResolvedValue({
      word: 'harbor', meaning: '港口', example: 'The ship entered the harbor.', difficulty_level: 'intermediate', context: 'travel',
    });

    const response = await request(app)
      .post('/api/legacy/vocabulary/get-word-details')
      .set('user-id', guestId)
      .send({ word: 'harbor', context: 'travel' });

    expect(response.status).toBe(200);
    expect(response.body.word).toBe('harbor');
    expect(vocabularyAgentService.getWordDetails).toHaveBeenCalledTimes(1);
  });
});
