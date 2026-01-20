import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi } from '../api/stores';
import { usePageTitle } from '../hooks/usePageTitle';
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

const CashOpeningBalanceManagement: React.FC = () => {
  usePageTitle('Quản lý số dư đầu sổ quỹ');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedStoreFilter, setSelectedStoreFilter] = useState<number | undefined>(user?.storeId);
  const [editingRecord, setEditingRecord] = useState<OpeningBalanceRecord | null>(null);
  const [editedBalance, setEditedBalance] = useState<number>(0);
  const [editedNotes, setEditedNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStoreId, setNewStoreId] = useState<number | null>(user?.storeId || null);
  const [newBalance, setNewBalance] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');

  // Fetch stores
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
    enabled: !user?.storeId,
    staleTime: 5 * 60 * 1000, // Cache 5 phút
  });

  // Fetch opening balance records
  const { data: records, isLoading } = useQuery({
    queryKey: ['cash-opening-balance-records', selectedStoreFilter],
    queryFn: async () => {
      const response = await api.get<OpeningBalanceRecord[]>('/cash/opening-balance', {
        params: selectedStoreFilter ? { storeId: selectedStoreFilter } : {},
      });
      return response.data;
    },
    staleTime: 60 * 1000, // Cache 1 phút
  });

  // Fetch current balance for selected store - CHỈ khi form mở VÀ đã chọn store
  const { data: balanceData } = useQuery({
    queryKey: ['cash-balance', newStoreId],
    queryFn: async () => {
      const response = await api.get(`/cash/balance/${newStoreId}`);
      return response.data;
    },
    enabled: !!newStoreId && showAddForm,
    staleTime: 30 * 1000, // Cache 30 giây
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.put('/cash/opening-balance', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Cập nhật số dư đầu kỳ thành công!');
      setEditingRecord(null);
      queryClient.invalidateQueries({ queryKey: ['cash-opening-balance-records'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.message || 'Có lỗi xảy ra'}`);
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/cash/opening-balance', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Nhập số dư đầu kỳ thành công!');
      setShowAddForm(false);
      setNewBalance('');
      setNewNotes('');
      queryClient.invalidateQueries({ queryKey: ['cash-opening-balance-records'] });
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.message || 'Có lỗi xảy ra'}`);
    },
  });

  const startEdit = (record: OpeningBalanceRecord) => {
    setEditingRecord(record);
    setEditedBalance(record.netAmount);
    setEditedNotes('');
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditedBalance(0);
    setEditedNotes('');
  };

  const handleUpdate = () => {
    if (!editingRecord) return;

    const payload = {
      id: editingRecord.id,
      openingBalance: editedBalance,
      notes: editedNotes || undefined,
    };

    updateMutation.mutate(payload);
  };

  const handleAdd = () => {
    if (!newStoreId || !newBalance) {
      toast.error('Vui lòng chọn cửa hàng và nhập số dư');
      return;
    }

    // Check if store already has opening balance
    const existingRecord = records?.find(r => r.storeId === newStoreId);
    if (existingRecord) {
      toast.error('Cửa hàng này đã có số dư đầu kỳ. Vui lòng sửa bản ghi hiện tại thay vì thêm mới.');
      return;
    }

    const payload = {
      storeId: newStoreId,
      openingBalance: parseFloat(newBalance),
      effectiveDate: newDate,
      notes: newNotes || undefined,
    };

    addMutation.mutate(payload);
  };

  const currentBalance = balanceData?.balance || 0;
  const adjustment = newBalance ? parseFloat(newBalance) - currentBalance : 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">💰 Quản Lý Số Dư Đầu Kỳ - Sổ Quỹ</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showAddForm ? '✖️ Hủy' : '➕ Thêm Số Dư Đầu'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Nhập Số Dư Đầu Kỳ Mới</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
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
                    const hasRecord = records?.some(r => r.storeId === store.id);
                    return {
                      value: store.id,
                      label: `${store.name}${hasRecord ? ' (Đã có số dư đầu)' : ''}`,
                      isDisabled: hasRecord,
                    };
                  }) || []}
                  value={newStoreId}
                  onChange={(val) => setNewStoreId(val as number)}
                  placeholder="-- Chọn cửa hàng --"
                  isClearable={true}
                  isDisabled={isLoading}
                />
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Ngày hiệu lực *
              </label>
              <input
                type="date"
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          {newStoreId && (
            <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Số dư hiện tại:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {currentBalance.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          )}

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
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              required
            />
          </div>

          {newBalance && newStoreId && (
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

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Ghi chú
            </label>
            <textarea
              className="shadow border rounded w-full py-2 px-3 text-gray-700"
              rows={2}
              placeholder="VD: Số dư chuyển từ hệ thống cũ..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={addMutation.isPending || !newStoreId || !newBalance}
            className={`font-bold py-2 px-4 rounded ${
              addMutation.isPending || !newStoreId || !newBalance
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-700 text-white'
            }`}
          >
            {addMutation.isPending ? '⏳ Đang lưu...' : '💾 Lưu Số Dư Đầu'}
          </button>
        </div>
      )}

      {/* Filter */}
      {!user?.storeId && (
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
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
            isDisabled={isLoading}
          />
        </div>
      )}

      {/* Records table */}
      <div className="bg-white shadow-md rounded overflow-hidden">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="text-gray-500">⏳ Đang tải dữ liệu...</div>
          </div>
        ) : (
          <table className="min-w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Cửa hàng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Ngày nhập
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Thu
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Chi
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Số dư
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!records || records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Chưa có bản ghi số dư đầu nào
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <React.Fragment key={record.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.storeName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(record.effectiveDate).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-green-600 font-semibold">
                        {record.cashIn > 0 ? `+${record.cashIn.toLocaleString('vi-VN')}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-red-600 font-semibold">
                        {record.cashOut > 0 ? `-${record.cashOut.toLocaleString('vi-VN')}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold ${record.netAmount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {record.netAmount.toLocaleString('vi-VN')} ₫
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {editingRecord?.id === record.id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={handleUpdate}
                            disabled={updateMutation.isPending}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                          >
                            {updateMutation.isPending ? '⏳' : '💾 Lưu'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded"
                          >
                            ✖️ Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(record)}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                        >
                          ✏️ Sửa
                        </button>
                      )}
                    </td>
                  </tr>
                  {editingRecord?.id === record.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-yellow-50">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                              Số dư mới (₫) *
                            </label>
                            <input
                              type="number"
                              step="1"
                              className="shadow border rounded w-full py-2 px-3 text-gray-700 text-lg"
                              value={editedBalance}
                              onChange={(e) => setEditedBalance(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                              Ghi chú
                            </label>
                            <input
                              type="text"
                              className="shadow border rounded w-full py-2 px-3 text-gray-700"
                              value={editedNotes}
                              onChange={(e) => setEditedNotes(e.target.value)}
                              placeholder="Lý do điều chỉnh..."
                            />
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
        )}
      </div>

      {/* Info box */}
      <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <h3 className="font-bold mb-2">📌 Lưu ý:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Chỉ cho phép sửa</strong>, không cho thêm nhiều lần cho cùng một cửa hàng</li>
          <li>Mỗi cửa hàng chỉ nên có <strong>1 bản ghi số dư đầu duy nhất</strong></li>
          <li>Sử dụng chức năng "Sửa" để điều chỉnh số dư nếu nhập sai</li>
          <li>Thay đổi sẽ ảnh hưởng đến báo cáo sổ quỹ tiền mặt</li>
          <li>Chỉ <strong>ADMIN và KẾ TOÁN</strong> được phép thực hiện</li>
        </ul>
      </div>
    </div>
  );
};

export default CashOpeningBalanceManagement;
