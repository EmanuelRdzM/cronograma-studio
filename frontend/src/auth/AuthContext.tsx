import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getStoredToken, setStoredToken } from '@/api/client';
import type { User } from '@/api/types';

interface Session {
  token: string | null;
  user: User | null;
}

interface AuthContextValue extends Session {
  checking: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = 'cronograma.user';

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() => ({
    token: getStoredToken(),
    user: readUser(),
  }));
  const [checking, setChecking] = useState(Boolean(getStoredToken()));

  const logout = useCallback(() => {
    setStoredToken(null);
    localStorage.removeItem(USER_KEY);
    setSession({ token: null, user: null });
    setChecking(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      token: null,
    });
    setStoredToken(result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setSession({ token: result.token, user: result.user });
    setChecking(false);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('cronograma:unauthorized', onUnauthorized);
    return () => window.removeEventListener('cronograma:unauthorized', onUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (!getStoredToken()) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    api<{ user: User }>('/auth/me')
      .then(({ user }) => {
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setSession({ token: getStoredToken(), user });
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const value = useMemo(
    () => ({ ...session, checking, login, logout }),
    [session, checking, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
