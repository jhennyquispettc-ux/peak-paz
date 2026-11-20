import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, readToken, writeToken } from '../api/client';
import type { AuthResponse, User } from '../api/types';

interface RegisterData {
  role?: 'TOURIST' | 'GUIDE';
  nationalId?: string;
  languages?: string[];
  yearsExperience?: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  refresh: () => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => readToken() !== null);

  useEffect(() => {
    if (!readToken()) return;
    api<User>('/users/me')
      .then(setUser)
      .catch(() => writeToken(null))
      .finally(() => setLoading(false));
  }, []);

  const startSession = useCallback((session: AuthResponse) => {
    writeToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      return startSession(
        await api<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }),
      );
    },
    [startSession],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      return startSession(
        await api<AuthResponse>(
          data.role === 'GUIDE' ? '/auth/register/guide' : '/auth/register',
          {
            method: 'POST',
            body: JSON.stringify(
              Object.fromEntries(
                Object.entries(data).filter(([key]) => key !== 'role'),
              ),
            ),
          },
        ),
      );
    },
    [startSession],
  );

  const refresh = useCallback(async () => {
    const current = await api<User>('/users/me');
    setUser(current);
    return current;
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
