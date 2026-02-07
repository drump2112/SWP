import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '../hooks/usePageTitle';
import { inventoryReportAPI, type DetailedInventoryReport } from '../api/inventory-report';
import { warehousesAPI } from '../api/commercial-warehouses';
import { suppliersAPI } from '../api/commercial-suppliers';
import Select2 from '../components/Select2';
import { DocumentChartBarIcon, PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const CommercialInventoryReportPage: React.FC = () => {
  usePageTitle('Báo cáo Nhập Xuất Tồn TM');

  const [warehouseFilter, setWarehouseFilter] = useState<number | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
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

  const { data: suppliers = [] } = useQuery({
    queryKey: ['commercial-suppliers'],
    queryFn: async () => {
      const response = await suppliersAPI.getAll();
      return response.data;
    },
  });

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['inventory-report-detailed', startDate, endDate, warehouseFilter, supplierFilter],
    queryFn: async () => {
      const response = await inventoryReportAPI.getDetailedReport({
        start_date: startDate,
        end_date: endDate,
        warehouse_id: warehouseFilter || undefined,
        supplier_id: supplierFilter || undefined,
      });
      return response.data;
    },
    enabled: !!startDate && !!endDate,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo Nhập Xuất Tồn Kho</h1>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            <PrinterIcon className="h-5 w-5" />
            In báo cáo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
            <Select2
              value={supplierFilter}
              onChange={(val) => setSupplierFilter(val ? Number(val) : null)}
              options={[
                { value: '', label: 'Tất cả NCC' },
                ...suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                })),
              ]}
              placeholder="Chọn NCC"
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

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      ) : !reportData ? (
        <div className="p-8 text-center text-gray-500">
          <DocumentChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Chọn khoảng thời gian và nhấn "Xem báo cáo"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white p-6 text-center print:block">
            <h2 className="text-xl font-bold">CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P - CHI NHÁNH ĐÔNG ĐA</h2>
            <h3 className="text-lg font-semibold mt-2">
              TỔNG HỢP BÁN HÀNG THÁNG {new Date(startDate).getMonth() + 1}/{new Date(startDate).getFullYear()} (CÁC KHO)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Từ ngày: {new Date(startDate).toLocaleDateString('vi-VN')} đến {new Date(endDate).toLocaleDateString('vi-VN')}
            </p>
          </div>

          {/* TỔNG HỢP NHẬP */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-6 py-3 border-b">
              <h3 className="font-bold text-lg">TỔNG HỢP NHẬP</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th rowSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">STT</th>
                    <th rowSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">NHÀ CUNG CẤP</th>
                    <th colSpan={4} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">SẢN LƯỢNG</th>
                    <th rowSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">TỔNG SL NHẬP</th>
                    <th rowSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">GIÁ TRỊ</th>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">A95</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">DO 05</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">E5</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">DO 001</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.imports.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-center border">{index + 1}</td>
                      <td className="px-4 py-2 border font-medium">{item.supplier_name}</td>
                      <td className="px-4 py-2 text-right border">{item.quantity_a95.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2 text-right border">{item.quantity_do.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2 text-right border">{item.quantity_e5.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2 text-right border">{item.quantity_do001.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2 text-right border font-semibold">{item.total_quantity.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2 text-right border font-semibold">{item.total_amount.toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-50 font-bold">
                    <td colSpan={2} className="px-4 py-2 text-center border">TỔNG CỘNG</td>
                    <td className="px-4 py-2 text-right border">
                      {reportData.imports.reduce((sum, item) => sum + item.quantity_a95, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-right border">
                      {reportData.imports.reduce((sum, item) => sum + item.quantity_do, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-right border">
                      {reportData.imports.reduce((sum, item) => sum + item.quantity_e5, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-right border">
                      {reportData.imports.reduce((sum, item) => sum + item.quantity_do001, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-right border">{reportData.summary.total_import_quantity.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-2 text-right border">{reportData.summary.total_import_amount.toLocaleString('vi-VN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TỔNG HỢP XUẤT BÁN */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-6 py-3 border-b">
              <h3 className="font-bold text-lg">TỔNG HỢP XUẤT BÁN</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th rowSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">STT</th>
                    <th rowSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">KHÁCH HÀNG</th>
                    <th colSpan={5} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">SỐ LƯỢNG (lít)</th>
                    <th rowSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">TỔNG</th>
                    <th colSpan={3} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">DOANH THU (đồng)</th>
                    <th rowSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">TỔNG DT</th>
                    <th colSpan={3} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">LỢI NHUẬN (đồng)</th>
                    <th rowSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">TỔNG LN</th>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">A95</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">DO</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">E5</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">DO 001</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">SL</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">A95</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">DO</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">E5</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">A95</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">DO</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border">E5</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.exports.map((item, index) => {
                    const isGroupRow = item.customer_id === null;
                    const displayName = isGroupRow ? item.customer_group_name : item.customer_name;

                    return (
                      <tr key={index} className={isGroupRow ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}>
                        <td className="px-4 py-2 text-center border">{index + 1}</td>
                        <td className={`px-4 py-2 border ${isGroupRow ? 'font-bold' : 'pl-8'}`}>
                          {displayName}
                        </td>
                        <td className="px-4 py-2 text-right border">{item.quantity_a95.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-2 text-right border">{item.quantity_do.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-2 text-right border">{item.quantity_e5.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-2 text-right border">{item.quantity_do001.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-2 text-right border">{item.total_quantity.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-2 text-right border font-semibold">{item.total_quantity.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-2 text-right border">-</td>
                        <td className="px-4 py-2 text-right border">-</td>
                        <td className="px-4 py-2 text-right border">-</td>
                        <td className="px-4 py-2 text-right border font-semibold">{item.revenue.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-2 text-right border">-</td>
                        <td className="px-4 py-2 text-right border">-</td>
                        <td className="px-4 py-2 text-right border">-</td>
                        <td className="px-4 py-2 text-right border font-semibold text-green-600">{item.profit.toLocaleString('vi-VN')}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-yellow-50 font-bold">
                    <td colSpan={2} className="px-4 py-2 text-center border">TỔNG CỘNG</td>
                    <td className="px-4 py-2 text-right border">
                      {reportData.exports.reduce((sum, item) => sum + item.quantity_a95, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-right border">
                      {reportData.exports.reduce((sum, item) => sum + item.quantity_do, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-right border">
                      {reportData.exports.reduce((sum, item) => sum + item.quantity_e5, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-right border">
                      {reportData.exports.reduce((sum, item) => sum + item.quantity_do001, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-right border">
                      {reportData.summary.total_export_quantity.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-right border">{reportData.summary.total_export_quantity.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-2 text-right border">-</td>
                    <td className="px-4 py-2 text-right border">-</td>
                    <td className="px-4 py-2 text-right border">-</td>
                    <td className="px-4 py-2 text-right border">{reportData.summary.total_revenue.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-2 text-right border">-</td>
                    <td className="px-4 py-2 text-right border">-</td>
                    <td className="px-4 py-2 text-right border">-</td>
                    <td className="px-4 py-2 text-right border text-green-600">{reportData.summary.total_profit.toLocaleString('vi-VN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommercialInventoryReportPage;
