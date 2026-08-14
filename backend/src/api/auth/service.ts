import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { environment } from '../../config/environment';
import { User, IUser } from './user-model';
import { LessonLevel } from '../lessons/contracts';

export interface GoogleVerifier {
  verify(credential: string): Promise<TokenPayload>;
}

export class OfficialGoogleVerifier implements GoogleVerifier {
  private readonly client = new OAuth2Client();

  async verify(credential: string): Promise<TokenPayload> {
    if (!environment.googleClientId) throw new AuthError('AUTH_NOT_CONFIGURED', 'Google sign-in is not configured.', 503);
    const ticket = await this.client.verifyIdToken({ idToken: credential, audience: environment.googleClientId });
    const payload = ticket.getPayload();
    if (!payload) throw new AuthError('GOOGLE_TOKEN_INVALID', 'Google sign-in could not be verified.', 401);
    return payload;
  }
}

export class AuthError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode = 401) {
    super(message);
  }
}

export class AuthService {
  constructor(private readonly verifier: GoogleVerifier = new OfficialGoogleVerifier()) {}

  async login(credential: string, levelPreference?: LessonLevel): Promise<IUser> {
    let payload: TokenPayload;
    try {
      payload = await this.verifier.verify(credential);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('GOOGLE_TOKEN_INVALID', 'Google sign-in could not be verified.');
    }
    if (!payload.sub || !payload.email) throw new AuthError('GOOGLE_TOKEN_INVALID', 'Google sign-in did not include a usable identity.');
    if (!payload.email_verified) throw new AuthError('EMAIL_NOT_VERIFIED', 'Please verify your Google email before signing in.', 403);
    const now = new Date();
    const filter = { provider: 'google' as const, providerSubject: payload.sub };
    const update = {
      $set: {
        email: payload.email,
        emailVerified: true,
        displayName: payload.name || undefined,
        avatarUrl: payload.picture || undefined,
        lastLoginAt: now,
      },
      $setOnInsert: { provider: 'google' as const, providerSubject: payload.sub, levelPreference },
    };
    try {
      return await User.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: true });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error;
      const existing = await User.findOneAndUpdate(filter, update, { new: true });
      if (!existing) throw error;
      return existing;
    }
  }
}

export const authService = new AuthService();

export const serializeUser = (user: IUser) => ({
  id: user._id.toString(),
  email: user.email,
  emailVerified: user.emailVerified,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  levelPreference: user.levelPreference,
  createdAt: user.createdAt.toISOString(),
  lastLoginAt: user.lastLoginAt.toISOString(),
});
