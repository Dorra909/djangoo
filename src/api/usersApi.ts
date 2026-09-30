import { mockUsers } from '../mocks/data';
import type { User } from '../types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
let users = [...mockUsers];

export const usersApi = {
  async getAll(): Promise<User[]> {
    await delay(400);
    return [...users];
    // Real: return apiClient.get('/users/').then(r => r.data);
  },
  async getById(id: number): Promise<User> {
    await delay(300);
    const u = users.find(u => u.id === id);
    if (!u) throw new Error('Utilisateur non trouvé');
    return u;
  },
  async create(data: Partial<User>): Promise<User> {
    await delay(500);
    const newUser: User = { id: Date.now(), isActive: true, createdAt: new Date().toISOString(), role: 'ETUDIANT', fullName: '', email: '', ...data } as User;
    users.push(newUser);
    return newUser;
  },
  async update(id: number, data: Partial<User>): Promise<User> {
    await delay(400);
    users = users.map(u => u.id === id ? { ...u, ...data } : u);
    return users.find(u => u.id === id)!;
  },
  async delete(id: number): Promise<void> {
    await delay(400);
    users = users.filter(u => u.id !== id);
  },
  async toggleActive(id: number): Promise<User> {
    await delay(300);
    users = users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u);
    return users.find(u => u.id === id)!;
  },
};
