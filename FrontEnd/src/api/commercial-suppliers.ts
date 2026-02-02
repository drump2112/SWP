import api from './client';

export interface Supplier {
  id: number;
  code: string;
  name: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  bank_account?: string;
  bank_name?: string;
  payment_terms?: string;
  credit_limit?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierDto {
  code: string;
  name: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  bank_account?: string;
  bank_name?: string;
  payment_terms?: string;
  credit_limit?: number;
  notes?: string;
  is_active?: boolean;
}

export const suppliersAPI = {
  getAll: () => api.get<Supplier[]>('/commercial/suppliers'),
  getActive: () => api.get<Supplier[]>('/commercial/suppliers/active'),
  getOne: (id: number) => api.get<Supplier>(`/commercial/suppliers/${id}`),
  create: (data: CreateSupplierDto) => api.post<Supplier>('/commercial/suppliers', data),
  update: (id: number, data: Partial<CreateSupplierDto>) =>
    api.patch<Supplier>(`/commercial/suppliers/${id}`, data),
  delete: (id: number) => api.delete(`/commercial/suppliers/${id}`),
};
