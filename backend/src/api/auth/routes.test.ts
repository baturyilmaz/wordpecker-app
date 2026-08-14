/* eslint-env jest */
import cookieParser from 'cookie-parser';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { createAuthRouter, getSessionCookieOptions } from './routes';
import { AuthService } from './service';
import { GuestMigrationService } from './migration-service';
import { SessionService } from './session-service';
import { User } from './user-model';

const user = {
  _id: new mongoose.Types.ObjectId(), email: 'reader@example.com', emailVerified: true, displayName: 'Reader',
  createdAt: new Date('2026-08-01T00:00:00Z'), lastLoginAt: new Date('2026-08-14T00:00:00Z'),
};

const build = (authenticated = false) => {
  const auth = { login: jest.fn().mockResolvedValue(user) } as unknown as AuthService;
  const migrations = { migrate: jest.fn().mockResolvedValue({ articles: 1, lessons: 1, interactions: 1, quizzes: 1, reviews: 1 }) } as unknown as GuestMigrationService;
  const sessions = { create: jest.fn().mockResolvedValue({ token: 'opaque-session-token', session: { _id: new mongoose.Types.ObjectId() } }), revoke: jest.fn() } as unknown as SessionService;
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  if (authenticated) app.use((req, _res, next) => { req.identity = { type: 'user', id: user._id.toString(), ownerId: `user_${user._id}` }; next(); });
  app.use('/api/auth', createAuthRouter(auth, sessions, migrations));
  return { app, auth, migrations, sessions };
};

describe('auth routes', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs in, migrates the guest, creates a session, and sets an HttpOnly cookie', async () => {
    const { app, auth, migrations, sessions } = build();
    const response = await request(app).post('/api/auth/google').set('user-id', 'guest_12345678-abcd-4000-8000-123456789abc').send({ credential: 'google-id-token', levelPreference: 'intermediate' });
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie'][0]).toMatch(/langsift_session=opaque-session-token.*HttpOnly.*SameSite=Lax/);
    expect(auth.login).toHaveBeenCalledWith('google-id-token', 'intermediate');
    expect(migrations.migrate).toHaveBeenCalledWith('guest_12345678-abcd-4000-8000-123456789abc', user._id.toString());
    expect(sessions.create).toHaveBeenCalled();
  });

  it('returns the authenticated user and logs out by revoking and clearing the cookie', async () => {
    const { app, sessions } = build(true);
    jest.spyOn(User, 'findById').mockResolvedValue(user as never);
    const me = await request(app).get('/api/auth/me');
    expect(me.status).toBe(200);
    const logout = await request(app).post('/api/auth/logout').set('Cookie', 'langsift_session=opaque-session-token').send({});
    expect(logout.status).toBe(204);
    expect(sessions.revoke).toHaveBeenCalledWith('opaque-session-token');
    expect(logout.headers['set-cookie'][0]).toMatch(/langsift_session=;/);
  });

  it('rejects an invalid credential request', async () => {
    const { app, auth } = build();
    const response = await request(app).post('/api/auth/google').send({});
    expect(response.status).toBe(400);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('reports an incomplete owner migration without creating a session', async () => {
    const { app, migrations, sessions } = build();
    (migrations.migrate as jest.Mock).mockRejectedValue(new Error('migration conflict'));
    const response = await request(app).post('/api/auth/google')
      .set('user-id', 'guest_12345678-abcd-4000-8000-123456789abc')
      .send({ credential: 'google-id-token', levelPreference: 'intermediate' });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'OWNER_MIGRATION_INCOMPLETE',
      message: 'Your learning data could not be attached to this account yet.',
    });
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('uses a Secure cookie only in production', () => {
    expect(getSessionCookieOptions('development')).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
    expect(getSessionCookieOptions('production')).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  });
});
