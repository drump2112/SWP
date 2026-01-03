import api from './client';

export interface Role {
  id: number;
  code: string;
  name: string;
}

export const rolesApi = {
  getAll: async (): Promise<Role[]> => {
    const response = await api.get('/roles');
    return response.data;
  },
};
