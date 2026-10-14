import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, AuthTokens } from '../types';
import { authApi } from '../api/authApi';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        const { tokens } = JSON.parse(stored);
        setTokens(tokens);
        authApi.me().then(user => {
          setUser(user);
          localStorage.setItem('auth', JSON.stringify({ user, tokens: JSON.parse(localStorage.getItem('auth') || '{}').tokens }));
        }).catch(() => {
          localStorage.removeItem('auth');
          setTokens(null);
        }).finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem('auth');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { user, tokens } = await authApi.login(email, password);
    setUser(user);
    setTokens(tokens);
    localStorage.setItem('auth', JSON.stringify({ user, tokens }));
  };

  const logout = useCallback(() => {
    const refresh = tokens?.refresh;
    const access = tokens?.access;
    setUser(null);
    setTokens(null);
    localStorage.removeItem('auth');
    if (refresh && access) {
      authApi.logout(refresh, access).catch(error => {
        console.warn('The server logout request failed after local sign-out.', error);
      });
    }
  }, [tokens]);

  const updateUser = (updated: User) => {
    setUser(updated);
    const stored = localStorage.getItem('auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      localStorage.setItem('auth', JSON.stringify({ ...parsed, user: updated }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, tokens, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
