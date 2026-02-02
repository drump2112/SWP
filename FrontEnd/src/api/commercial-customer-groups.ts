import api from './client';

export interface CustomerGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  discount_percent?: number;
  credit_limit?: number;
  credit_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerGroupDto {
  code: string;
  name: string;
  description?: string;
  discount_percent?: number;
  credit_limit?: number;
  credit_days?: number;
  is_active?: boolean;
}

export const customerGroupsAPI = {
  getAll: () => api.get<CustomerGroup[]>('/commercial/customer-groups'),
  getActive: () => api.get<CustomerGroup[]>('/commercial/customer-groups/active'),
  getOne: (id: number) => api.get<CustomerGroup>(`/commercial/customer-groups/${id}`),
  create: (data: CreateCustomerGroupDto) => api.post<CustomerGroup>('/commercial/customer-groups', data),
  update: (id: number, data: Partial<CreateCustomerGroupDto>) =>
    api.patch<CustomerGroup>(`/commercial/customer-groups/${id}`, data),
  delete: (id: number) => api.delete(`/commercial/customer-groups/${id}`),
};
