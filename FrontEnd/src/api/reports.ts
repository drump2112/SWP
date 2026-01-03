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

export const reportsApi = {
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
};
