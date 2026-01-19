import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi } from '../api/stores';
import { productsApi } from '../api/products';
import api from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

interface Product {
  id: number;
  code: string;
  name: string;
}

interface StockItem {
  productId: number;
  productCode?: string;
  productName?: string;
  quantity: number;
  notes?: string;
}

interface InitialStockRecord {
  id: number;
  documentId: number;
  storeId: number;
  storeName?: string;
  warehouseId: number;
  effectiveDate: string;
  notes?: string;
  items: {
    productId: number;
    productCode?: string;
    productName?: string;
    quantity: number;
    tankId?: number;
  }[];
  createdAt: string;
}

const InitialStock: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(user?.storeId || null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<InitialStockRecord | null>(null);
  const [editedItems, setEditedItems] = useState<StockItem[]>([]);
  const [editedEffectiveDate, setEditedEffectiveDate] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<number | undefined>(user?.storeId);

  // Fetch stores using React Query
  const { data: stores, isLoading: isLoadingStores, error: storesError } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
    enabled: !user?.storeId, // Only load if user is not tied to a store
  });

  // Fetch products using React Query
  const { data: products, isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  });

  // Fetch ALL initial stock records (for validation)
  const { data: allRecords } = useQuery({
    queryKey: ['initial-stock-records-all'],
    queryFn: async () => {
      const response = await api.get<InitialStockRecord[]>('/inventory/initial-stock-records');
      return response.data;
    },
  });

  // Fetch filtered initial stock records (for display)
  const { data: records, isLoading: isLoadingRecords } = useQuery({
    queryKey: ['initial-stock-records', selectedStoreFilter],
    queryFn: async () => {
      const response = await api.get<InitialStockRecord[]>('/inventory/initial-stock-records', {
        params: selectedStoreFilter ? { storeId: selectedStoreFilter } : {},
      });
      return response.data;
    },
  });

  // Show loading/error states
  React.useEffect(() => {
    if (storesError) {
      toast.error('Không thể tải danh sách cửa hàng');
      console.error('Stores error:', storesError);
    }
    if (productsError) {
      toast.error('Không thể tải danh sách mặt hàng');
      console.error('Products error:', productsError);
    }
  }, [storesError, productsError]);

  // Submit mutation for new record
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/inventory/simple-initial-stock', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Nhập tồn đầu thành công!');
      setStockItems([]);
      setNotes('');
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['initial-stock-records'] });
      queryClient.invalidateQueries({ queryKey: ['initial-stock-records-all'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
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
      const response = await api.put('/inventory/initial-stock', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Cập nhật tồn đầu thành công!');
      setEditingRecord(null);
      setEditedItems([]);
      queryClient.invalidateQueries({ queryKey: ['initial-stock-records'] });
      queryClient.invalidateQueries({ queryKey: ['initial-stock-records-all'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.message || 'Có lỗi xảy ra'}`);
    },
  });

  const addProductRow = () => {
    setStockItems([
      ...stockItems,
      { productId: 0, quantity: 0 },
    ]);
  };

  const removeProductRow = (index: number) => {
    setStockItems(stockItems.filter((_, i) => i !== index));
  };

  const updateStockItem = (index: number, field: keyof StockItem, value: any) => {
    const updated = [...stockItems];

    // Convert to proper type
    let processedValue = value;
    if (field === 'productId' || field === 'quantity') {
      processedValue = Number(value);
    }

    updated[index] = { ...updated[index], [field]: processedValue };

    // Auto-fill product info
    if (field === 'productId') {
      const product = products?.find(p => p.id === Number(value));
      if (product) {
        updated[index].productCode = product.code;
        updated[index].productName = product.name;
      }
    }
    setStockItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId) {
      toast.error('Vui lòng chọn cửa hàng');
      return;
    }

    if (stockItems.length === 0 || stockItems.some(item => !item.productId || item.quantity === 0 || isNaN(item.quantity))) {
      toast.error('Vui lòng nhập đầy đủ thông tin mặt hàng và số lượng (có thể nhập số âm)');
      return;
    }

    // Check if store already has opening balance
    const existingRecord = allRecords?.find(r => r.storeId === selectedStoreId);
    if (existingRecord) {
      toast.error('Cửa hàng này đã có tồn đầu. Vui lòng sửa bản ghi hiện tại thay vì thêm mới.');
      return;
    }

    const payload = {
      storeId: selectedStoreId,
      effectiveDate,
      items: stockItems.map(item => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        notes: item.notes || '',
      })),
      notes,
    };

    submitMutation.mutate(payload);
  };

  const startEdit = (record: InitialStockRecord) => {
    setEditingRecord(record);
    setEditedItems(record.items.map(item => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
    })));
    setEditedEffectiveDate(record.effectiveDate.split('T')[0]);
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditedItems([]);
    setEditedEffectiveDate('');
  };

  const updateEditedItem = (index: number, field: keyof StockItem, value: any) => {
    const updated = [...editedItems];
    let processedValue = value;
    if (field === 'productId' || field === 'quantity') {
      processedValue = Number(value);
    }
    updated[index] = { ...updated[index], [field]: processedValue };

    if (field === 'productId') {
      const product = products?.find(p => p.id === Number(value));
      if (product) {
        updated[index].productCode = product.code;
        updated[index].productName = product.name;
      }
    }

    setEditedItems(updated);
  };

  const addEditedItem = () => {
    setEditedItems([...editedItems, { productId: 0, quantity: 0 }]);
  };

  const removeEditedItem = (index: number) => {
    setEditedItems(editedItems.filter((_, i) => i !== index));
  };

  const handleUpdate = () => {
    if (!editingRecord) return;

    if (editedItems.some(item => !item.productId || item.quantity === 0 || isNaN(item.quantity))) {
      toast.error('Vui lòng nhập đầy đủ thông tin mặt hàng và số lượng (có thể nhập số âm)');
      return;
    }

    const payload = {
      documentId: editingRecord.documentId,
      storeId: editingRecord.storeId,
      effectiveDate: editedEffectiveDate,
      items: editedItems.map(item => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        notes: item.notes || '',
      })),
      notes: editingRecord.notes,
    };

    updateMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📦 Nhập Tồn Đầu Kỳ</h1>
          <p className="text-gray-600 mt-2">
            Nhập số lượng tồn kho ban đầu cho từng mặt hàng tại cửa hàng
          </p>
        </div>

        {/* Tổng số bản ghi */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Tổng số bản ghi tồn đầu</p>
              <p className="text-3xl font-bold mt-1">
                {allRecords?.length || 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">Đang hiển thị</p>
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
            {showAddForm ? 'Đóng form' : 'Thêm tồn đầu mới'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Nhập Tồn Đầu Mới</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800">
                ℹ️ <strong>Lưu ý:</strong> Mỗi cửa hàng chỉ có thể nhập tồn đầu <strong>MỘT LẦN</strong>. Nhập số lượng tồn kho ban đầu cho từng mặt hàng. Số lượng có thể âm (trường hợp thiếu hàng).
              </p>
            </div>

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
                      label: `${store.name} (${store.code})${hasRecord ? ' - Đã có tồn đầu' : ''}`,
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
                Ngày áp dụng số dư tồn đầu (không được lớn hơn ngày hiện tại)
              </p>
            </div>

            {/* Danh sách mặt hàng */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 text-sm font-bold">
                  Tồn kho từng mặt hàng *
                </label>
                <button
                  type="button"
                  onClick={addProductRow}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                >
                  + Thêm mặt hàng
                </button>
              </div>

              {stockItems.length === 0 && (
                <p className="text-gray-500 italic">Chưa có mặt hàng nào. Nhấn "Thêm mặt hàng" để bắt đầu.</p>
              )}

              {stockItems.map((item, index) => (
                <div key={index} className="flex gap-4 mb-3 items-start border-b pb-3">
                  <div className="flex-1">
                    <SearchableSelect
                      options={products?.map(product => ({
                        value: product.id,
                        label: `${product.code} - ${product.name}`,
                      })) || []}
                      value={item.productId || null}
                      onChange={(val) => updateStockItem(index, 'productId', val)}
                      placeholder="-- Chọn mặt hàng --"
                      isClearable={true}
                      isDisabled={isLoadingProducts}
                    />
                  </div>

                  <div className="w-40">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Số lượng (có thể âm)"
                      className="shadow border rounded w-full py-2 px-3 text-gray-700"
                      value={item.quantity || ''}
                      onChange={(e) => updateStockItem(index, 'quantity', Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Ghi chú (tùy chọn)"
                      className="shadow border rounded w-full py-2 px-3 text-gray-700"
                      value={item.notes || ''}
                      onChange={(e) => updateStockItem(index, 'notes', e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeProductRow(index)}
                    className="px-3 py-1.5 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md shadow hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center gap-2 font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Xóa
                  </button>
                </div>
              ))}
            </div>

            {/* Ghi chú chung */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Ghi chú
              </label>
              <textarea
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                rows={3}
                placeholder="Ghi chú chung về lần nhập tồn đầu này..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={submitMutation.isPending || !selectedStoreId || stockItems.length === 0}
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
                  setStockItems([]);
                  setSelectedStoreId(user?.storeId || null);
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
              📋 Danh Sách Tồn Đầu Đã Nhập
            </h2>
          </div>

          {isLoadingRecords ? (
            <div className="p-8 text-center text-gray-500">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Cửa hàng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ngày nhập
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Số mặt hàng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Chi tiết tồn kho
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {!records || records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Chưa có dữ liệu. Vui lòng thêm mới tồn đầu.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <React.Fragment key={record.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                            <div className="text-sm font-medium text-gray-900">
                              {record.storeName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(record.effectiveDate).toLocaleDateString('vi-VN')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {record.items.length} mặt hàng
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 space-y-1">
                              {record.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{item.productName}:</span>
                                  <span className="font-semibold ml-2">{item.quantity.toLocaleString('vi-VN')} lít</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
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
                                <div className="flex justify-between items-center">
                                  <h3 className="font-bold text-gray-900">Chỉnh sửa số lượng tồn:</h3>
                                  <button
                                    onClick={addEditedItem}
                                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                                  >
                                    + Thêm mặt hàng
                                  </button>
                                </div>

                                {/* Ngày hiệu lực */}
                                <div className="mb-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ngày hiệu lực *
                                  </label>
                                  <input
                                    type="date"
                                    className="shadow border rounded py-2 px-3 text-gray-700"
                                    value={editedEffectiveDate}
                                    onChange={(e) => setEditedEffectiveDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    disabled={updateMutation.isPending}
                                    required
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Ngày áp dụng số dư tồn đầu (không được lớn hơn ngày hiện tại)
                                  </p>
                                </div>

                                {editedItems.map((item, index) => (
                                  <div key={index} className="flex gap-4 items-center">
                                    <div className="flex-1">
                                      <SearchableSelect
                                        options={products?.map(product => ({
                                          value: product.id,
                                          label: `${product.code} - ${product.name}`,
                                        })) || []}
                                        value={item.productId || null}
                                        onChange={(val) => updateEditedItem(index, 'productId', val)}
                                        placeholder="-- Chọn mặt hàng --"
                                        isClearable={true}
                                        isDisabled={isLoadingProducts || updateMutation.isPending}
                                      />
                                    </div>
                                    <div className="w-40">
                                      <input
                                        type="number"
                                        step="0.001"
                                        placeholder="Số lượng (có thể âm)"
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700"
                                        value={item.quantity}
                                        onChange={(e) => updateEditedItem(index, 'quantity', Number(e.target.value))}
                                        disabled={updateMutation.isPending}
                                        required
                                      />
                                    </div>
                                    {editedItems.length > 1 && (
                                      <button
                                        onClick={() => removeEditedItem(index)}
                                        disabled={updateMutation.isPending}
                                        className="px-3 py-1.5 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md shadow hover:shadow-lg hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 font-medium"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                ))}
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

        {/* Lưu ý quan trọng */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">📌 Lưu ý quan trọng</h3>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>Mỗi cửa hàng chỉ nên có <strong>1 bản ghi tồn đầu duy nhất</strong></li>
            <li>Nhấn <strong>"Thêm tồn đầu mới"</strong> để nhập tồn đầu cho cửa hàng chưa có</li>
            <li>Nhấn <strong>"Sửa"</strong> ở bảng dưới để điều chỉnh số lượng tồn đầu nếu nhập sai</li>
            <li>Có thể thêm hoặc xóa mặt hàng khi chỉnh sửa</li>
            <li>Số lượng có thể âm (trường hợp thiếu hàng ban đầu)</li>
            <li>Thay đổi sẽ ảnh hưởng đến báo cáo tồn kho và sổ quỹ</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InitialStock;
