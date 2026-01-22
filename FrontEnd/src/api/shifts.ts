import api from "./client";

export interface PumpReadingDto {
  pumpCode: string;
  productId: number;
  startValue: number;
  endValue: number;
  testExport?: number; // Xuất kiểm thử / Quay kho
  unitPrice?: number; // Giá đã lưu khi chốt ca (để hiển thị đúng khi xem lại)
}

export interface InventoryImportDto {
  id?: number;
  docDate: string;
  supplierName?: string;
  licensePlate?: string;
  driverName?: string;
  productId: number;
  quantity: number;
  notes?: string;
}

export interface InventoryExportDto {
  docDate: string;
  supplierName?: string;
  productId: number;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CloseShiftDto {
  shiftId: number;
  pumpReadings: PumpReadingDto[];
  debtSales?: ShiftDebtSaleDto[];
  retailSales?: RetailSaleDto[]; // Bán lẻ - ghi cho khách hàng nội bộ
  receipts?: CreateReceiptDto[];
  deposits?: CashDepositDto[];
  inventoryImports?: InventoryImportDto[];
  inventoryExports?: InventoryExportDto[];
  closedAt?: string;
  handoverName?: string;
  receiverName?: string;
}

// DTO cho bán lẻ - ghi nhận cho khách hàng nội bộ (không phải công nợ)
export interface RetailSaleDto {
  customerId: number; // Khách hàng nội bộ
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateShiftDto {
  storeId: number;
  shiftDate: string;
  shiftNo: number;
  openedAt?: string;
  handoverName?: string;
  receiverName?: string;
}

export interface Shift {
  id: number;
  storeId: number;
  shiftDate: string;
  shiftNo: number;
  openedAt: string;
  closedAt?: string;
  status: string; // OPEN, CLOSED, ADJUSTED
  handoverName?: string;
  receiverName?: string;
  store?: any;
}

export interface ShiftReport {
  shift: Shift;
  summary: {
    totalRetailSales: number;
    totalDebtSales: number;
    totalRevenue: number;
    totalReceipts: number;
    totalDeposits: number;
    cashBalance: number; // Legacy: biến động tiền mặt trong ca
    cashMovement?: number; // Biến động tiền mặt trong ca (new field)
    actualCashBalance?: number; // Số dư quỹ thực tế từ cash_ledger
  };
  pumpReadings: any[];
  retailSales: any[];
  debtSales: any[];
  receipts: any[];
  cashDeposits: any[];
}

export interface ShiftDebtSaleDto {
  id?: number | string; // Optional ID for updates
  shiftId: number;
  customerId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CashDepositDto {
  id?: number | string; // Optional ID for updates
  storeId: number;
  shiftId?: number;
  amount: number;
  depositDate: string;
  depositTime?: string;
  receiverName?: string;
  notes?: string;
  paymentMethod?: string; // 'CASH', 'BANK_TRANSFER'
  sourceType?: 'RETAIL' | 'RECEIPT'; // Nguồn gốc: RETAIL (bán lẻ) hoặc RECEIPT (thu nợ)
}

export interface ReceiptDetailDto {
  customerId: number;
  amount: number;
}

export interface CreateReceiptDto {
  id?: number | string; // Optional ID for updates
  storeId: number;
  shiftId?: number;
  receiptType: string; // 'DEBT_COLLECTION'
  amount: number;
  details: ReceiptDetailDto[];
  notes?: string;
  paymentMethod?: string; // 'CASH', 'BANK_TRANSFER'
}

export const shiftsApi = {
  create: async (data: CreateShiftDto): Promise<Shift> => {
    const response = await api.post("/shifts", data);
    return response.data;
  },

  getById: async (id: number): Promise<Shift> => {
    const response = await api.get(`/shifts/${id}`);
    return response.data;
  },

  closeShift: async (data: CloseShiftDto): Promise<Shift> => {
    const response = await api.post("/shifts/close", data);
    return response.data;
  },

  update: async (id: number, data: CloseShiftDto): Promise<Shift> => {
    const response = await api.put(`/shifts/${id}`, data);
    return response.data;
  },

  reopenShift: async (shiftId: number): Promise<Shift> => {
    const response = await api.put(`/shifts/${shiftId}/reopen`);
    return response.data;
  },

  enableEdit: async (shiftId: number): Promise<Shift> => {
    const response = await api.put(`/shifts/${shiftId}/enable-edit`);
    return response.data;
  },

  lockShift: async (shiftId: number): Promise<Shift> => {
    const response = await api.put(`/shifts/${shiftId}/lock`);
    return response.data;
  },

  getReport: async (shiftId: number): Promise<ShiftReport> => {
    const response = await api.get(`/shifts/report/${shiftId}`);
    return response.data;
  },

  getByStore: async (storeId: number): Promise<Shift[]> => {
    const response = await api.get(`/shifts/store/${storeId}`);
    return response.data;
  },

  getAll: async (): Promise<Shift[]> => {
    const response = await api.get("/shifts");
    return response.data;
  },

  // ==================== DEBT SALES ====================

  createDebtSale: async (data: ShiftDebtSaleDto) => {
    const response = await api.post("/shifts/debt-sales", data);
    return response.data;
  },

  getShiftDebtSales: async (shiftId: number) => {
    const response = await api.get(`/shifts/${shiftId}/debt-sales`);
    return response.data;
  },

  deleteDebtSale: async (id: number) => {
    const response = await api.delete(`/shifts/debt-sales/${id}`);
    return response.data;
  },

  // ==================== CASH DEPOSITS ====================

  createCashDeposit: async (data: CashDepositDto) => {
    const response = await api.post("/shifts/cash-deposits", data);
    return response.data;
  },

  getCashDeposits: async (storeId: number, fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    const response = await api.get(`/shifts/cash-deposits/store/${storeId}?${params.toString()}`);
    return response.data;
  },

  getShiftCashDeposits: async (shiftId: number) => {
    const response = await api.get(`/shifts/${shiftId}/cash-deposits`);
    return response.data;
  },

  // ==================== RECEIPTS (PHIẾU THU) ====================

  createReceipt: async (data: CreateReceiptDto) => {
    const response = await api.post("/shifts/receipts", data);
    return response.data;
  },

  getShiftReceipts: async (shiftId: number) => {
    const response = await api.get(`/shifts/${shiftId}/receipts`);
    return response.data;
  },

  // ==================== PREVIOUS SHIFT READINGS ====================

  getPreviousShiftReadings: async (shiftId: number) => {
    const response = await api.get(`/shifts/${shiftId}/previous-readings`);
    return response.data;
  },
};
