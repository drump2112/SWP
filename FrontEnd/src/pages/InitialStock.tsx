import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi } from '../api/stores';
import { productsApi } from '../api/products';
import api from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

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

const InitialStock: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(user?.storeId || null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [effectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');

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

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/inventory/simple-initial-stock', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Nhập tồn đầu thành công!');
      setStockItems([]);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(`❌ ${errorMsg}`);
      console.error('Submit error:', error);
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

    if (stockItems.length === 0 || stockItems.some(item => !item.productId || item.quantity <= 0)) {
      toast.error('Vui lòng nhập đầy đủ thông tin mặt hàng và số lượng');
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

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📦 Nhập Tồn Đầu Kỳ</h1>

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
                <select
                  className="shadow border rounded w-full py-2 px-3 text-gray-700"
                  value={item.productId}
                  onChange={(e) => updateStockItem(index, 'productId', e.target.value)}
                  disabled={isLoadingProducts}
                  required
                >
                  <option value="0">-- Chọn mặt hàng --</option>
                  {products?.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-40">
                <input
                  type="number"
                  step="0.001"
                  placeholder="Số lượng (lít)"
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
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded"
              >
                🗑️
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
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={submitMutation.isPending || !selectedStoreId || stockItems.length === 0}
            className={`font-bold py-2 px-4 rounded ${
              submitMutation.isPending || !selectedStoreId || stockItems.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-700 text-white'
            }`}
          >
            {submitMutation.isPending ? '⏳ Đang xử lý...' : '💾 Lưu Tồn Đầu'}
          </button>

          <span className="text-sm text-gray-600">
            * Trường bắt buộc
          </span>
        </div>
      </form>

      {/* Hướng dẫn */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4">
        <h3 className="font-bold mb-2">📌 Hướng dẫn:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Chọn cửa hàng cần nhập tồn đầu</li>
          <li>Thêm từng mặt hàng và nhập số lượng tồn kho thực tế</li>
          <li>Hệ thống sẽ tự động điều chỉnh để khớp với số tồn bạn nhập</li>
        </ul>
      </div>
    </div>
  );
};

export default InitialStock;
