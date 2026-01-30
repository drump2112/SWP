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
  isActive?: boolean;
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
  warningLevel: 'safe' | 'warning' | 'danger' | 'overlimit' | 'unlocked';
  bypassCreditLimit?: boolean;
  isBypassed?: boolean;
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
  // Bypass info
  bypassCreditLimit: boolean;
  bypassUntil: string | null;
  isBypassed: boolean;
  bypassLevel: 'none' | 'store' | 'global';
}

export interface CustomerStoreLimitsResponse {
  customerId: number;
  customerName: string;
  customerCode: string;
  defaultCreditLimit: number | null;
  // Global bypass info
  bypassCreditLimit: boolean;
  bypassUntil: string | null;
  storeLimits: StoreCreditLimit[];
}

export interface DebtLimitValidation {
  isValid: boolean;
  isBypassed?: boolean;
  bypassLevel?: 'none' | 'store' | 'global';
  bypassUntil?: string | null;
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

  toggleActive: async (id: number): Promise<Customer> => {
    const response = await api.put(`/customers/${id}/toggle-active`);
    return response.data;
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

  // ============ BYPASS CREDIT LIMIT APIs ============

  toggleCustomerBypass: async (
    customerId: number,
    bypassCreditLimit: boolean,
    bypassUntil?: string | null
  ): Promise<Customer> => {
    const response = await api.put(`/customers/${customerId}/bypass`, {
      bypassCreditLimit,
      bypassUntil,
    });
    return response.data;
  },

  toggleStoreBypass: async (
    customerId: number,
    storeId: number,
    bypassCreditLimit: boolean,
    bypassUntil?: string | null
  ): Promise<CustomerStoreLimitsResponse> => {
    const response = await api.put(
      `/customers/${customerId}/stores/${storeId}/bypass`,
      { bypassCreditLimit, bypassUntil }
    );
    return response.data;
  },

  getBypassStatus: async (
    customerId: number,
    storeId: number
  ): Promise<{
    isBypassed: boolean;
    bypassLevel: 'none' | 'store' | 'global';
    bypassUntil: string | null;
    isExpired: boolean;
  }> => {
    const response = await api.get(
      `/customers/${customerId}/stores/${storeId}/bypass-status`
    );
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
