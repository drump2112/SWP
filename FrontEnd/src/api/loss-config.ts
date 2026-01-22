import api from './client';

export type ProductCategory = 'GASOLINE' | 'DIESEL';

export interface StoreLossConfig {
  id: number;
  storeId: number;
  productCategory: ProductCategory;
  lossRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  store?: {
    id: number;
    name: string;
    code: string;
  };
  creator?: {
    id: number;
    fullName: string;
  };
}

export interface CreateLossConfigDto {
  storeId: number;
  productCategory: ProductCategory;
  lossRate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
}

export interface UpdateLossConfigDto {
  productCategory?: ProductCategory;
  lossRate?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
}

export const lossConfigApi = {
  // Lấy tất cả cấu hình
  getAll: async (): Promise<StoreLossConfig[]> => {
    const response = await api.get('/loss-config');
    return response.data;
  },

  // Lấy cấu hình theo cửa hàng
  getByStore: async (storeId: number): Promise<StoreLossConfig[]> => {
    const response = await api.get(`/loss-config/store/${storeId}`);
    return response.data;
  },

  // Lấy cấu hình đang hiệu lực của cửa hàng
  getCurrentByStore: async (storeId: number): Promise<StoreLossConfig[]> => {
    const response = await api.get(`/loss-config/store/${storeId}/current`);
    return response.data;
  },

  // Lấy cấu hình theo ID
  getById: async (id: number): Promise<StoreLossConfig> => {
    const response = await api.get(`/loss-config/${id}`);
    return response.data;
  },

  // Tạo cấu hình mới
  create: async (data: CreateLossConfigDto): Promise<StoreLossConfig> => {
    const response = await api.post('/loss-config', data);
    return response.data;
  },

  // Cập nhật cấu hình
  update: async (id: number, data: UpdateLossConfigDto): Promise<StoreLossConfig> => {
    const response = await api.put(`/loss-config/${id}`, data);
    return response.data;
  },

  // Xóa cấu hình
  delete: async (id: number): Promise<void> => {
    await api.delete(`/loss-config/${id}`);
  },
};

// Helper function để chuyển đổi hệ số sang phần trăm hiển thị
export const lossRateToPercent = (rate: number): string => {
  return (rate * 100).toFixed(3) + '%';
};

// Helper function để chuyển đổi phần trăm sang hệ số
export const percentToLossRate = (percent: number): number => {
  return percent / 100;
};

// Helper function để lấy label cho category
export const getCategoryLabel = (category: ProductCategory): string => {
  return category === 'GASOLINE' ? 'Xăng' : 'Dầu';
};
