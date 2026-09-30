import { mockUsers } from '../mocks/data';
import type { User, AuthTokens } from '../types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const authApi = {
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    await delay(600);
    if (password !== 'demo1234') throw new Error('Email ou mot de passe incorrect');
    const user = mockUsers.find(u => u.email === email);
    if (!user) throw new Error('Email ou mot de passe incorrect');
    return {
      user,
      tokens: { access: `mock-access-${user.id}`, refresh: `mock-refresh-${user.id}` },
    };
    // Real: return apiClient.post('/auth/login/', { email, password }).then(r => r.data);
  },

  async register(data: { fullName: string; email: string; password: string; role: 'ENSEIGNANT' | 'ETUDIANT' }): Promise<void> {
    await delay(600);
    if (mockUsers.find(u => u.email === data.email)) throw new Error('Cet email est déjà utilisé');
    // Real: return apiClient.post('/auth/register/', data);
  },

  async refreshToken(refresh: string): Promise<AuthTokens> {
    await delay(200);
    return { access: `mock-access-refreshed`, refresh };
    // Real: return apiClient.post('/auth/token/refresh/', { refresh }).then(r => r.data);
  },
};
