import { apiClient, asArray } from './client';
import type { Complaint } from '../types';

export interface ComplaintCreate {
  subject: string;
  category: string;
  message: string;
  attachment?: File;
}

export const complaintsApi = {
  async getAll(status?: Complaint['status']): Promise<Complaint[]> {
    const params = status ? { status } : undefined;
    const { data } = await apiClient.get<Complaint[] | { results: Complaint[] }>('/complaints/', {
      params,
    });
    return asArray(data);
  },

  async getByAuthor(_authorId: number): Promise<Complaint[]> {
    const { data } = await apiClient.get<Complaint[] | { results: Complaint[] }>('/complaints/');
    return asArray(data);
  },

  async create(data: ComplaintCreate): Promise<Complaint> {
    const payload = new FormData();
    payload.append('subject', data.subject);
    payload.append('category', data.category);
    payload.append('message', data.message);
    if (data.attachment) payload.append('attachment', data.attachment);
    const { data: complaint } = await apiClient.post<Complaint>('/complaints/', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return complaint;
  },

  async updateStatus(
    id: number,
    status: Complaint['status'],
    adminReply?: string,
  ): Promise<Complaint> {
    const { data } = await apiClient.patch<Complaint>(`/complaints/${id}/`, {
      status,
      adminReply,
    });
    return data;
  },
};
