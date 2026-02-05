import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi } from '../api/stores';
import { usePageTitle } from '../hooks/usePageTitle';
import cashApi from '../api/cash';
import api from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

interface OpeningBalanceRecord {
  id: number;
  storeId: number;
  storeName?: string;
  cashIn: number;
  cashOut: number;
  netAmount: number;
  effectiveDate: string;
  createdAt: string;
}

const CashOpeningBalance: React.FC = () => {
  usePageTitle('Số dư đầu sổ quỹ');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(user?.storeId || null);
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<number | undefined>(user?.storeId);
  const [editingRecord, setEditingRecord] = useState<OpeningBalanceRecord | null>(null);
  const [editedBalance, setEditedBalance] = useState<number>(0);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedEffectiveDate, setEditedEffectiveDate] = useState<string>('');

  // Fetch stores (chỉ cho ADMIN và ACCOUNTING)
  const { data: stores, isLoading: isLoadingStores, error: storesError } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
    enabled: !user?.storeId, // Chỉ load nếu không phải store user
  });

  // Fetch ALL opening balance records (for validation)
  const { data: allRecords } = useQuery({
    queryKey: ['cash-opening-balance-records-all'],
    queryFn: async () => {
      const response = await api.get<OpeningBalanceRecord[]>('/cash/opening-balance');
      return response.data;
    },
  });

  // Fetch filtered opening balance records (for display)
  const { data: records, isLoading: isLoadingRecords } = useQuery({
    queryKey: ['cash-opening-balance-records', selectedStoreFilter],
    queryFn: async () => {
      const response = await api.get<OpeningBalanceRecord[]>('/cash/opening-balance', {
        params: selectedStoreFilter ? { storeId: selectedStoreFilter } : {},
      });
      return response.data;
    },
  });

  // Fetch current cash balance when store is selected
  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['cash-balance', selectedStoreId],
    queryFn: () => cashApi.getCashBalance(selectedStoreId!),
    enabled: !!selectedStoreId && showAddForm,
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

  // Submit mutation for new record
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await cashApi.setOpeningBalance(payload);
      return response;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      setOpeningBalance('');
      setNotes('');
      setEffectiveDate(new Date().toISOString().split('T')[0]); // Reset ngày hiệu lực về hôm nay
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-report'] });
      queryClient.invalidateQueries({ queryKey: ['cash-opening-balance-records'] });
      queryClient.invalidateQueries({ queryKey: ['cash-opening-balance-records-all'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(`❌ ${errorMsg}`);
      console.error('Submit error:', error);
    },
  });

  // Update mutation for existing record
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.put('/cash/opening-balance', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Cập nhật số dư đầu kỳ thành công!');
      setEditingRecord(null);
      setEditedBalance(0);
      setEditedNotes('');
      queryClient.invalidateQueries({ queryKey: ['cash-opening-balance-records'] });
      queryClient.invalidateQueries({ queryKey: ['cash-opening-balance-records-all'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
    onError: (error: any) => {
      toast.error(`${error.response?.data?.message || 'Có lỗi xảy ra'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId) {
      toast.error('Vui lòng chọn cửa hàng');
      return;
    }

    const balanceValue = parseFloat(openingBalance);
    if (isNaN(balanceValue)) {
      toast.error('Vui lòng nhập số dư hợp lệ (có thể nhập số âm)');
      return;
    }

    // Check if store already has opening balance
    const existingRecord = allRecords?.find(r => r.storeId === selectedStoreId);
    if (existingRecord) {
      toast.error('Cửa hàng này đã có số dư đầu kỳ. Vui lòng sửa bản ghi hiện tại thay vì thêm mới.');
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

  const startEdit = (record: OpeningBalanceRecord) => {
    setEditingRecord(record);
    setEditedBalance(record.netAmount);
    setEditedNotes('');
    setEditedEffectiveDate(record.effectiveDate.split('T')[0]);
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditedBalance(0);
    setEditedNotes('');
    setEditedEffectiveDate('');
  };

  const handleUpdate = () => {
    if (!editingRecord) return;

    if (isNaN(editedBalance)) {
      toast.error('Số dư không hợp lệ');
      return;
    }

    const payload = {
      id: editingRecord.id,
      openingBalance: editedBalance,
      effectiveDate: editedEffectiveDate,
      notes: editedNotes || undefined,
    };

    updateMutation.mutate(payload);
  };

  const adjustment = openingBalance ? parseFloat(openingBalance) - currentBalance : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">💰 Nhập Số Dư Đầu Kỳ - Sổ Quỹ Tiền Mặt</h1>
          <p className="text-gray-600 mt-2">
            Nhập số dư tiền mặt ban đầu của sổ quỹ tại từng cửa hàng
          </p>
        </div>

        {/* Tổng số bản ghi */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Tổng số bản ghi số dư đầu</p>
              <p className="text-3xl font-bold mt-1">
                {allRecords?.length || 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-green-100 text-sm">Đang hiển thị</p>
              <p className="text-2xl font-semibold">{records?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md shadow hover:shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center gap-2 font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showAddForm ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              )}
            </svg>
            {showAddForm ? 'Đóng form' : 'Thêm mới'}
          </button>
        </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Nhập Số Dư Đầu Kỳ Mới</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              ℹ️ <strong>Lưu ý:</strong> Mỗi cửa hàng chỉ có thể nhập số dư đầu <strong>MỘT LẦN</strong>. Nhập số dư tiền mặt ban đầu của sổ quỹ. Số dư có thể âm (trường hợp thiếu tiền).
            </p>
          </div>

          <form onSubmit={handleSubmit}>
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
                <SearchableSelect
                  options={stores?.map(store => {
                    const hasRecord = allRecords?.some(r => r.storeId === store.id);
                    return {
                      value: store.id,
                      label: `${store.name} (${store.code})${hasRecord ? ' - Đã có số dư đầu' : ''}`,
                      isDisabled: hasRecord,
                    };
                  }) || []}
                  value={selectedStoreId}
                  onChange={(val) => setSelectedStoreId(val as number)}
                  placeholder="-- Chọn cửa hàng --"
                  isClearable={true}
                  isDisabled={isLoadingStores}
                />
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
                placeholder="VD: 5000000 (có thể nhập số âm)"
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

            {/* Diễn Giải */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Diễn Giải
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
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={submitMutation.isPending || !selectedStoreId || !openingBalance}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md shadow hover:shadow-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {submitMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedStoreId(user?.storeId || null);
                  setOpeningBalance('');
                  setNotes('');
                }}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-md shadow hover:shadow-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 flex items-center gap-2 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      {!user?.storeId && (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Lọc theo cửa hàng:
          </label>
          <SearchableSelect
            options={[
              { value: 0, label: 'Tất cả cửa hàng' },
              ...(stores?.map(store => ({
                value: store.id,
                label: store.name,
              })) || [])
            ]}
            value={selectedStoreFilter || 0}
            onChange={(val) => setSelectedStoreFilter(val === 0 ? undefined : val as number)}
            placeholder="Chọn cửa hàng"
            isClearable={false}
            isDisabled={isLoadingRecords}
          />
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            📋 Danh Sách Số Dư Đầu Kỳ Đã Nhập
          </h2>
        </div>

        {isLoadingRecords ? (
          <div className="text-center py-10">
            <div className="text-gray-500">⏳ Đang tải dữ liệu...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Cửa hàng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ngày hiệu lực
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Số dư đầu kỳ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!records || records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <div className="text-lg">📭</div>
                      <div className="mt-2">Chưa có bản ghi số dư đầu kỳ nào</div>
                      <div className="text-sm mt-1">Nhấn "Thêm Mới" để bắt đầu</div>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <React.Fragment key={record.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {record.storeName}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(record.effectiveDate).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-lg font-bold text-green-600">
                            {record.netAmount.toLocaleString('vi-VN')} ₫
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(record.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                          {editingRecord?.id === record.id ? (
                            <div className="flex gap-3 justify-center">
                              <button
                                onClick={handleUpdate}
                                disabled={updateMutation.isPending}
                                className="
                                  relative px-3 py-1.5 text-sm font-semibold text-white rounded-md shadow
                                  transform transition-all duration-200 ease-in-out
                                  hover:scale-105 hover:shadow-md
                                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                                  bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1
                                "
                              >
                                <span className="flex items-center gap-1.5">
                                  {updateMutation.isPending ? (
                                    <>
                                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span>Đang lưu...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span>Lưu</span>
                                    </>
                                  )}
                                </span>
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={updateMutation.isPending}
                                className="
                                  relative px-3 py-1.5 text-sm font-semibold text-white rounded-md shadow
                                  transform transition-all duration-200 ease-in-out
                                  hover:scale-105 hover:shadow-md
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700
                                  focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1
                                "
                              >
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span>Hủy</span>
                                </span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(record)}
                              className="
                                relative px-3 py-1.5 text-sm font-semibold text-white rounded-md shadow
                                transform transition-all duration-200 ease-in-out
                                hover:scale-105 hover:shadow-md
                                bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                              "
                            >
                              <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Sửa</span>
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                      {editingRecord?.id === record.id && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-yellow-50">
                            <div className="space-y-3">
                              <h3 className="font-bold text-gray-900">Chỉnh sửa số dư đầu kỳ:</h3>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ngày hiệu lực *
                                  </label>
                                  <input
                                    type="date"
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                                    value={editedEffectiveDate}
                                    onChange={(e) => setEditedEffectiveDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    disabled={updateMutation.isPending}
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Số dư đầu kỳ mới (₫) *
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    placeholder="Có thể nhập số âm"
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                                    value={editedBalance}
                                    onChange={(e) => setEditedBalance(Number(e.target.value))}
                                    disabled={updateMutation.isPending}
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Diễn giải
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Lý do chỉnh sửa..."
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                                    value={editedNotes}
                                    onChange={(e) => setEditedNotes(e.target.value)}
                                    disabled={updateMutation.isPending}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hướng dẫn */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-xl shadow-lg p-6">
        <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
          <span>⚠️</span>
          <span>Lưu Ý Quan Trọng</span>
        </h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800">
          <li>Mỗi cửa hàng chỉ có <strong>1 bản ghi số dư đầu duy nhất</strong></li>
          <li>Nhấn <strong>"Thêm Mới"</strong> để nhập cho cửa hàng chưa có</li>
          <li>Nhấn <strong>"Sửa"</strong> ở bảng dưới để điều chỉnh số dư nếu nhập sai</li>
          <li>Hệ thống sẽ tự động tạo bút toán điều chỉnh OPENING_BALANCE</li>
          <li>Số dư hiện tại được tính từ tất cả giao dịch trong hệ thống</li>
          <li>Không nên nhập số dư đầu nhiều lần cho cùng một cửa hàng</li>
          <li>Kiểm tra kỹ số liệu trước khi lưu</li>
          <li>Nếu cửa hàng đã có giao dịch, cân nhắc kỹ trước khi điều chỉnh</li>
          <li><strong>Chỉ ADMIN và KẾ TOÁN được phép thực hiện</strong></li>
        </ul>
      </div>
      </div>
    </div>
  );
};

export default CashOpeningBalance;
