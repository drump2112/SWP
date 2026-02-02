import api from './client';

export interface CommercialCustomer {
  id: number;
  code: string;
  name: string;
  customer_group_id: number;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  credit_limit?: number;
  credit_days?: number;
  current_debt: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  customer_group?: {
    id: number;
    name: string;
    discount_percent?: number;
  };
}

export interface CreateCommercialCustomerDto {
  code: string;
  name: string;
  customer_group_id: number;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  credit_limit?: number;
  credit_days?: number;
  notes?: string;
  is_active?: boolean;
}

export const commercialCustomersAPI = {
  getAll: (group_id?: number) => {
    const params = group_id ? { group_id } : {};
    return api.get<CommercialCustomer[]>('/commercial/customers', { params });
  },
  getActive: () => api.get<CommercialCustomer[]>('/commercial/customers/active'),
  getWithDebt: () => api.get<CommercialCustomer[]>('/commercial/customers/with-debt'),
  getOne: (id: number) => api.get<CommercialCustomer>(`/commercial/customers/${id}`),
  create: (data: CreateCommercialCustomerDto) =>
    api.post<CommercialCustomer>('/commercial/customers', data),
  update: (id: number, data: Partial<CreateCommercialCustomerDto>) =>
    api.patch<CommercialCustomer>(`/commercial/customers/${id}`, data),
  delete: (id: number) => api.delete(`/commercial/customers/${id}`),
};
