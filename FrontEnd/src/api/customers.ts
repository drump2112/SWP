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

export interface StoreCreditLimit {
  customerId: number;
  customerName: string;
  customerCode: string;
  storeId: number;
  storeName: string;
  creditLimit: number | null; // Hạn mức riêng (null = dùng mặc định)
  defaultCreditLimit: number | null; // Hạn mức mặc định từ customer
  effectiveLimit: number; // Hạn mức hiệu lực
  currentDebt: number;
  availableCredit: number;
  creditUsagePercent: number;
  isOverLimit: boolean;
}

export interface CustomerStoreLimitsResponse {
  customerId: number;
  customerName: string;
  customerCode: string;
  defaultCreditLimit: number | null;
  storeLimits: StoreCreditLimit[];
}

export interface DebtLimitValidation {
  isValid: boolean;
  customerId: number;
  storeId: number;
  creditLimit: number;
  currentDebt: number;
  newDebtAmount: number;
  totalDebt: number;
  exceedAmount: number;
  message: string;
}

export interface ImportCustomersResponse {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
  imported: Array<{
    row: number;
    code: string;
    name: string;
    phone: string;
  }>;
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

  importFromExcel: async (file: File, storeId?: number): Promise<ImportCustomersResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const params = storeId ? `?storeId=${storeId}` : '';
    const response = await api.post(`/customers/import${params}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // ============ CREDIT LIMIT APIs ============

  getStoreCreditLimits: async (customerId: number): Promise<CustomerStoreLimitsResponse> => {
    const response = await api.get(`/customers/${customerId}/store-credit-limits`);
    return response.data;
  },

  updateStoreCreditLimit: async (
    customerId: number,
    storeId: number,
    creditLimit: number | null
  ): Promise<CustomerStoreLimitsResponse> => {
    const response = await api.put(
      `/customers/${customerId}/stores/${storeId}/credit-limit`,
      { creditLimit }
    );
    return response.data;
  },

  validateDebtLimit: async (
    customerId: number,
    storeId: number,
    newDebtAmount: number
  ): Promise<DebtLimitValidation> => {
    const response = await api.post(`/customers/${customerId}/validate-debt-limit`, {
      storeId,
      newDebtAmount,
    });
    return response.data;
  },

  // ============ OPENING BALANCE APIs ============

  getOpeningBalanceRecords: async (storeId?: number): Promise<{
    id: number;
    customerId: number;
    customerCode: string;
    customerName: string;
    storeId: number;
    storeName: string;
    balance: number;
    notes: string;
    createdAt: string;
  }[]> => {
    const params = storeId ? { storeId } : {};
    const response = await api.get('/customers/opening-balance', { params });
    return response.data;
  },

  importOpeningBalance: async (data: {
    storeId: number;
    transactionDate: string;
    items: { customerCode: string; openingBalance: number; description?: string }[];
  }): Promise<{
    success: number;
    failed: number;
    errors: { row: number; customerCode: string; message: string }[];
    debtLedgerIds: number[];
  }> => {
    const response = await api.post('/customers/opening-balance/import', data);
    return response.data;
  },

  updateOpeningBalance: async (
    id: number,
    balance: number,
    notes?: string,
    createdAt?: string
  ): Promise<{
    message: string;
    id: number;
    newBalance: number;
  }> => {
    const response = await api.put(`/customers/opening-balance/${id}`, { balance, notes, createdAt });
    return response.data;
  },
};
