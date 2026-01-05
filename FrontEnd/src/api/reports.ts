import api from './client';

export interface DebtReportParams {
  storeId?: number;
  customerId?: number;
  fromDate?: string;
  toDate?: string;
}

export interface DebtReportItem {
  customer: {
    id: number;
    code: string;
    name: string;
    phone?: string;
    address?: string;
    creditLimit?: number;
  };
  openingBalance: number; // Dư đầu kỳ
  totalDebit: number; // Phát sinh nợ
  totalCredit: number; // Phát sinh có
  closingBalance: number; // Dư cuối kỳ
  ledgers: Array<{
    id: number;
    date: string;
    refType: string;
    refId: number;
    debit: number;
    credit: number;
    notes?: string;
  }>;
}

export interface ShiftDetailReport {
  shift: {
    id: number;
    shiftNo: number;
    shiftDate: string;
    status: string;
    openedAt: string;
    closedAt?: string;
    store: {
      id: number;
      code: string;
      name: string;
    };
  };
  pumpReadings: Array<{
    pumpCode: string;
    pumpName: string;
    productName: string;
    startReading: number;
    endReading: number;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  debtSales: Array<{
    customerCode: string;
    customerName: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  summary: {
    totalFromPumps: number;
    totalDebtSales: number;
    totalRetailSales: number;
    totalReceipts: number;
    totalDeposits: number;
    cashBalance: number;
  };
}

export interface CashReportParams {
  storeId?: number;
  fromDate?: string;
  toDate?: string;
}

export interface CashReportData {
  openingBalance: number; // Số dư đầu kỳ
  totalCashIn: number; // Tổng tiền thu
  totalCashOut: number; // Tổng tiền chi
  closingBalance: number; // Số dư cuối kỳ
  ledgers: Array<{
    id: number;
    date: string;
    refType: string; // RECEIPT, DEPOSIT, ADJUST
    refId: number;
    cashIn: number;
    cashOut: number;
    balance: number; // Số dư luỹ kế
    storeName: string;
    details?: {
      type: string;
      // For RECEIPT
      receiptType?: string;
      customers?: Array<{
        customerName: string;
        amount: number;
      }>;
      totalAmount?: number;
      // For DEPOSIT
      depositDate?: string;
      depositTime?: string;
      receiverName?: string;
      amount?: number;
      notes?: string;
    };
  }>;
}

export interface SalesReportParams {
  fromDate: string;
  toDate: string;
  storeIds?: number[];
  productId?: number;
}

export interface SalesReportItem {
  storeId: number;
  storeName: string;
  productId: number;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
}

export interface SalesByPumpItem {
  pumpId: number;
  pumpCode: string;
  pumpName: string;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
}

export interface SalesByProductItem {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
}

export const reportsApi = {
  // Báo cáo doanh thu bán hàng
  getSalesReport: async (params: SalesReportParams): Promise<SalesReportItem[]> => {
    const queryParams: any = {
      fromDate: params.fromDate,
      toDate: params.toDate,
    };
    if (params.storeIds && params.storeIds.length > 0) {
      queryParams.storeIds = params.storeIds.join(',');
    }
    if (params.productId) {
      queryParams.productId = params.productId;
    }
    const { data } = await api.get('/reports/sales', { params: queryParams });
    return data;
  },

  // Báo cáo công nợ
  getDebtReport: async (params: DebtReportParams): Promise<DebtReportItem[]> => {
    const { data } = await api.get('/reports/debt', { params });
    return data;
  },

  // Báo cáo chi tiết ca
  getShiftDetailReport: async (shiftId: number): Promise<ShiftDetailReport> => {
    const { data } = await api.get(`/reports/shift/${shiftId}`);
    return data;
  },

  // Báo cáo sổ quỹ tiền mặt
  getCashReport: async (params: CashReportParams): Promise<CashReportData> => {
    const { data } = await api.get('/reports/cash', { params });
    return data;
  },

  // Báo cáo xuất hàng theo cột bơm
  getSalesByPump: async (params: { storeId?: number; fromDate: string; toDate: string }): Promise<SalesByPumpItem[]> => {
    const { data } = await api.get('/reports/sales/by-pump', { params });
    return data;
  },

  // Báo cáo xuất hàng theo mặt hàng
  getSalesByProduct: async (params: { storeId?: number; fromDate: string; toDate: string }): Promise<SalesByProductItem[]> => {
    const { data } = await api.get('/reports/sales/by-product', { params });
    return data;
  },
};
