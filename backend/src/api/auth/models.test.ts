/* eslint-env jest */
import { User } from './user-model';
import { AuthSession } from './session-model';
import { GuestMigration } from './migration-model';

describe('auth model indexes', () => {
  it('uses provider subject, never email, as the unique user identity', () => {
    const indexes = User.schema.indexes();
    expect(indexes).toContainEqual([{ provider: 1, providerSubject: 1 }, expect.objectContaining({ unique: true })]);
    expect(indexes.some(([fields, options]) => fields.email === 1 && options.unique)).toBe(false);
  });

  it('expires sessions with a Mongo TTL index and keeps token hashes unique', () => {
    const indexes = AuthSession.schema.indexes();
    expect(indexes).toContainEqual([{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })]);
    expect(AuthSession.schema.path('tokenHash').options.unique).toBe(true);
  });

  it('deduplicates migration audits by guest and user', () => {
    expect(GuestMigration.schema.indexes()).toContainEqual([{ guestId: 1, userId: 1 }, expect.objectContaining({ unique: true })]);
  });
});
