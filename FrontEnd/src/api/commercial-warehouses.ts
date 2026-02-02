import api from './client';

export interface CommercialWarehouse {
  id: number;
  code: string;
  name: string;
  region_id: number;
  address?: string;
  manager_name?: string;
  phone?: string;
  capacity?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  region?: {
    id: number;
    name: string;
  };
}

export interface CreateWarehouseDto {
  code: string;
  name: string;
  region_id: number;
  address?: string;
  manager_name?: string;
  phone?: string;
  capacity?: number;
  notes?: string;
  is_active?: boolean;
}

export const warehousesAPI = {
  getAll: (region_id?: number) => {
    const params = region_id ? { region_id } : {};
    return api.get<CommercialWarehouse[]>('/commercial/warehouses', { params });
  },
  getOne: (id: number) => api.get<CommercialWarehouse>(`/commercial/warehouses/${id}`),
  create: (data: CreateWarehouseDto) => api.post<CommercialWarehouse>('/commercial/warehouses', data),
  update: (id: number, data: Partial<CreateWarehouseDto>) =>
    api.patch<CommercialWarehouse>(`/commercial/warehouses/${id}`, data),
  delete: (id: number) => api.delete(`/commercial/warehouses/${id}`),
};
