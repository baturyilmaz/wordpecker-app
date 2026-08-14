import { useContext } from 'react';
import { AuthContext, AuthContextValue } from './auth-context';

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
