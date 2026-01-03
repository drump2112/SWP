import api from './client';

export interface Tank {
  id: number;
  storeId: number;
  tankCode: string;
  name: string;
  capacity: number;
  productId: number;
  currentStock: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  store?: any;
  product?: any;
}

export interface CreateTankDto {
  storeId: number;
  tankCode: string;
  name: string;
  capacity: number;
  productId: number;
  currentStock?: number;
  isActive?: boolean;
}

export interface UpdateTankDto {
  tankCode?: string;
  name?: string;
  capacity?: number;
  productId?: number;
  currentStock?: number;
  isActive?: boolean;
}

export const tanksApi = {
  getAll: async (): Promise<Tank[]> => {
    const response = await api.get('/tanks');
    return response.data;
  },

  getById: async (id: number): Promise<Tank> => {
    const response = await api.get(`/tanks/${id}`);
    return response.data;
  },

  getByStore: async (storeId: number): Promise<Tank[]> => {
    const response = await api.get(`/tanks/store/${storeId}`);
    return response.data;
  },

  create: async (data: CreateTankDto): Promise<Tank> => {
    const response = await api.post('/tanks', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTankDto): Promise<Tank> => {
    const response = await api.put(`/tanks/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/tanks/${id}`);
  },
};
