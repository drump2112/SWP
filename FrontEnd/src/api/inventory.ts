import client from "./client";

export interface InventoryItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  tankId?: number;
}

export interface CreateInventoryDocumentDto {
  warehouseId?: number;
  storeId?: number;
  docType: string;
  docDate: string;
  supplierName?: string;
  invoiceNumber?: string;
  licensePlate?: string;
  items: InventoryItemDto[];
}

export interface TruckCompartmentDto {
  compartmentNumber: number;
  productId: number;
  compartmentHeight?: number;
  truckTemperature?: number;
  truckVolume?: number;
  warehouseHeight?: number;
  actualTemperature?: number;
  actualVolume?: number;
  receivedVolume?: number;
  heightLossTruck?: number;
  heightLossWarehouse?: number;
}

export interface CreateInventoryDocumentWithTruckDto {
  storeId?: number;
  warehouseId?: number;
  shiftId?: number; // Liên kết phiếu nhập với ca làm việc
  docType: string;
  docDate: string;
  supplierName?: string;
  invoiceNumber?: string;
  licensePlate: string;
  driverName?: string;
  driverPhone?: string;
  compartments: TruckCompartmentDto[];
  notes?: string;
}

export interface InventoryReportItem {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  openingBalance: number;
  importQuantity: number;
  exportQuantity: number;
  closingBalance: number;
}

export interface StockProductDto {
  productId: number;
  productCode: string;
  productName: string;
  totalStock: number;
  unit: string;
}

export interface StockReportDto {
  storeId: number;
  warehouseId: number;
  reportDate: string;
  products: StockProductDto[];
}

export const inventoryApi = {
  createDocument: async (data: CreateInventoryDocumentDto) => {
    const response = await client.post("/inventory/documents", data);
    return response.data;
  },
  createDocumentWithTruck: async (data: CreateInventoryDocumentWithTruckDto) => {
    const response = await client.post("/inventory/documents/with-truck", data);
    return response.data;
  },
  getDocumentWithTruck: async (documentId: number) => {
    const response = await client.get(`/inventory/documents/with-truck/${documentId}`);
    return response.data;
  },
  exportDocumentToExcel: async (documentId: number) => {
    const response = await client.get(`/inventory/documents/with-truck/${documentId}/export-excel`, {
      responseType: "blob",
    });
    return response.data;
  },
  getInventoryReport: async (warehouseId: number, fromDate?: string, toDate?: string, priceId?: number) => {
    const response = await client.get<InventoryReportItem[]>(`/inventory/report/${warehouseId}`, {
      params: { fromDate, toDate, priceId },
    });
    return response.data;
  },
  getInventoryReportByStore: async (storeId: number, fromDate?: string, toDate?: string, priceId?: number) => {
    const response = await client.get<InventoryReportItem[]>(`/inventory/report-by-store/${storeId}`, {
      params: { fromDate, toDate, priceId },
    });
    return response.data;
  },
  getStockReport: async (storeId: number) => {
    const response = await client.get<StockReportDto>(`/inventory/stock-report/${storeId}`);
    return response.data;
  },
  getDocuments: async (storeId: number, type: string, fromDate: string, toDate: string) => {
    const response = await client.get<any[]>(`/inventory/documents`, { params: { storeId, type, fromDate, toDate } });
    return response.data;
  },
  getDocumentsByShift: async (shiftId: number) => {
    const response = await client.get<any[]>(`/inventory/documents/by-shift/${shiftId}`);
    return response.data;
  },
  deleteDocument: async (documentId: number) => {
    const response = await client.delete(`/inventory/documents/${documentId}`);
    return response.data;
  },
};
