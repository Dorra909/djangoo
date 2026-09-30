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
        const { user, tokens } = JSON.parse(stored);
        setUser(user);
        setTokens(tokens);
      } catch {
        localStorage.removeItem('auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { user, tokens } = await authApi.login(email, password);
    setUser(user);
    setTokens(tokens);
    localStorage.setItem('auth', JSON.stringify({ user, tokens }));
  };

  const logout = useCallback(() => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('auth');
  }, []);

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
