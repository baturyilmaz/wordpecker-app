/* eslint-env jest */
import mongoose from 'mongoose';
import { AuthService, GoogleVerifier, OfficialGoogleVerifier } from './service';
import { OAuth2Client } from 'google-auth-library';
import { environment } from '../../config/environment';
import { User } from './user-model';

const validPayload = { sub: 'google-subject-1', email: 'reader@example.com', email_verified: true, name: 'Reader', picture: 'https://example.com/avatar.png' };

describe('AuthService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('verifies a Google credential and creates or updates a user by provider subject', async () => {
    const user = { _id: new mongoose.Types.ObjectId(), provider: 'google', providerSubject: validPayload.sub };
    const verifier = { verify: jest.fn().mockResolvedValue(validPayload) } as GoogleVerifier;
    jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(user as never);
    const result = await new AuthService(verifier).login('valid-id-token', 'intermediate');
    expect(result).toBe(user);
    expect(verifier.verify).toHaveBeenCalledWith('valid-id-token');
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { provider: 'google', providerSubject: validPayload.sub },
      expect.objectContaining({ $set: expect.objectContaining({ email: validPayload.email }), $setOnInsert: expect.objectContaining({ levelPreference: 'intermediate' }) }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it.each(['invalid token', 'wrong audience', 'expired token'])('rejects %s verification failures', async () => {
    const verifier = { verify: jest.fn().mockRejectedValue(new Error('verification failed')) } as GoogleVerifier;
    await expect(new AuthService(verifier).login('bad-token')).rejects.toMatchObject({ code: 'GOOGLE_TOKEN_INVALID', statusCode: 401 });
  });

  it('rejects an unverified Google email', async () => {
    const verifier = { verify: jest.fn().mockResolvedValue({ ...validPayload, email_verified: false }) } as GoogleVerifier;
    await expect(new AuthService(verifier).login('token')).rejects.toEqual(expect.objectContaining({ code: 'EMAIL_NOT_VERIFIED', statusCode: 403 }));
  });

  it('reuses the existing user returned by the provider-subject upsert', async () => {
    const existing = { _id: new mongoose.Types.ObjectId(), providerSubject: validPayload.sub, lastLoginAt: new Date() };
    jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(existing as never);
    const result = await new AuthService({ verify: jest.fn().mockResolvedValue(validPayload) }).login('token');
    expect(result._id).toEqual(existing._id);
    expect(User.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('recovers an existing user from a concurrent unique-index login race', async () => {
    const existing = { _id: new mongoose.Types.ObjectId(), providerSubject: validPayload.sub };
    jest.spyOn(User, 'findOneAndUpdate')
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000 }))
      .mockResolvedValueOnce(existing as never);
    await expect(new AuthService({ verify: jest.fn().mockResolvedValue(validPayload) }).login('token')).resolves.toBe(existing);
    expect(User.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('passes the configured audience to the official Google verifier', async () => {
    const originalClientId = environment.googleClientId;
    Object.defineProperty(environment, 'googleClientId', { value: 'test-client-id.apps.googleusercontent.com', configurable: true });
    const verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => validPayload } as never);
    await expect(new OfficialGoogleVerifier().verify('id-token')).resolves.toMatchObject(validPayload);
    expect(verify).toHaveBeenCalledWith({ idToken: 'id-token', audience: 'test-client-id.apps.googleusercontent.com' });
    Object.defineProperty(environment, 'googleClientId', { value: originalClientId, configurable: true });
  });
});
