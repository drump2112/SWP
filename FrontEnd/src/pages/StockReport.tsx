import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface StockProduct {
  productId: number;
  productCode: string;
  productName: string;
  totalStock: number;
  unit: string;
}

interface StockReport {
  storeId: number;
  warehouseId: number;
  reportDate: string;
  products: StockProduct[];
}

const StockReport: React.FC = () => {
  const { user } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [report, setReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStoreUser = user?.roleCode === 'STORE';

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    // Nếu là user cửa hàng, tự động chọn cửa hàng của họ
    if (isStoreUser && user?.storeId && stores.length > 0) {
      setSelectedStoreId(user.storeId);
      loadStockReport(user.storeId);
    }
  }, [isStoreUser, user, stores]);

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
      setError('Không thể tải danh sách cửa hàng');
    }
  };

  const loadStockReport = async (storeId: number) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('Loading stock report from:', `${apiUrl}/inventory/stock-report/${storeId}`);
      const res = await axios.get(
        `${apiUrl}/inventory/stock-report/${storeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Stock report loaded:', res.data);
      setReport(res.data);
    } catch (error: any) {
      console.error('Failed to load stock report:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Không thể tải báo cáo');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreChange = (storeId: number) => {
    setSelectedStoreId(storeId);
    if (storeId) {
      loadStockReport(storeId);
    } else {
      setReport(null);
    }
  };

  const calculateTotalStock = () => {
    if (!report || !report.products) return 0;
    return report.products.reduce((sum, p) => sum + p.totalStock, 0);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📊 Báo Cáo Tồn Kho</h1>

      {/* Chọn cửa hàng */}
      <div className="mb-6 bg-white shadow-md rounded px-6 py-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Chọn cửa hàng
          {isStoreUser && <span className="ml-2 text-xs text-gray-500">(Chỉ xem cửa hàng của bạn)</span>}
        </label>
        <select
          className="shadow border rounded w-full md:w-1/2 py-2 px-3 text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={selectedStoreId || ''}
          onChange={(e) => handleStoreChange(Number(e.target.value))}
          disabled={isStoreUser}
        >
          <option value="">-- Chọn cửa hàng --</option>
          {stores
            .filter(store => !isStoreUser || store.id === user?.storeId)
            .map(store => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.code})
              </option>
            ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">⏳ Đang tải báo cáo...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <div className="bg-white shadow-md rounded overflow-hidden">
          {/* Header */}
          <div className="bg-blue-500 text-white px-6 py-4">
            <h2 className="text-xl font-bold">
              {stores.find(s => s.id === report.storeId)?.name || `Cửa hàng #${report.storeId}`}
            </h2>
            <p className="text-sm opacity-90">
              Ngày báo cáo: {new Date(report.reportDate).toLocaleString('vi-VN')}
            </p>
          </div>

          {/* Products Table */}
          {!report.products || report.products.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              📭 Chưa có dữ liệu tồn kho
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã SP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên Sản Phẩm
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tồn Kho
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Đơn Vị
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.products.map((product, index) => (
                    <tr key={product.productId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.productCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        <span className={product.totalStock > 0 ? 'text-green-600' : 'text-gray-400'}>
                          {product.totalStock.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                        {product.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      TỔNG CỘNG:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-blue-600">
                      {calculateTotalStock().toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-500">
                      lít
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Help */}
      {!selectedStoreId && (
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <h3 className="font-bold mb-2">💡 Lưu ý:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Báo cáo hiển thị tổng tồn kho theo từng mặt hàng</li>
            <li><strong>Không phân biệt bể chứa</strong> - chỉ tổng hợp theo sản phẩm</li>
            <li>Tồn kho được tính từ tất cả giao dịch nhập/xuất trong hệ thống</li>
            <li>Dữ liệu cập nhật theo thời gian thực</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default StockReport;
