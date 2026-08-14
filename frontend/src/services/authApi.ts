import type { LessonLevel, User } from '../types';
import { api } from './api';

export interface LoginResponse {
  user: User;
  migration: { guestId?: string; counts: Record<string, number> };
}

export const authApi = {
  google: (credential: string, levelPreference: LessonLevel): Promise<LoginResponse> => api.post('/api/auth/google', { credential, levelPreference }),
  me: (): Promise<{ user: User }> => api.get('/api/auth/me'),
  logout: (): Promise<void> => api.post('/api/auth/logout', {}),
  updateLevel: (levelPreference: LessonLevel): Promise<{ user: User }> => api.patch('/api/auth/me', { levelPreference }),
};
