import { Request } from 'express';

const OWNER_ID_PATTERN = /^(guest|user)_[A-Za-z0-9-]{8,120}$/;

export const getRequestOwnerId = (request: Request): string | null => {
  const value = request.headers['user-id'];
  if (typeof value !== 'string') return null;
  const ownerId = value.trim();
  return OWNER_ID_PATTERN.test(ownerId) ? ownerId : null;
};
