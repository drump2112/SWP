import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '../hooks/usePageTitle';
import { inventoryReportAPI, type InventoryReportItem } from '../api/inventory-report';
import { warehousesAPI } from '../api/commercial-warehouses';
import Select2 from '../components/Select2';
import { DocumentChartBarIcon } from '@heroicons/react/24/outline';

const CommercialInventoryReportPage: React.FC = () => {
  usePageTitle('Báo cáo Nhập Xuất Tồn TM');

  const [warehouseFilter, setWarehouseFilter] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['commercial-warehouses'],
    queryFn: async () => {
      const response = await warehousesAPI.getAll();
      return response.data;
    },
  });

  const { data: reportData = [], isLoading, refetch } = useQuery({
    queryKey: ['inventory-report', startDate, endDate, warehouseFilter],
    queryFn: async () => {
      const response = await inventoryReportAPI.getReport({
        start_date: startDate,
        end_date: endDate,
        warehouse_id: warehouseFilter || undefined,
      });
      return response.data;
    },
    enabled: !!startDate && !!endDate,
  });

  const summary = useMemo(() => {
    return reportData.reduce(
      (acc, item) => ({
        total_imported: acc.total_imported + item.total_imported,
        total_exported: acc.total_exported + item.total_exported,
        closing_stock: acc.closing_stock + item.closing_stock,
      }),
      { total_imported: 0, total_exported: 0, closing_stock: 0 }
    );
  }, [reportData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo Nhập Xuất Tồn Kho</h1>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kho</label>
            <Select2
              value={warehouseFilter}
              onChange={(val) => setWarehouseFilter(val ? Number(val) : null)}
              options={[
                { value: '', label: 'Tất cả kho' },
                ...warehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: warehouse.name,
                })),
              ]}
              placeholder="Chọn kho"
              isClearable
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Xem báo cáo
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Tổng nhập kho</div>
          <div className="text-2xl font-bold text-green-700 mt-1">
            {summary.total_imported.toLocaleString('vi-VN')}
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">Tổng xuất kho</div>
          <div className="text-2xl font-bold text-red-700 mt-1">
            {summary.total_exported.toLocaleString('vi-VN')}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Tồn kho cuối kỳ</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {summary.closing_stock.toLocaleString('vi-VN')}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <DocumentChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Không có dữ liệu trong khoảng thời gian đã chọn</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sản phẩm
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tồn đầu
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nhập
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Xuất
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tồn cuối
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.warehouse_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {item.opening_stock.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                      {item.total_imported.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                      {item.total_exported.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-semibold">
                      {item.closing_stock.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommercialInventoryReportPage;
