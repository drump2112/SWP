import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi } from '../api/stores';
import cashApi from '../api/cash';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const CashOpeningBalance: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(user?.storeId || null);
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  // Fetch stores (chỉ cho ADMIN và ACCOUNTING)
  const { data: stores, isLoading: isLoadingStores, error: storesError } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
    enabled: !user?.storeId, // Chỉ load nếu không phải store user
  });

  // Fetch current cash balance when store is selected
  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['cash-balance', selectedStoreId],
    queryFn: () => cashApi.getCashBalance(selectedStoreId!),
    enabled: !!selectedStoreId,
  });

  React.useEffect(() => {
    if (balanceData) {
      setCurrentBalance(balanceData.balance || 0);
    }
  }, [balanceData]);

  React.useEffect(() => {
    if (storesError) {
      toast.error('Không thể tải danh sách cửa hàng');
      console.error('Stores error:', storesError);
    }
  }, [storesError]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await cashApi.setOpeningBalance(payload);
      return response;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      setOpeningBalance('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-report'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(`❌ ${errorMsg}`);
      console.error('Submit error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId) {
      toast.error('Vui lòng chọn cửa hàng');
      return;
    }

    const balanceValue = parseFloat(openingBalance);
    if (isNaN(balanceValue) || balanceValue < 0) {
      toast.error('Vui lòng nhập số dư hợp lệ (>= 0)');
      return;
    }

    const payload = {
      storeId: selectedStoreId,
      openingBalance: balanceValue,
      effectiveDate,
      notes: notes || undefined,
    };

    submitMutation.mutate(payload);
  };

  const adjustment = openingBalance ? parseFloat(openingBalance) - currentBalance : 0;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">💰 Nhập Số Dư Đầu Kỳ - Sổ Quỹ Tiền Mặt</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form bên trái */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        {/* Chọn cửa hàng */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Cửa hàng *
          </label>
          {user?.storeId ? (
            <div className="shadow border rounded w-full py-2 px-3 bg-gray-100 text-gray-700">
              {stores?.find(s => s.id === user.storeId)?.name || 'Cửa hàng của bạn'}
            </div>
          ) : (
            <select
              className="shadow border rounded w-full py-2 px-3 text-gray-700"
              value={selectedStoreId || ''}
              onChange={(e) => setSelectedStoreId(Number(e.target.value))}
              required
              disabled={isLoadingStores}
            >
              <option value="">-- Chọn cửa hàng --</option>
              {stores?.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.code})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Số dư hiện tại */}
        {selectedStoreId && (
          <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Số dư hiện tại:</span>
              <span className="text-2xl font-bold text-blue-600">
                {isLoadingBalance ? (
                  '⏳ Đang tải...'
                ) : (
                  `${currentBalance.toLocaleString('vi-VN')} ₫`
                )}
              </span>
            </div>
          </div>
        )}

        {/* Số dư đầu kỳ mong muốn */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Số dư đầu kỳ mong muốn (₫) *
          </label>
          <input
            type="number"
            step="1"
            min="0"
            placeholder="VD: 5000000"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 text-lg"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            required
          />
        </div>

        {/* Hiển thị chênh lệch */}
        {openingBalance && selectedStoreId && !isLoadingBalance && (
          <div className={`mb-4 p-4 rounded border ${
            adjustment > 0
              ? 'bg-green-50 border-green-300'
              : adjustment < 0
              ? 'bg-red-50 border-red-300'
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">
                {adjustment > 0 ? '📈 Sẽ tăng quỹ:' : adjustment < 0 ? '📉 Sẽ giảm quỹ:' : '✅ Không cần điều chỉnh'}
              </span>
              <span className={`text-xl font-bold ${
                adjustment > 0 ? 'text-green-600' : adjustment < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {adjustment !== 0 ? `${Math.abs(adjustment).toLocaleString('vi-VN')} ₫` : '0 ₫'}
              </span>
            </div>
          </div>
        )}

        {/* Ngày hiệu lực */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Ngày hiệu lực *
          </label>
          <input
            type="date"
            className="shadow border rounded w-full py-2 px-3 text-gray-700"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Không được lớn hơn ngày hiện tại
          </p>
        </div>

        {/* Ghi chú */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Ghi chú
          </label>
          <textarea
            className="shadow border rounded w-full py-2 px-3 text-gray-700"
            rows={3}
            placeholder="VD: Số dư chuyển từ hệ thống cũ, điều chỉnh do kiểm kê..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={submitMutation.isPending || !selectedStoreId || !openingBalance}
            className={`font-bold py-2 px-6 rounded ${
              submitMutation.isPending || !selectedStoreId || !openingBalance
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-700 text-white'
            }`}
          >
            {submitMutation.isPending ? '⏳ Đang xử lý...' : '💾 Lưu Số Dư Đầu Kỳ'}
          </button>

          <span className="text-sm text-gray-600">
            * Trường bắt buộc
          </span>
        </div>
          </form>
        </div>

        {/* Hướng dẫn và lưu ý bên phải */}
        <div className="space-y-4">
          {/* Hướng dẫn */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <h3 className="font-bold mb-2">📌 Hướng dẫn:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Chức năng này dùng khi <strong>khởi tạo hệ thống lần đầu</strong> hoặc <strong>chuyển đổi từ hệ thống cũ</strong></li>
              <li>Nhập số dư đầu kỳ mong muốn, hệ thống sẽ tự động tạo bút toán điều chỉnh</li>
              <li>Số dư hiện tại được tính lũy kế từ tất cả giao dịch trong hệ thống</li>
              <li>Nếu cửa hàng đã có giao dịch, cân nhắc kỹ trước khi điều chỉnh</li>
              <li><strong className="text-red-600">Chỉ ADMIN và KẾ TOÁN được phép thực hiện</strong></li>
            </ul>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <h3 className="font-bold text-red-700 mb-2">⚠️ Lưu ý quan trọng:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
              <li>Không nên nhập số dư đầu nhiều lần cho cùng một cửa hàng</li>
              <li>Kiểm tra kỹ số liệu trước khi lưu</li>
              <li>Thao tác này sẽ tạo bút toán OPENING_BALANCE trong sổ quỹ</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashOpeningBalance;
