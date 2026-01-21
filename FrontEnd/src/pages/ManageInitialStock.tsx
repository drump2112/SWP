import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi } from '../api/stores';
import { usePageTitle } from '../hooks/usePageTitle';
import { productsApi } from '../api/products';
import api from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

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

interface StockItem {
  productId: number;
  productCode?: string;
  productName?: string;
  quantity: number;
  notes?: string;
}

const ManageInitialStock: React.FC = () => {
  usePageTitle('Quản lý tồn đầu');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedStoreFilter, setSelectedStoreFilter] = useState<number | undefined>(user?.storeId);
  const [editingRecord, setEditingRecord] = useState<InitialStockRecord | null>(null);
  const [editedItems, setEditedItems] = useState<StockItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStoreId, setNewStoreId] = useState<number | null>(user?.storeId || null);
  const [newStockItems, setNewStockItems] = useState<StockItem[]>([]);
  const [newNotes, setNewNotes] = useState('');

  // Fetch stores
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
    enabled: !user?.storeId,
  });

  // Fetch products
  const { data: products } = useQuery({
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
  const { data: records, isLoading } = useQuery({
    queryKey: ['initial-stock-records', selectedStoreFilter],
    queryFn: async () => {
      const response = await api.get<InitialStockRecord[]>('/inventory/initial-stock-records', {
        params: selectedStoreFilter ? { storeId: selectedStoreFilter } : {},
      });
      return response.data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.put('/inventory/initial-stock', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Cập nhật tồn đầu thành công!');
      setEditingRecord(null);
      setEditedItems([]);
      queryClient.invalidateQueries({ queryKey: ['initial-stock-records'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.message || 'Có lỗi xảy ra'}`);
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/inventory/simple-initial-stock', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Nhập tồn đầu thành công!');
      setShowAddForm(false);
      setNewStockItems([]);
      setNewNotes('');
      queryClient.invalidateQueries({ queryKey: ['initial-stock-records'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.message || 'Có lỗi xảy ra'}`);
    },
  });

  const startEdit = (record: InitialStockRecord) => {
    setEditingRecord(record);
    setEditedItems(record.items.map(item => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
    })));
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditedItems([]);
  };

  const updateEditedItem = (index: number, field: keyof StockItem, value: any) => {
    const updated = [...editedItems];
    updated[index] = { ...updated[index], [field]: value };

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

    if (editedItems.some(item => !item.productId || item.quantity <= 0)) {
      toast.error('Vui lòng nhập đầy đủ thông tin mặt hàng và số lượng');
      return;
    }

    const payload = {
      documentId: editingRecord.documentId,
      storeId: editingRecord.storeId,
      items: editedItems.map(item => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        notes: item.notes || '',
      })),
      notes: editingRecord.notes,
    };

    updateMutation.mutate(payload);
  };

  const addNewItem = () => {
    setNewStockItems([...newStockItems, { productId: 0, quantity: 0 }]);
  };

  const removeNewItem = (index: number) => {
    setNewStockItems(newStockItems.filter((_, i) => i !== index));
  };

  const updateNewItem = (index: number, field: keyof StockItem, value: any) => {
    const updated = [...newStockItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'productId') {
      const product = products?.find(p => p.id === Number(value));
      if (product) {
        updated[index].productCode = product.code;
        updated[index].productName = product.name;
      }
    }

    setNewStockItems(updated);
  };

  const handleAdd = () => {
    if (!newStoreId || newStockItems.length === 0) {
      toast.error('Vui lòng chọn cửa hàng và thêm ít nhất một mặt hàng');
      return;
    }

    if (newStockItems.some(item => !item.productId || item.quantity <= 0)) {
      toast.error('Vui lòng nhập đầy đủ thông tin mặt hàng và số lượng');
      return;
    }

    // Check if store already has opening balance
    const existingRecord = allRecords?.find(r => r.storeId === newStoreId);
    if (existingRecord) {
      toast.error('Cửa hàng này đã có tồn đầu. Vui lòng sửa bản ghi hiện tại thay vì thêm mới.');
      return;
    }

    const payload = {
      storeId: newStoreId,
      effectiveDate: new Date().toISOString().split('T')[0],
      items: newStockItems.map(item => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        notes: item.notes || '',
      })),
      notes: newNotes,
    };

    addMutation.mutate(payload);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📦 Quản Lý Tồn Đầu Kỳ</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showAddForm ? '✖️ Hủy' : '➕ Thêm Tồn Đầu'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Nhập Tồn Đầu Mới</h2>

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
                    label: `${store.name}${hasRecord ? ' (Đã có tồn đầu)' : ''}`,
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

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-700 text-sm font-bold">
                Mặt hàng và số lượng *
              </label>
              <button
                type="button"
                onClick={addNewItem}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                + Thêm mặt hàng
              </button>
            </div>

            {newStockItems.length === 0 && (
              <p className="text-gray-500 italic mb-3">Chưa có mặt hàng nào. Nhấn "Thêm mặt hàng" để bắt đầu.</p>
            )}

            {newStockItems.map((item, index) => (
              <div key={index} className="flex gap-4 mb-3 items-start">
                <div className="flex-1">
                  <SearchableSelect
                    options={products?.map(product => ({
                      value: product.id,
                      label: `${product.code} - ${product.name}`,
                    })) || []}
                    value={item.productId || null}
                    onChange={(val) => updateNewItem(index, 'productId', val)}
                    placeholder="-- Chọn mặt hàng --"
                    isClearable={true}
                    isDisabled={isLoading}
                  />
                </div>

                <div className="w-40">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Số lượng (lít)"
                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                    value={item.quantity || ''}
                    onChange={(e) => updateNewItem(index, 'quantity', Number(e.target.value))}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeNewItem(index)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Ghi chú
            </label>
            <textarea
              className="shadow border rounded w-full py-2 px-3 text-gray-700"
              rows={2}
              placeholder="Ghi chú chung về lần nhập tồn đầu này..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={addMutation.isPending || !newStoreId || newStockItems.length === 0}
            className={`font-bold py-2 px-4 rounded ${
              addMutation.isPending || !newStoreId || newStockItems.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-700 text-white'
            }`}
          >
            {addMutation.isPending ? '⏳ Đang lưu...' : '💾 Lưu Tồn Đầu'}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Số mặt hàng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Chi tiết
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!records || records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Chưa có bản ghi tồn đầu nào
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {record.items.length} mặt hàng
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {record.items.map((item, idx) => (
                          <div key={idx}>
                            {item.productName}: <strong>{item.quantity.toLocaleString('vi-VN')}</strong> lít
                          </div>
                        ))}
                      </div>
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
                      <td colSpan={5} className="px-6 py-4 bg-yellow-50">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold">Chỉnh sửa số lượng tồn:</h3>
                            <button
                              onClick={addEditedItem}
                              className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                              + Thêm mặt hàng
                            </button>
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
                                  isDisabled={isLoading || updateMutation.isPending}
                                />
                              </div>
                              <div className="w-40">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="Số lượng (lít)"
                                  className="shadow border rounded w-full py-2 px-3 text-gray-700"
                                  value={item.quantity}
                                  onChange={(e) => updateEditedItem(index, 'quantity', Number(e.target.value))}
                                  required
                                />
                              </div>
                              {editedItems.length > 1 && (
                                <button
                                  onClick={() => removeEditedItem(index)}
                                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded"
                                >
                                  🗑️
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
        )}
      </div>

      {/* Info box */}
      <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <h3 className="font-bold mb-2">📌 Lưu ý:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Chỉ cho phép sửa</strong>, không cho thêm nhiều lần cho cùng một cửa hàng</li>
          <li>Mỗi cửa hàng chỉ nên có <strong>1 bản ghi tồn đầu duy nhất</strong></li>
          <li>Sử dụng chức năng "Sửa" để điều chỉnh số lượng tồn đầu nếu nhập sai</li>
          <li>Có thể thêm hoặc xóa mặt hàng khi chỉnh sửa</li>
          <li>Thay đổi sẽ ảnh hưởng đến báo cáo tồn kho</li>
          <li>Chỉ <strong>ADMIN và KẾ TOÁN</strong> được phép thực hiện</li>
        </ul>
      </div>
    </div>
  );
};

export default ManageInitialStock;
