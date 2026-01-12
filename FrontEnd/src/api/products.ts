import api from './client';

export interface Product {
  id: number;
  code: string;
  name: string;
  unit: string;
  isFuel: boolean;
}

export interface CreateProductDto {
  code: string;
  name: string;
  unit?: string;
  isFuel?: boolean;
}

export interface UpdateProductDto {
  code?: string;
  name?: string;
  unit?: string;
  isFuel?: boolean;
}

export interface ProductPrice {
  id: number;
  productId: number;
  regionId: number;
  price: number;
  validFrom: string;
  validTo?: string;
  createdAt?: string;
  product?: Product;
  region?: {
    id: number;
    name: string;
  };
}

export interface CreateProductPriceDto {
  productId: number;
  regionId: number;
  price: number;
  validFrom: string;
  validTo?: string;
}

export interface ProductPriceItem {
  productId: number;
  price: number;
}

export interface SetRegionPricesDto {
  regionId: number;
  prices: ProductPriceItem[];
  validFrom: string;
  validTo?: string;
}

export interface UpdateProductPriceDto {
  price?: number;
  validFrom?: string;
  validTo?: string;
}

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get('/products');
    return response.data;
  },

  getById: async (id: number): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await api.post('/products', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProductDto): Promise<Product> => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  // Price management
  createPrice: async (data: CreateProductPriceDto): Promise<ProductPrice> => {
    const response = await api.post('/products/prices', data);
    return response.data;
  },

  getCurrentPrice: async (productId: number, regionId: number): Promise<ProductPrice> => {
    const response = await api.get(`/products/${productId}/price/${regionId}`);
    return response.data;
  },

  getPriceHistory: async (productId: number, regionId: number): Promise<ProductPrice[]> => {
    const response = await api.get(`/products/${productId}/price-history/${regionId}`);
    return response.data;
  },

  getPricesByRegion: async (regionId: number): Promise<ProductPrice[]> => {
    const response = await api.get(`/products/region/${regionId}/prices`);
    return response.data;
  },

  // === New comprehensive price management APIs ===

  /**
   * Set giá cho nhiều sản phẩm trong một khu vực
   * Giá sẽ tự động áp dụng cho tất cả các cửa hàng trong khu vực đó
   */
  setRegionPrices: async (data: SetRegionPricesDto): Promise<{
    message: string;
    prices: ProductPrice[];
  }> => {
    const response = await api.post('/products/region-prices', data);
    return response.data;
  },

  /**
   * Lấy tất cả giá hiện tại của một sản phẩm cho tất cả khu vực
   */
  getProductPricesAllRegions: async (productId: number): Promise<ProductPrice[]> => {
    const response = await api.get(`/products/${productId}/prices-all-regions`);
    return response.data;
  },

  /**
   * Lấy giá hiện tại của một sản phẩm cho một cửa hàng cụ thể
   * Giá được lấy dựa trên khu vực của cửa hàng
   */
  getProductPriceByStore: async (productId: number, storeId: number): Promise<ProductPrice> => {
    const response = await api.get(`/products/${productId}/price-by-store/${storeId}`);
    return response.data;
  },

  /**
   * Lấy tất cả giá hiện tại cho một cửa hàng (dựa trên khu vực)
   */
  getAllPricesByStore: async (storeId: number): Promise<ProductPrice[]> => {
    const response = await api.get(`/products/store/${storeId}/all-prices`);
    return response.data;
  },

  /**
   * Update một giá cụ thể
   */
  updatePrice: async (priceId: number, data: UpdateProductPriceDto): Promise<ProductPrice> => {
    const response = await api.put(`/products/prices/${priceId}`, data);
    return response.data;
  },

  /**
   * Xóa một giá
   */
  deletePrice: async (priceId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/products/prices/${priceId}`);
    return response.data;
  },

  /**
   * Lấy tất cả kỳ giá (dùng cho dropdown filter trong báo cáo)
   */
  getAllPrices: async (): Promise<ProductPrice[]> => {
    const response = await api.get('/products/prices/all');
    return response.data;
  },
};
