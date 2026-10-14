import { apiClient } from './client';
import type { AuthTokens, User } from '../types';

interface LoginResponse extends AuthTokens {
  user: User;
}

export const authApi = {
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login/', { email, password });
    const { access, refresh, user } = data;
    return { user, tokens: { access, refresh } };
  },

  async register(data: {
    fullName: string;
    email: string;
    password: string;
    role: 'ENSEIGNANT' | 'ETUDIANT';
  }): Promise<User> {
    const response = await apiClient.post<{ user: User }>('/auth/register/', data);
    return response.data.user;
  },

  async refreshToken(refresh: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/auth/token/refresh/', { refresh });
    return data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me/');
    return data;
  },

  async updateProfile(data: Pick<User, 'fullName' | 'email' | 'bio'>): Promise<User> {
    const response = await apiClient.patch<User>('/auth/me/', data);
    return response.data;
  },

  async updateAvatar(file: File): Promise<User> {
    const payload = new FormData();
    payload.append('avatar', file);
    const { data } = await apiClient.patch<User>('/auth/me/', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password/', { currentPassword, newPassword });
  },

  async logout(refresh: string, access: string): Promise<void> {
    await apiClient.post('/auth/logout/', { refresh }, {
      headers: { Authorization: `Bearer ${access}` },
    });
  },
};
