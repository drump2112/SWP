import api from './client';

// ==================== INTERFACES ====================

export interface OpeningBalanceCashDto {
  storeId: number;
  openingBalance: number;
  effectiveDate?: string;
  notes?: string;
}

export interface SetOpeningBalanceResponse {
  success: boolean;
  message: string;
  data: {
    storeId: number;
    previousBalance: number;
    targetBalance: number;
    adjustment: number;
    cashLedgerId?: number;
    effectiveDate: string;
    notes?: string;
  };
}

// ==================== API ====================

const cashApi = {
  /**
   * Nhập số dư đầu kỳ cho sổ quỹ tiền mặt
   */
  setOpeningBalance: async (dto: OpeningBalanceCashDto): Promise<SetOpeningBalanceResponse> => {
    const { data } = await api.post('/cash/opening-balance', dto);
    return data;
  },

  /**
   * Lấy số dư quỹ của cửa hàng
   */
  getCashBalance: async (storeId: number) => {
    const { data } = await api.get(`/cash/balance/${storeId}`);
    return data;
  },

  /**
   * Lấy sổ quỹ của cửa hàng
   */
  getCashLedger: async (storeId: number) => {
    const { data } = await api.get(`/cash/ledger/${storeId}`);
    return data;
  },
};

export default cashApi;
