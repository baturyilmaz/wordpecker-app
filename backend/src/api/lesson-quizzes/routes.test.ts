/* eslint-env jest */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { LessonQuiz } from './model';
import { createLessonQuizRouter } from './routes';
import { LessonQuizService } from './service';
import { QuizError } from './errors';
import { ProductEventService } from '../product-events/service';

const ownerId = 'guest_12345678-abcd-4000-8000-123456789abc';
const lessonId = new mongoose.Types.ObjectId();
const quiz = () => new LessonQuiz({
  _id: new mongoose.Types.ObjectId(), ownerId, lessonId, status: 'active', questionCount: 1,
  correctCount: 0, totalCount: 0, startedAt: new Date(),
  questions: [{ lessonId, lessonItemId: new mongoose.Types.ObjectId(), type: 'fill_in_the_blank', prompt: 'Use _____.', options: [], correctAnswer: 'it' }],
});
const appWith = (service: Partial<LessonQuizService>) => {
  const app = express(); app.use(express.json()); app.use('/api/lesson-quizzes', createLessonQuizRouter(service as LessonQuizService, new ProductEventService(async () => undefined))); return app;
};

describe('Lesson Quiz API', () => {
  it('creates, reloads, and answers an attempt', async () => {
    const value = quiz();
    const service = { createOrResume: jest.fn().mockResolvedValue(value), getOwned: jest.fn().mockResolvedValue(value), answer: jest.fn().mockResolvedValue(value) };
    const app = appWith(service);
    expect((await request(app).post('/api/lesson-quizzes').set('user-id', ownerId).send({ lessonId: lessonId.toString() })).status).toBe(201);
    expect((await request(app).get(`/api/lesson-quizzes/${value._id}`).set('user-id', ownerId)).status).toBe(200);
    expect((await request(app).put(`/api/lesson-quizzes/${value._id}/questions/${value.questions[0]._id}/answer`).set('user-id', ownerId).send({ answer: 'it' })).status).toBe(200);
  });

  it('returns stable forbidden and invalid-answer errors', async () => {
    const forbidden = appWith({ getOwned: jest.fn().mockRejectedValue(new QuizError('QUIZ_FORBIDDEN', 'forbidden')) });
    expect((await request(forbidden).get(`/api/lesson-quizzes/${new mongoose.Types.ObjectId()}`).set('user-id', ownerId)).body.code).toBe('QUIZ_FORBIDDEN');
    const invalid = appWith({ answer: jest.fn().mockRejectedValue(new QuizError('QUIZ_INVALID_ANSWER', 'invalid')) });
    expect((await request(invalid).put(`/api/lesson-quizzes/${new mongoose.Types.ObjectId()}/questions/${new mongoose.Types.ObjectId()}/answer`).set('user-id', ownerId).send({})).body.code).toBe('QUIZ_INVALID_ANSWER');
  });
});
