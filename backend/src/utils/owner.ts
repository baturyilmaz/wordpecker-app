/// <reference path="../types/express.d.ts" />
import { Request } from 'express';

export const GUEST_ID_PATTERN = /^guest_[A-Za-z0-9-]{8,120}$/;

export type RequestIdentity =
  | { type: 'guest'; id: string; ownerId: string }
  | { type: 'user'; id: string; ownerId: string };

export const userOwnerId = (userId: string): string => `user_${userId}`;

type OwnerRequest = Pick<Request, 'headers'> & { identity?: RequestIdentity };

export const getGuestIdHeader = (request: OwnerRequest): string | null => {
  const value = request.headers['user-id'];
  if (typeof value !== 'string') return null;
  const guestId = value.trim();
  return GUEST_ID_PATTERN.test(guestId) ? guestId : null;
};

export const getRequestOwnerId = (request: OwnerRequest): string | null => request.identity?.ownerId || getGuestIdHeader(request);

// Phase 0 routes historically accepted arbitrary local IDs. Preserve that
// anonymous contract, but never let it override a server-authenticated owner.
export const getLegacyRequestUserId = (request: OwnerRequest): string | null => {
  if (request.identity) return request.identity.ownerId;
  const value = request.headers['user-id'];
  if (typeof value !== 'string') return null;
  const userId = value.trim();
  return userId || null;
};
