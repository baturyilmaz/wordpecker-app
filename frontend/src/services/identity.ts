const GUEST_ID_KEY = 'langsift-guest-id';

export const createGuestId = (uuid: () => string = () => crypto.randomUUID()): string => `guest_${uuid()}`;

export const getGuestId = (
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  uuid: () => string = () => crypto.randomUUID(),
): string => {
  const existing = storage.getItem(GUEST_ID_KEY);
  if (existing?.startsWith('guest_')) return existing;
  const guestId = createGuestId(uuid);
  storage.setItem(GUEST_ID_KEY, guestId);
  return guestId;
};
