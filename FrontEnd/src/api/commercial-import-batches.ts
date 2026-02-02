import api from './client';

export interface ImportBatch {
  id: number;
  warehouse_id: number;
  supplier_id: number;
  product_id: number;
  batch_code: string;
  import_quantity: number;
  remaining_quantity: number;
  exported_quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  final_unit_price: number;
  import_date: string;
  invoice_number?: string;
  vehicle_number?: string;
  vat_percent: number;
  vat_amount: number;
  environmental_tax_rate: number;
  environmental_tax_amount: number;
  subtotal: number;
  total_amount: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  warehouse?: {
    id: number;
    name: string;
  };
  supplier?: {
    id: number;
    name: string;
  };
  product?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface CreateImportBatchDto {
  warehouse_id: number;
  supplier_id: number;
  product_id: number;
  batch_code: string;
  import_quantity: number;
  unit_price: number;
  discount_percent?: number;
  invoice_number?: string;
  vehicle_number?: string;
  vat_percent?: number;
  environmental_tax_rate?: number;
  notes?: string;
}

export const importBatchesAPI = {
  getAll: (filters?: {
    warehouse_id?: number;
    supplier_id?: number;
    product_id?: number;
    from_date?: string;
    to_date?: string;
  }) => api.get<ImportBatch[]>('/commercial/import-batches', { params: filters }),

  getAvailable: (product_id: number, warehouse_id?: number) => {
    const params = warehouse_id ? { warehouse_id } : {};
    return api.get<ImportBatch[]>(`/commercial/import-batches/available/${product_id}`, { params });
  },

  getOne: (id: number) => api.get<ImportBatch>(`/commercial/import-batches/${id}`),

  create: (data: CreateImportBatchDto) => api.post<ImportBatch>('/commercial/import-batches', data),

  update: (id: number, data: Partial<CreateImportBatchDto>) =>
    api.patch<ImportBatch>(`/commercial/import-batches/${id}`, data),

  delete: (id: number) => api.delete(`/commercial/import-batches/${id}`),
};
