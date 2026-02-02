import api from './client';

export interface ExportOrderItem {
  id: number;
  export_order_id: number;
  customer_id: number;
  import_batch_id: number;
  product_id: number;
  quantity: number;
  batch_unit_price: number;
  selling_price: number;
  markup_percent: number;
  discount_percent: number;
  discount_amount: number;
  vat_percent: number;
  vat_amount: number;
  environmental_tax_rate: number;
  environmental_tax_amount: number;
  subtotal: number;
  total_amount: number;
  profit_amount: number;
  notes?: string;
  customer?: {
    id: number;
    name: string;
    code: string;
  };
  import_batch?: {
    id: number;
    batch_code: string;
    remaining_quantity: number;
    product?: {
      id: number;
      name: string;
      code: string;
    };
  };
}

export interface ExportOrder {
  id: number;
  warehouse_id: number;
  order_number: string;
  order_date: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  subtotal: number;
  total_discount: number;
  vat_percent: number;
  vat_amount: number;
  total_amount: number;
  debt_amount: number;
  payment_method?: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  warehouse?: {
    id: number;
    name: string;
  };
  items?: ExportOrderItem[];
}

export interface CreateExportOrderItemDto {
  customer_id: number;
  batch_id: number;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
}

export interface CreateExportOrderDto {
  warehouse_id: number;
  order_number?: string;
  order_date?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  vat_percent?: number;
  payment_method?: string;
  payment_status?: string;
  notes?: string;
  items: CreateExportOrderItemDto[];
}

export const exportOrdersAPI = {
  getAll: (filters?: {
    customer_id?: number;
    warehouse_id?: number;
    from_date?: string;
    to_date?: string;
    payment_status?: string;
  }) => api.get<ExportOrder[]>('/commercial/export-orders', { params: filters }),

  getOne: (id: number) => api.get<ExportOrder>(`/commercial/export-orders/${id}`),

  create: (data: CreateExportOrderDto) => api.post<ExportOrder>('/commercial/export-orders', data),

  update: (id: number, data: Partial<Omit<CreateExportOrderDto, 'items'>>) =>
    api.patch<ExportOrder>(`/commercial/export-orders/${id}`, data),

  updatePaymentStatus: (id: number, status: string) =>
    api.patch<ExportOrder>(`/commercial/export-orders/${id}/payment-status`, { status }),

  delete: (id: number) => api.delete(`/commercial/export-orders/${id}`),
};
