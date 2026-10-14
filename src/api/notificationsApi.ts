import { apiClient, asArray } from './client';
import type { Notification } from '../types';

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    const { data } = await apiClient.get<Notification[] | { results: Notification[] }>(
      '/notifications/',
    );
    return asArray(data);
  },

  async markRead(id: number): Promise<Notification> {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}/read/`);
    return data;
  },
};
