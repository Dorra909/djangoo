import { apiClient } from './client';

export interface CourseDocument {
  id: number;
  courseId: number;
  title: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  pageCount: number | null;
  errorMessage: string;
  createdAt: string;
}

export const documentsApi = {
  async list(courseId: number): Promise<CourseDocument[]> {
    const { data } = await apiClient.get<CourseDocument[]>(`/courses/${courseId}/documents/`);
    return data;
  },
  async upload(courseId: number, file: File, onProgress: (progress: number) => void) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<CourseDocument>(
      `/courses/${courseId}/documents/`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: event => {
          if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
    );
    return data;
  },
  async status(id: number): Promise<CourseDocument> {
    const { data } = await apiClient.get<CourseDocument>(`/documents/${id}/status/`);
    return data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/documents/${id}/`);
  },
};
