/* eslint-env jest */
import mongoose from 'mongoose';
import { AuthSession } from './session-model';
import { hashSessionToken, SessionService } from './session-service';

describe('SessionService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates an opaque token while storing only its hash', async () => {
    const created = { _id: new mongoose.Types.ObjectId() };
    const create = jest.spyOn(AuthSession, 'create').mockResolvedValue(created as never);
    const result = await new SessionService().create(new mongoose.Types.ObjectId().toString(), 'guest_12345678');
    expect(result.token).toHaveLength(43);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: hashSessionToken(result.token), guestIdAtLogin: 'guest_12345678' }));
    expect(JSON.stringify(create.mock.calls)).not.toContain(result.token);
  });

  it('returns a valid session and rejects an expired session query result', async () => {
    const now = new Date('2026-08-14T00:00:00Z');
    const valid = { lastSeenAt: now, save: jest.fn() };
    jest.spyOn(AuthSession, 'findOne').mockResolvedValueOnce(valid as never).mockResolvedValueOnce(null);
    await expect(new SessionService().findValid('token', now)).resolves.toBe(valid);
    await expect(new SessionService().findValid('expired', now)).resolves.toBeNull();
    expect(AuthSession.findOne).toHaveBeenLastCalledWith(expect.objectContaining({ expiresAt: { $gt: now } }));
  });

  it('revokes the hashed token on logout', async () => {
    const remove = jest.spyOn(AuthSession, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as never);
    await new SessionService().revoke('raw-token');
    expect(remove).toHaveBeenCalledWith({ tokenHash: hashSessionToken('raw-token') });
  });
});
