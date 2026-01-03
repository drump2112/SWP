import api from './client';

export interface Store {
  id: number;
  code: string;
  name: string;
  address: string;
  phone: string;
  regionId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  region?: {
    id: number;
    name: string;
  };
}

export interface CreateStoreDto {
  code: string;
  name: string;
  address: string;
  phone: string;
  regionId: number;
}

export interface UpdateStoreDto extends Partial<CreateStoreDto> {
  isActive?: boolean;
}

export const storesApi = {
  getAll: async (): Promise<Store[]> => {
    const response = await api.get('/stores');
    return response.data;
  },

  getById: async (id: number): Promise<Store> => {
    const response = await api.get(`/stores/${id}`);
    return response.data;
  },

  create: async (data: CreateStoreDto): Promise<Store> => {
    const response = await api.post('/stores', data);
    return response.data;
  },

  update: async (id: number, data: UpdateStoreDto): Promise<Store> => {
    const response = await api.put(`/stores/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/stores/${id}`);
  },
};
