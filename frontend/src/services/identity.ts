const GUEST_ID_KEY = 'langsift-guest-id';
const SESSION_HINT_KEY = 'langsift-has-session';

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

export const detachGuestId = (storage: Pick<Storage, 'removeItem'> = localStorage): void => {
  storage.removeItem(GUEST_ID_KEY);
};

export const resetGuestId = (
  storage: Pick<Storage, 'removeItem' | 'setItem'> = localStorage,
  uuid: () => string = () => crypto.randomUUID(),
): string => {
  storage.removeItem(GUEST_ID_KEY);
  const guestId = createGuestId(uuid);
  storage.setItem(GUEST_ID_KEY, guestId);
  return guestId;
};

export const hasSessionHint = (storage: Pick<Storage, 'getItem'> = localStorage): boolean =>
  storage.getItem(SESSION_HINT_KEY) === 'true';

export const setSessionHint = (active: boolean, storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage): void => {
  if (active) storage.setItem(SESSION_HINT_KEY, 'true');
  else storage.removeItem(SESSION_HINT_KEY);
};
