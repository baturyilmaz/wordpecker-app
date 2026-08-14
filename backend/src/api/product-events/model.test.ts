/* eslint-env jest */
import { ProductEvent } from './model';

describe('ProductEvent indexes', () => {
  it('supports owner, event, user, and idempotent event queries', () => {
    const indexes = ProductEvent.schema.indexes();
    expect(indexes).toEqual(expect.arrayContaining([
      [{ ownerId: 1, createdAt: -1 }, expect.any(Object)],
      [{ eventName: 1, createdAt: -1 }, expect.any(Object)],
      [{ userId: 1, createdAt: -1 }, expect.objectContaining({ sparse: true })],
      [{ dedupeKey: 1 }, expect.objectContaining({ unique: true })],
    ]));
  });
});
