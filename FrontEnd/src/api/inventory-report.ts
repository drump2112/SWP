import axios from 'axios';

const API_URL = 'http://localhost:3000/api/commercial/reports/inventory';

export interface InventoryReportItem {
  warehouse_id: number;
  warehouse_name: string;
  product_id: number;
  product_name: string;
  opening_stock: number;
  total_imported: number;
  total_exported: number;
  closing_stock: number;
}

export const inventoryReportAPI = {
  getReport: (params: { start_date: string; end_date: string; warehouse_id?: number }) =>
    axios.get<InventoryReportItem[]>(API_URL, { params }),
};
