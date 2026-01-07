import api from './client';

export interface OverviewData {
  revenue: {
    current: number;
    previous: number;
    change: number;
  };
  shifts: {
    current: number;
    previous: number;
    change: number;
  };
  sales: {
    current: number;
    previous: number;
    change: number;
  };
  debt: {
    customersCount: number;
    totalAmount: number;
  };
}

export interface MonthlyRevenueData {
  month: string;
  year: number;
  monthNumber: number;
  revenue: number;
}

export interface StoreRevenueData {
  storeId: number;
  storeName: string;
  storeCode: string;
  revenue: number;
  salesCount: number;
}

export interface StoreTrendsData {
  months: string[];
  stores: {
    storeId: number;
    storeName: string;
    storeCode: string;
    data: {
      month: string;
      revenue: number;
    }[];
  }[];
}

export interface InventoryData {
  totalValue: number;
  byStore: {
    storeId: number;
    storeName: string;
    totalValue: number;
  }[];
  byProduct: {
    productId: number;
    productName: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
  }[];
}

export interface TopProductData {
  productId: number;
  productName: string;
  productCode: string;
  totalQuantity: number;
  totalRevenue: number;
  salesCount: number;
}

export interface DebtSummaryData {
  totalDebt: number;
  customersCount: number;
  topDebtors: {
    customerId: number;
    customerName: string;
    customerCode: string;
    debtAmount: number;
  }[];
}

export interface StorePerformanceData {
  storeId: number;
  storeName: string;
  storeCode: string;
  revenue: number;
  shiftsCount: number;
  salesCount: number;
  avgRevenuePerShift: number;
}

export interface QuantityByStoreData {
  products: {
    id: number;
    name: string;
  }[];
  storeData: {
    storeId: number;
    storeName: string;
    storeCode: string;
    productQuantities: Record<string, number>;
    totalQuantity: number;
  }[];
}

export const analyticsApi = {
  getOverview: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<OverviewData> => {
    const { data } = await api.get('/analytics/overview', { params });
    return data;
  },

  getMonthlyRevenue: async (params?: {
    months?: number;
    storeId?: number;
  }): Promise<MonthlyRevenueData[]> => {
    const { data } = await api.get('/analytics/revenue/monthly', { params });
    return data;
  },

  getRevenueByStore: async (params: {
    fromDate: string;
    toDate: string;
  }): Promise<StoreRevenueData[]> => {
    const { data } = await api.get('/analytics/revenue/by-store', { params });
    return data;
  },

  getStoreTrends: async (params?: {
    months?: number;
  }): Promise<StoreTrendsData> => {
    const { data } = await api.get('/analytics/revenue/store-trends', { params });
    return data;
  },

  getTotalInventory: async (): Promise<InventoryData> => {
    const { data } = await api.get('/analytics/inventory/total');
    return data;
  },

  getInventoryByProduct: async (params?: {
    limit?: number;
  }): Promise<any[]> => {
    const { data } = await api.get('/analytics/inventory/by-product', { params });
    return data;
  },

  getTopProducts: async (params: {
    fromDate: string;
    toDate: string;
    limit?: number;
  }): Promise<TopProductData[]> => {
    const { data } = await api.get('/analytics/sales/top-products', { params });
    return data;
  },

  getDebtSummary: async (): Promise<DebtSummaryData> => {
    const { data } = await api.get('/analytics/debt/summary');
    return data;
  },

  getStorePerformance: async (params: {
    fromDate: string;
    toDate: string;
  }): Promise<StorePerformanceData[]> => {
    const { data } = await api.get('/analytics/performance/stores', { params });
    return data;
  },

  getQuantityByStore: async (params: {
    fromDate: string;
    toDate: string;
  }): Promise<QuantityByStoreData> => {
    const { data } = await api.get('/analytics/sales/quantity-by-store', { params });
    return data;
  },
};
