import api from './client';

export interface Customer {
  id: number;
  code: string;
  name: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  type?: 'EXTERNAL' | 'INTERNAL';
  creditLimit?: number;
  notes?: string;
  customerStores?: { storeId: number; store?: { name: string } }[];
}

export interface CreateCustomerDto {
  code?: string;
  storeId?: number;
  name: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  type?: 'EXTERNAL' | 'INTERNAL';
  creditLimit?: number;
  notes?: string;
}

export interface UpdateCustomerDto {
  code?: string;
  name?: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  type?: 'EXTERNAL' | 'INTERNAL';
  storeId?: number;
  creditLimit?: number;
  notes?: string;
}

export interface CreditStatus {
  customerId: number;
  customerName: string;
  customerCode: string;
  customerType?: 'EXTERNAL' | 'INTERNAL';
  storeId?: number;
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  creditUsagePercent: number;
  isOverLimit: boolean;
  warningLevel: 'safe' | 'warning' | 'danger' | 'overlimit';
}

export const customersApi = {
  getAll: async (storeId?: number): Promise<Customer[]> => {
    const params = storeId ? { storeId } : {};
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  create: async (data: CreateCustomerDto): Promise<Customer> => {
    const response = await api.post('/customers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCustomerDto): Promise<Customer> => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },

  getDebtBalance: async (id: number, storeId?: number) => {
    const params = storeId ? { storeId } : {};
    const response = await api.get(`/customers/${id}/balance`, { params });
    return response.data;
  },

  getDebtStatement: async (id: number, storeId?: number) => {
    const params = storeId ? { storeId } : {};
    const response = await api.get(`/customers/${id}/statement`, { params });
    return response.data;
  },

  getCreditStatus: async (id: number, storeId?: number): Promise<CreditStatus> => {
    const params = storeId ? { storeId } : {};
    const response = await api.get(`/customers/${id}/credit-status`, { params });
    return response.data;
  },

  getAllCreditStatus: async (storeId?: number): Promise<CreditStatus[]> => {
    const params = storeId ? { storeId } : {};
    const response = await api.get('/customers/credit-status/all', { params });
    return response.data;
  },

  checkDuplicate: async (data: { name?: string; phone?: string; taxCode?: string }) => {
    const response = await api.post('/customers/check-duplicate', data);
    return response.data;
  },
};
