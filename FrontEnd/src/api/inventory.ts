import client from './client';

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

export const inventoryApi = {
  createDocument: (data: CreateInventoryDocumentDto) => client.post('/inventory/documents', data),
  getInventoryReport: (warehouseId: number) => client.get(`/inventory/report/${warehouseId}`),
};
