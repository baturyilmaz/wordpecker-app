/* eslint-env jest */
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { optionalAuth, protectAuthenticatedMutation, requireAuth } from './auth';
import { sessionService } from '../api/auth/session-service';
import { getLegacyRequestUserId } from '../utils/owner';

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response);

describe('auth middleware', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses the authenticated session owner and ignores a forged owner header', async () => {
    const userId = new mongoose.Types.ObjectId();
    jest.spyOn(sessionService, 'findValid').mockResolvedValue({ _id: new mongoose.Types.ObjectId(), userId } as never);
    const request = { cookies: { langsift_session: 'raw' }, headers: { 'user-id': 'guest_aaaaaaaa-bbbb-4000-8000-cccccccccccc' } } as unknown as Request;
    const next = jest.fn() as NextFunction;
    await optionalAuth(request, response(), next);
    expect(request.identity).toEqual({ type: 'user', id: userId.toString(), ownerId: `user_${userId}` });
    expect(getLegacyRequestUserId(request)).toBe(`user_${userId}`);
    expect(next).toHaveBeenCalled();
  });

  it('falls back to a valid guest identity when the session is expired', async () => {
    jest.spyOn(sessionService, 'findValid').mockResolvedValue(null);
    const request = { cookies: { langsift_session: 'expired' }, headers: { 'user-id': 'guest_aaaaaaaa-bbbb-4000-8000-cccccccccccc' } } as unknown as Request;
    await optionalAuth(request, response(), jest.fn());
    expect(request.identity?.type).toBe('guest');
  });

  it('returns AUTH_REQUIRED without a user session', () => {
    const res = response();
    requireAuth({ identity: { type: 'guest', id: 'guest_12345678', ownerId: 'guest_12345678' } } as Request, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_REQUIRED' }));
  });

  it('rejects authenticated mutations from an untrusted origin', () => {
    const res = response();
    const request = { identity: { type: 'user', id: '1', ownerId: 'user_1' }, method: 'PUT', is: jest.fn().mockReturnValue(true), get: jest.fn().mockReturnValue('https://evil.example') } as unknown as Request;
    protectAuthenticatedMutation(request, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('accepts a JSON authenticated mutation from the configured origin', () => {
    const res = response();
    const next = jest.fn();
    const request = {
      identity: { type: 'user', id: '1', ownerId: 'user_1' }, method: 'POST',
      is: jest.fn().mockReturnValue(true),
      get: jest.fn((name: string) => name === 'origin' ? 'http://localhost:5173' : undefined),
    } as unknown as Request;
    protectAuthenticatedMutation(request, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('does not apply cookie CSRF checks to safe reads', () => {
    const next = jest.fn();
    const request = { identity: { type: 'user', id: '1', ownerId: 'user_1' }, method: 'GET' } as Request;
    protectAuthenticatedMutation(request, response(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
