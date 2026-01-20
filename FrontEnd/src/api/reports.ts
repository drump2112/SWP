import api from "./client";

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
  refType?: string;
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

export const reportsApi = {
  // Báo cáo công nợ
  getDebtReport: async (params: DebtReportParams): Promise<DebtReportItem[]> => {
    const { data } = await api.get("/reports/debt", { params });
    return data;
  },

  // Báo cáo chi tiết ca
  getShiftDetailReport: async (shiftId: number): Promise<ShiftDetailReport> => {
    const { data } = await api.get(`/reports/shift/${shiftId}`);
    return data;
  },

  // Báo cáo sổ quỹ tiền mặt
  getCashReport: async (params: CashReportParams): Promise<CashReportData> => {
    const { data } = await api.get("/reports/cash", { params });
    return data;
  },

  // Báo cáo doanh thu / xuất hàng
  getRevenueSalesReport: async (params: RevenueSalesReportParams): Promise<RevenueSalesReportResponse> => {
    const { data } = await api.get("/reports/revenue-sales", { params });
    return data;
  },

  // Lấy danh sách kỳ giá (dropdown)
  getPricePeriods: async (): Promise<PricePeriod[]> => {
    const { data } = await api.get("/reports/price-periods");
    return data;
  },

  // Báo cáo doanh thu theo khách hàng
  getSalesByCustomerReport: async (params: SalesByCustomerReportParams): Promise<SalesByCustomerReportResponse> => {
    const { data } = await api.get("/reports/sales-by-customer", { params });
    return data;
  },

  // Báo cáo ca (theo shift/pump readings)
  getSalesByShift: async (params: { storeId?: number; fromDate: string; toDate: string }): Promise<any[]> => {
    const { data } = await api.get("/reports/sales-by-shift", { params });
    return data;
  },
};

// ========== REVENUE SALES REPORT ==========
export interface RevenueSalesReportParams {
  productId?: number;
  storeId?: number;
  fromDateTime?: string; // Thời gian bắt đầu (có giờ/phút/giây)
  toDateTime?: string; // Thời gian kết thúc (có giờ/phút/giây)
}

// Kỳ giá (dropdown)
export interface PricePeriod {
  priceId: number;
  productId: number;
  productCode: string;
  productName: string;
  validFrom: string;
  validTo: string | null;
  price: number;
  label: string; // "Xăng RON95: 01/01/2025 15:00 → 08/01/2025 15:00"
}

// Chi tiết mặt hàng trong cửa hàng
// Bao gồm: Tổng xuất, Công nợ, Bán lẻ
export interface ProductDetail {
  productId: number;
  productCode: string;
  productName: string;
  // Tổng xuất bán (tất cả sales)
  totalQuantity: number;
  totalAmount: number;
  // Bán công nợ (có customerId)
  debtQuantity: number;
  debtAmount: number;
  // Bán lẻ = Tổng - Công nợ
  retailQuantity: number;
  retailAmount: number;
}

// Chi tiết cửa hàng
export interface StoreDetail {
  storeId: number;
  storeCode: string;
  storeName: string;
  // Tổng xuất bán
  totalQuantity: number;
  totalAmount: number;
  // Bán công nợ
  debtQuantity: number;
  debtAmount: number;
  // Bán lẻ = Tổng - Công nợ
  retailQuantity: number;
  retailAmount: number;
  products: ProductDetail[];
}

export interface RevenueSalesReportSummary {
  totalQuantity: number;
  totalAmount: number;
  debtQuantity: number;
  debtAmount: number;
  retailQuantity: number;
  retailAmount: number;
}

export interface RevenueSalesReportResponse {
  stores: StoreDetail[];
  summary: RevenueSalesReportSummary;
}

// ========== SALES BY CUSTOMER REPORT ==========
export interface SalesByCustomerReportParams {
  customerId?: number;
  storeId?: number;
  productId?: number;
  fromDateTime?: string;
  toDateTime?: string;
}

export interface CustomerProductDetail {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  amount: number;
}

export interface CustomerDetail {
  customerId: number;
  customerCode: string;
  customerName: string;
  totalQuantity: number;
  totalAmount: number;
  products: CustomerProductDetail[];
}

export interface SalesByCustomerReportResponse {
  customers: CustomerDetail[];
  summary: {
    totalQuantity: number;
    totalAmount: number;
  };
}
