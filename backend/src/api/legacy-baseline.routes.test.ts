/* eslint-env jest */
jest.mock('@openai/agents', () => ({ run: jest.fn() }));
jest.mock('../agents', () => ({
  configureOpenAIAgents: jest.fn(),
  vocabularyAgent: {},
  learnAgent: {},
  quizAgent: {},
}));
jest.mock('./image-description/stock-photo-service', () => ({
  stockPhotoService: { findStockImage: jest.fn() },
}));

import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { WordList } from './lists/model';
import { Word } from './words/model';

const listId = new mongoose.Types.ObjectId();
const now = new Date('2026-08-14T00:00:00.000Z');
const list = {
  _id: listId,
  name: 'Checkpoint list',
  description: 'Phase 0 regression fixture',
  context: 'General',
  created_at: now,
  updated_at: now,
};

const leanQuery = <T>(value: T) => ({ lean: jest.fn().mockResolvedValue(value) });

describe('Phase 0 legacy route baseline', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps Lists CRUD reachable', async () => {
    jest.spyOn(WordList, 'create').mockResolvedValue(list as never);
    expect((await request(app).post('/api/lists').send({ name: list.name, context: list.context })).status).toBe(201);

    jest.spyOn(WordList, 'find').mockReturnValue({ sort: jest.fn().mockReturnValue(leanQuery([list])) } as never);
    jest.spyOn(Word, 'find').mockReturnValue(leanQuery([]) as never);
    expect((await request(app).get('/api/lists')).status).toBe(200);

    jest.spyOn(WordList, 'findById').mockReturnValue(leanQuery(list) as never);
    expect((await request(app).get(`/api/lists/${listId}`)).status).toBe(200);

    jest.spyOn(WordList, 'findByIdAndUpdate').mockResolvedValue({ ...list, name: 'Updated list' } as never);
    expect((await request(app).put(`/api/lists/${listId}`).send({ name: 'Updated list' })).status).toBe(200);

    jest.spyOn(Word, 'updateMany').mockResolvedValue({} as never);
    jest.spyOn(Word, 'deleteMany').mockResolvedValue({} as never);
    jest.spyOn(WordList, 'findByIdAndDelete').mockResolvedValue(list as never);
    expect((await request(app).delete(`/api/lists/${listId}`)).status).toBe(204);
  });

  it('keeps the legacy Learn route reachable', async () => {
    jest.spyOn(WordList, 'findById').mockReturnValue(leanQuery(null) as never);
    jest.spyOn(Word, 'find').mockReturnValue(leanQuery([]) as never);
    const response = await request(app).post(`/api/learn/${listId}/start`).set('user-id', 'legacy-user');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('List not found');
  });

  it('keeps the legacy Quiz route reachable', async () => {
    jest.spyOn(WordList, 'findById').mockReturnValue(leanQuery(null) as never);
    jest.spyOn(Word, 'find').mockReturnValue(leanQuery([]) as never);
    const response = await request(app).post(`/api/quiz/${listId}/start`).set('user-id', 'legacy-user');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('List not found');
  });
});
