import api from './client';

export interface Pump {
  id: number;
  storeId: number;
  tankId: number;
  pumpCode: string;
  name: string;
  productId: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  store?: any;
  tank?: any;
  product?: any;
}

export interface CreatePumpDto {
  storeId: number;
  tankId: number;
  pumpCode: string;
  name: string;
  productId: number;
  isActive?: boolean;
}

export interface UpdatePumpDto {
  tankId?: number;
  pumpCode?: string;
  name?: string;
  productId?: number;
  isActive?: boolean;
}

export const pumpsApi = {
  getAll: async (): Promise<Pump[]> => {
    const response = await api.get('/pumps');
    return response.data;
  },

  getById: async (id: number): Promise<Pump> => {
    const response = await api.get(`/pumps/${id}`);
    return response.data;
  },

  getByStore: async (storeId: number): Promise<Pump[]> => {
    const response = await api.get(`/pumps/store/${storeId}`);
    return response.data;
  },

  getByTank: async (tankId: number): Promise<Pump[]> => {
    const response = await api.get(`/pumps/tank/${tankId}`);
    return response.data;
  },

  create: async (data: CreatePumpDto): Promise<Pump> => {
    const response = await api.post('/pumps', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePumpDto): Promise<Pump> => {
    const response = await api.put(`/pumps/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/pumps/${id}`);
  },
};
