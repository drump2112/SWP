import api from './client';

export interface ImportDetailItem {
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  product_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity_a95: number;
  quantity_do: number;
  quantity_e5: number;
  quantity_do001: number;
  total_quantity: number;
  total_amount: number;
}

export interface ExportDetailItem {
  customer_group_id: number | null;
  customer_group_name: string;
  customer_id: number | null;
  customer_name: string | null;
  warehouse_id: number;
  warehouse_name: string;
  quantity_a95: number;
  quantity_do: number;
  quantity_e5: number;
  quantity_do001: number;
  total_quantity: number;
  revenue_a95: number;
  revenue_do: number;
  revenue_e5: number;
  revenue_do001: number;
  revenue: number;
  cost: number;
  profit_a95: number;
  profit_do: number;
  profit_e5: number;
  profit: number;
}

export interface DetailedInventoryReport {
  imports: ImportDetailItem[];
  exports: ExportDetailItem[];
  summary: {
    total_import_quantity: number;
    total_import_amount: number;
    total_export_quantity: number;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
  };
}

export const inventoryReportAPI = {
  getDetailedReport: async (params: { start_date: string; end_date: string; warehouse_id?: number; supplier_id?: number }) => {
    try {
      const response = await api.get<DetailedInventoryReport>(`/commercial/reports/inventory/detailed`, { params });
      console.log('[inventoryReportAPI] getDetailedReport success:', response.data);
      return response;
    } catch (error) {
      console.error('[inventoryReportAPI] getDetailedReport error:', error);
      throw error;
    }
  },
};
