import api from './client';
import type { ProductCategory } from './loss-config';

export interface InventoryClosingItem {
  tankId: number;
  tankCode: string;
  tankName: string;
  productId: number;
  productName: string;
  productCategory: ProductCategory;
  openingBalance: number;
  importQuantity: number;
  exportQuantity: number;
  lossRate: number;
  lossAmount: number;
  closingBalance: number;
  lossConfigId?: number;
}

export interface InventoryClosingPreview {
  storeId: number;
  storeName: string;
  periodFrom: string;
  periodTo: string;
  items: InventoryClosingItem[];
}

export interface InventoryClosing {
  id: number;
  storeId: number;
  tankId: number;
  periodFrom: string;
  periodTo: string;
  closingDate: string;
  openingBalance: number;
  importQuantity: number;
  exportQuantity: number;
  lossRate: number;
  lossAmount: number;
  closingBalance: number;
  lossConfigId: number | null;
  productCategory: string;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  tank?: {
    id: number;
    tankCode: string;
    name: string;
    product?: {
      id: number;
      name: string;
      category: string;
    };
  };
  creator?: {
    id: number;
    fullName: string;
  };
}

export interface ClosingPeriod {
  periodFrom: string;
  periodTo: string;
  closingDate: string;
}

export interface CreateInventoryClosingDto {
  storeId: number;
  periodFrom: string;
  periodTo: string;
  notes?: string;
}

export const inventoryClosingApi = {
  // Xem trước dữ liệu chốt kỳ
  preview: async (storeId: number, periodFrom: string, periodTo: string): Promise<InventoryClosingPreview> => {
    const response = await api.get('/inventory-closing/preview', {
      params: { storeId, periodFrom, periodTo },
    });
    return response.data;
  },

  // Thực hiện chốt kỳ
  execute: async (data: CreateInventoryClosingDto): Promise<InventoryClosing[]> => {
    const response = await api.post('/inventory-closing', data);
    return response.data;
  },

  // Lấy danh sách kỳ đã chốt theo store
  getByStore: async (storeId: number, fromDate?: string, toDate?: string): Promise<InventoryClosing[]> => {
    const response = await api.get(`/inventory-closing/store/${storeId}`, {
      params: { fromDate, toDate },
    });
    return response.data;
  },

  // Lấy danh sách kỳ (unique)
  getPeriods: async (storeId: number): Promise<ClosingPeriod[]> => {
    const response = await api.get(`/inventory-closing/periods/${storeId}`);
    return response.data;
  },

  // Lấy báo cáo theo kỳ đã chốt
  getReport: async (storeId: number, fromDate: string, toDate: string): Promise<{
    closedPeriods: InventoryClosing[];
    hasUnclosedPeriod: boolean;
  }> => {
    const response = await api.get(`/inventory-closing/report/${storeId}`, {
      params: { fromDate, toDate },
    });
    return response.data;
  },

  // Xóa kỳ chốt
  delete: async (storeId: number, periodFrom: string, periodTo: string): Promise<void> => {
    await api.delete('/inventory-closing', {
      params: { storeId, periodFrom, periodTo },
    });
  },
};

// Helper để format tên kỳ
export const formatPeriodName = (periodFrom: string, periodTo: string): string => {
  const from = new Date(periodFrom);
  const to = new Date(periodTo);

  // Nếu cùng tháng
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `T${from.getMonth() + 1}/${from.getFullYear()}`;
  }

  // Nếu khác tháng
  return `${from.toLocaleDateString('vi-VN')} - ${to.toLocaleDateString('vi-VN')}`;
};
