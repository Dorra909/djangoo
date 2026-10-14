import { apiClient, asArray } from './client';
import type { User } from '../types';

export interface CreateUser extends Pick<User, 'fullName' | 'email' | 'role'> {
  password: string;
}

export const usersApi = {
  async getAll(): Promise<User[]> {
    const { data } = await apiClient.get<User[] | { results: User[] }>('/users/');
    return asArray(data);
  },

  async getById(id: number): Promise<User> {
    const { data } = await apiClient.get<User>(`/users/${id}/`);
    return data;
  },

  async create(data: CreateUser): Promise<User> {
    const { data: user } = await apiClient.post<User>('/users/', data);
    return user;
  },

  async update(id: number, data: Partial<User>): Promise<User> {
    const { data: user } = await apiClient.patch<User>(`/users/${id}/`, data);
    return user;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}/`);
  },

  async toggleActive(id: number, isActive: boolean): Promise<User> {
    const { data } = await apiClient.patch<User>(`/users/${id}/active/`, { isActive });
    return data;
  },
};
