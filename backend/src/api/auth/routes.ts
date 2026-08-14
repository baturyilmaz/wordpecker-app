import { CookieOptions, Request, Response, Router } from 'express';
import { environment } from '../../config/environment';
import { getGuestIdHeader } from '../../utils/owner';
import { requireAuth } from '../../middleware/auth';
import { AuthError, AuthService, authService, serializeUser } from './service';
import { GuestMigrationService, guestMigrationService } from './migration-service';
import { SessionService, sessionService } from './session-service';
import { User } from './user-model';
import { LessonLevel } from '../lessons/contracts';
import { logRequestError } from '../../utils/request-log';

export const getSessionCookieOptions = (nodeEnv = environment.nodeEnv): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: nodeEnv === 'production',
  path: '/',
  maxAge: environment.sessionDays * 24 * 60 * 60 * 1000,
});

const tokenFrom = (request: Request): string | undefined => request.cookies?.[environment.sessionCookieName];

export const createAuthRouter = (
  auth: AuthService = authService,
  sessions: SessionService = sessionService,
  migrations: GuestMigrationService = guestMigrationService,
) => {
  const router = Router();

  router.post('/google', async (request, response) => {
    const credential = typeof request.body?.credential === 'string' ? request.body.credential : '';
    if (!credential) return response.status(400).json({ code: 'GOOGLE_CREDENTIAL_REQUIRED', message: 'Google credential is required.' });
    try {
      const allowedLevels = ['basic', 'intermediate', 'upper_intermediate', 'advanced'];
      const levelPreference = allowedLevels.includes(request.body?.levelPreference) ? request.body.levelPreference as LessonLevel : undefined;
      const user = await auth.login(credential, levelPreference);
      const guestId = request.identity?.type === 'user' ? undefined : getGuestIdHeader(request) || undefined;
      let counts;
      try {
        counts = await migrations.migrate(guestId, user._id.toString());
      } catch (error) {
        logRequestError(request, 500, 'OWNER_MIGRATION_INCOMPLETE', error);
        return response.status(500).json({
          code: 'OWNER_MIGRATION_INCOMPLETE',
          message: 'Your learning data could not be attached to this account yet.',
        });
      }
      const created = await sessions.create(user._id.toString(), guestId);
      response.cookie(environment.sessionCookieName, created.token, getSessionCookieOptions());
      return response.json({ user: serializeUser(user), migration: { guestId, counts } });
    } catch (error) {
      if (error instanceof AuthError) return response.status(error.statusCode).json({ code: error.code, message: error.message });
      logRequestError(request, 500, 'AUTH_FAILED', error);
      return response.status(500).json({ code: 'AUTH_FAILED', message: 'Sign-in could not be completed.' });
    }
  });

  router.get('/me', requireAuth, async (request, response, next) => {
    try {
      const user = await User.findById(request.identity!.id);
      if (!user) return response.status(401).json({ code: 'AUTH_REQUIRED', message: 'Sign in to continue.' });
      return response.json({ user: serializeUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  router.patch('/me', requireAuth, async (request, response, next) => {
    const allowed = ['basic', 'intermediate', 'upper_intermediate', 'advanced'];
    if (!allowed.includes(request.body?.levelPreference)) {
      return response.status(400).json({ code: 'INVALID_LEVEL', message: 'Choose a valid English level.' });
    }
    try {
      const user = await User.findByIdAndUpdate(request.identity!.id, { $set: { levelPreference: request.body.levelPreference } }, { new: true });
      if (!user) return response.status(401).json({ code: 'AUTH_REQUIRED', message: 'Sign in to continue.' });
      return response.json({ user: serializeUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/logout', requireAuth, async (request, response, next) => {
    try {
      const token = tokenFrom(request);
      if (token) await sessions.revoke(token);
      response.clearCookie(environment.sessionCookieName, { ...getSessionCookieOptions(), maxAge: undefined });
      return response.status(204).send();
    } catch (error) {
      return next(error);
    }
  });
  return router;
};

export default createAuthRouter();
