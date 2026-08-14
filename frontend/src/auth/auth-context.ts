import { createContext } from 'react';
import type { User } from '../types';

export type PendingIntent =
  | { type: 'save_term'; lessonId: string; itemId: string }
  | { type: 'save_lesson'; lessonId: string }
  | { type: 'open_vocabulary' }
  | { type: 'open_review' }
  | { type: 'open_dashboard' };

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  requestAuth: (intent: PendingIntent, resumed?: () => void, failed?: () => void) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
