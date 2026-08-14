import crypto from 'crypto';
import { AuthSession, IAuthSession } from './session-model';
import { environment } from '../../config/environment';

export const hashSessionToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export interface CreatedSession {
  token: string;
  session: IAuthSession;
}

export class SessionService {
  async create(userId: string, guestIdAtLogin?: string, now = new Date()): Promise<CreatedSession> {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + environment.sessionDays * 24 * 60 * 60 * 1000);
    const session = await AuthSession.create({
      userId,
      tokenHash: hashSessionToken(token),
      guestIdAtLogin,
      expiresAt,
      lastSeenAt: now,
    });
    return { token, session };
  }

  async findValid(token: string, now = new Date()): Promise<IAuthSession | null> {
    const session = await AuthSession.findOne({ tokenHash: hashSessionToken(token), expiresAt: { $gt: now } });
    if (!session) return null;
    if (now.getTime() - session.lastSeenAt.getTime() > 60 * 60 * 1000) {
      session.lastSeenAt = now;
      await session.save();
    }
    return session;
  }

  async revoke(token: string): Promise<void> {
    await AuthSession.deleteOne({ tokenHash: hashSessionToken(token) });
  }
}

export const sessionService = new SessionService();
