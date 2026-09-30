import { mockComplaints } from '../mocks/data';
import type { Complaint } from '../types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
let complaints = [...mockComplaints];

export const complaintsApi = {
  async getAll(): Promise<Complaint[]> {
    await delay(400);
    return [...complaints];
  },
  async getByAuthor(authorId: number): Promise<Complaint[]> {
    await delay(400);
    return complaints.filter(c => c.authorId === authorId);
  },
  async create(data: Omit<Complaint, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Complaint> {
    await delay(600);
    const now = new Date().toISOString();
    const newComplaint: Complaint = { ...data, id: Date.now(), status: 'Open', createdAt: now, updatedAt: now };
    complaints.push(newComplaint);
    return newComplaint;
  },
  async updateStatus(id: number, status: Complaint['status'], adminReply?: string): Promise<Complaint> {
    await delay(400);
    complaints = complaints.map(c => c.id === id ? { ...c, status, adminReply: adminReply ?? c.adminReply, updatedAt: new Date().toISOString() } : c);
    return complaints.find(c => c.id === id)!;
  },
};
