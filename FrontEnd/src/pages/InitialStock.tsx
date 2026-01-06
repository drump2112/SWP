import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load stores và products khi mount
  useEffect(() => {
    loadStores();
    loadProducts();
  }, []);

  const loadStores = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('Loading stores from:', `${apiUrl}/stores`);
      const res = await axios.get(`${apiUrl}/stores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Stores loaded:', res.data);
      setStores(res.data);
    } catch (error: any) {
      console.error('Failed to load stores:', error.response?.data || error.message);
      setMessage({ type: 'error', text: 'Không thể tải danh sách cửa hàng' });
    }
  };

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('Loading products from:', `${apiUrl}/products`);
      const res = await axios.get(`${apiUrl}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Products loaded:', res.data);
      setProducts(res.data);
    } catch (error: any) {
      console.error('Failed to load products:', error.response?.data || error.message);
      setMessage({ type: 'error', text: 'Không thể tải danh sách sản phẩm' });
    }
  };

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
      const product = products.find(p => p.id === Number(value));
      if (product) {
        updated[index].productCode = product.code;
        updated[index].productName = product.name;
      }
    }

    setStockItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn cửa hàng' });
      return;
    }

    if (stockItems.length === 0 || stockItems.some(item => !item.productId || item.quantity <= 0)) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin sản phẩm và số lượng' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('access_token');
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

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/inventory/simple-initial-stock`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ type: 'success', text: '✅ Nhập tồn đầu thành công!' });
      setStockItems([]);
      setNotes('');

      console.log('Response:', res.data);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra';
      setMessage({ type: 'error', text: `❌ ${errorMsg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📦 Nhập Tồn Đầu Kỳ</h1>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        {/* Chọn cửa hàng */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Cửa hàng *
          </label>
          <select
            className="shadow border rounded w-full py-2 px-3 text-gray-700"
            value={selectedStoreId || ''}
            onChange={(e) => setSelectedStoreId(Number(e.target.value))}
            required
          >
            <option value="">-- Chọn cửa hàng --</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.code})
              </option>
            ))}
          </select>
        </div>

        {/* Ngày hiệu lực */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Ngày hiệu lực
          </label>
          <input
            type="date"
            className="shadow border rounded w-full py-2 px-3 text-gray-700"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>

        {/* Danh sách sản phẩm */}
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
                  required
                >
                  <option value="0">-- Chọn sản phẩm --</option>
                  {products.map(product => (
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
            disabled={loading || !selectedStoreId || stockItems.length === 0}
            className={`font-bold py-2 px-4 rounded ${
              loading || !selectedStoreId || stockItems.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? '⏳ Đang xử lý...' : '💾 Lưu Tồn Đầu'}
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
