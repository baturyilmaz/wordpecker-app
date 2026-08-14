import { NextFunction, Request, Response } from 'express';
import { environment } from '../config/environment';
import { sessionService } from '../api/auth/session-service';
import { getGuestIdHeader, userOwnerId } from '../utils/owner';

const getSessionToken = (request: Request): string | null => {
  const value = request.cookies?.[environment.sessionCookieName];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

export const optionalAuth = async (request: Request, _response: Response, next: NextFunction) => {
  try {
    const token = getSessionToken(request);
    if (token) {
      const session = await sessionService.findValid(token);
      if (session) {
        const id = session.userId.toString();
        request.identity = { type: 'user', id, ownerId: userOwnerId(id) };
        request.authSessionId = session._id.toString();
        return next();
      }
    }
    const guestId = getGuestIdHeader(request);
    if (guestId) request.identity = { type: 'guest', id: guestId, ownerId: guestId };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAuth = (request: Request, response: Response, next: NextFunction) => {
  if (request.identity?.type !== 'user') {
    return response.status(401).json({ code: 'AUTH_REQUIRED', message: 'Sign in to continue.' });
  }
  return next();
};

export const requireIdentity = (request: Request, response: Response, next: NextFunction) => {
  if (!request.identity) {
    const guestId = getGuestIdHeader(request);
    if (guestId) request.identity = { type: 'guest', id: guestId, ownerId: guestId };
  }
  if (!request.identity) {
    return response.status(400).json({ code: 'GUEST_ID_REQUIRED', message: 'A valid guest ID is required.' });
  }
  return next();
};

export const protectAuthenticatedMutation = (request: Request, response: Response, next: NextFunction) => {
  if (request.identity?.type !== 'user' || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next();
  if (!request.is('application/json')) {
    return response.status(415).json({ code: 'JSON_REQUIRED', message: 'This endpoint only accepts JSON.' });
  }
  const origin = request.get('origin');
  const referer = request.get('referer');
  const allowed = environment.frontendUrl.replace(/\/$/, '');
  const matches = origin === allowed || (!!referer && referer.startsWith(`${allowed}/`));
  if (!matches) return response.status(403).json({ code: 'CSRF_REJECTED', message: 'Request origin was rejected.' });
  return next();
};
