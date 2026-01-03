import api from './client';

export interface Region {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const regionsApi = {
  getAll: async (): Promise<Region[]> => {
    const response = await api.get('/regions');
    return response.data;
  },

  getById: async (id: number): Promise<Region> => {
    const response = await api.get(`/regions/${id}`);
    return response.data;
  },
};
