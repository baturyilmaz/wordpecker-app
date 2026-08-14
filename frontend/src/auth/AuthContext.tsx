import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { authApi } from '../services/authApi';
import { detachGuestId, getGuestId, hasSessionHint, resetGuestId, setSessionHint } from '../services/identity';
import { lessonApi } from '../services/lessonApi';
import { getLevelPreference, saveLevelPreference } from '../services/levelPreference';
import { AuthModal } from './AuthModal';
import { AuthContext, PendingIntent } from './auth-context';

const PENDING_KEY = 'langsift-pending-intent';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const callbackRef = useRef<{ resumed?: () => void; failed?: () => void }>({});
  const navigate = useNavigate();

  useEffect(() => {
    const expectedSession = hasSessionHint();
    authApi.me()
      .then(({ user: current }) => { setSessionHint(true); detachGuestId(); setUser(current); })
      .catch(() => {
        setSessionHint(false);
        if (expectedSession) resetGuestId();
        else getGuestId();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const requestAuth = useCallback((intent: PendingIntent, resumed?: () => void, failed?: () => void) => {
    if (user) {
      resumed?.();
      return;
    }
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(intent));
    callbackRef.current = { resumed, failed };
    setModalOpen(true);
  }, [user]);

  const resume = useCallback(async () => {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    if (!raw) return;
    let intent: PendingIntent;
    try { intent = JSON.parse(raw) as PendingIntent; }
    catch { return; }
    try {
      if (intent.type === 'save_term') await lessonApi.updateInteraction(intent.lessonId, intent.itemId, { saved: true });
      if (intent.type === 'save_lesson') await lessonApi.save(intent.lessonId);
      if (intent.type === 'open_vocabulary') navigate('/vocabulary');
      if (intent.type === 'open_review') navigate('/review');
      if (intent.type === 'open_dashboard') navigate('/dashboard');
      callbackRef.current.resumed?.();
    } catch {
      callbackRef.current.failed?.();
    } finally {
      callbackRef.current = {};
    }
  }, [navigate]);

  useEffect(() => {
    if (loading || !sessionStorage.getItem(PENDING_KEY)) return;
    if (user) void resume();
    else setModalOpen(true);
  }, [loading, resume, user]);

  const onCredential = useCallback(async (credential: string) => {
    const result = await authApi.google(credential, getLevelPreference());
    setUser(result.user);
    setSessionHint(true);
    if (result.user.levelPreference) saveLevelPreference(result.user.levelPreference);
    detachGuestId();
    setModalOpen(false);
    await resume();
  }, [resume]);

  const logout = useCallback(async () => {
    await authApi.logout();
    sessionStorage.removeItem(PENDING_KEY);
    callbackRef.current = {};
    setModalOpen(false);
    setSessionHint(false);
    resetGuestId();
    navigate('/', { replace: true });
    setUser(null);
  }, [navigate]);

  const value = useMemo(() => ({ user, loading, requestAuth, logout, updateUser: setUser }), [loading, logout, requestAuth, user]);
  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); sessionStorage.removeItem(PENDING_KEY); callbackRef.current = {}; }}
        onCredential={onCredential}
      />
    </AuthContext.Provider>
  );
};
