/* eslint-env jest */
import { eventDedupeKey, ProductEventService, utcDay } from './service';

describe('ProductEventService', () => {
  const guest = { type: 'guest' as const, id: 'guest_12345678-abcd-4000-8000-123456789abc', ownerId: 'guest_12345678-abcd-4000-8000-123456789abc' };
  const user = { type: 'user' as const, id: '507f1f77bcf86cd799439011', ownerId: 'user_507f1f77bcf86cd799439011' };

  afterEach(() => jest.restoreAllMocks());

  it('stores only the supplied minimal event fields and resolved identity', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const service = new ProductEventService(writer);
    await service.record({
      identity: user,
      eventName: 'lesson_created',
      articleId: '507f1f77bcf86cd799439012',
      lessonId: '507f1f77bcf86cd799439013',
      metadata: { contentDensity: 'normal', itemCount: 10, level: 'advanced', articleContent: 'must not be stored' },
      dedupeKey: eventDedupeKey(user, 'lesson_created', '507f1f77bcf86cd799439013'),
      requestId: 'request-1',
    });
    expect(writer).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: user.ownerId,
      userId: user.id,
      guestId: undefined,
      eventName: 'lesson_created',
      metadata: { contentDensity: 'normal', itemCount: 10, level: 'advanced' },
    }));
    expect(JSON.stringify(writer.mock.calls[0][0])).not.toMatch(/googleCredential|sessionToken|cookie|email|articleContent|aiPrompt/i);
  });

  it('records guest ownership without inventing a user id', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await new ProductEventService(writer).record({ identity: guest, eventName: 'article_extracted' });
    expect(writer).toHaveBeenCalledWith(expect.objectContaining({ ownerId: guest.ownerId, guestId: guest.id, userId: undefined }));
  });

  it('never blocks the business operation when the event writer fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = new ProductEventService(jest.fn().mockRejectedValue(new Error('write failed')));
    await expect(service.record({ identity: user, eventName: 'quiz_started', requestId: 'request-2' })).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith('Product event write failed.', expect.objectContaining({
      requestId: 'request-2', eventName: 'quiz_started', identity: 'user', errorName: 'Error',
    }));
  });

  it('builds stable resource and UTC-day dedupe keys', () => {
    expect(eventDedupeKey(user, 'quiz_started', 'quiz-1')).toBe(`${user.ownerId}:quiz_started:quiz-1`);
    expect(utcDay(new Date('2026-08-14T23:59:59Z'))).toBe('2026-08-14');
  });
});
