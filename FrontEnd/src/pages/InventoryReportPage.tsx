import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventory';
import { storesApi } from '../api/stores';
import { useAuth } from '../contexts/AuthContext';
import {
  ArchiveBoxIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { exportToExcel } from '../utils/excel';

const InventoryReportPage: React.FC = () => {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(user?.storeId);
  const [reportType, setReportType] = useState<'summary' | 'import' | 'export'>('summary');

  const isStoreUser = user?.roleCode === 'STORE';

  // Fetch stores for admin/accountant
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId,
  });

  // Fetch inventory report (Summary)
  const { data: report, isLoading: isLoadingReport } = useQuery({
    queryKey: ['inventory-report', selectedStoreId, fromDate, toDate],
    queryFn: () => {
      if (!selectedStoreId) return Promise.resolve([]);
      return inventoryApi.getInventoryReportByStore(selectedStoreId, fromDate, toDate);
    },
    enabled: !!selectedStoreId && reportType === 'summary',
  });

  // Fetch documents (Listing)
  const { data: documents, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['inventory-documents', selectedStoreId, reportType, fromDate, toDate],
    queryFn: async () => {
      if (!selectedStoreId || reportType === 'summary') return Promise.resolve([]);
      const type = reportType === 'import' ? 'IMPORT' : 'EXPORT';
      console.log(`🔍 Fetching documents: storeId=${selectedStoreId}, type=${type}, from=${fromDate}, to=${toDate}`);
      const result = await inventoryApi.getDocuments(selectedStoreId, type, fromDate, toDate);
      console.log(`📦 Documents received:`, result);
      return result;
    },
    enabled: !!selectedStoreId && reportType !== 'summary',
  });

  const isLoading = reportType === 'summary' ? isLoadingReport : isLoadingDocs;

  const handleExport = () => {
    if (reportType === 'summary') {
      if (!report) return;
      const data = report.map((item, index) => ({
        'STT': index + 1,
        'Mã hàng': item.productCode,
        'Tên hàng': item.productName,
        'ĐVT': item.unitName,
        'Tồn đầu kỳ': item.openingBalance,
        'Nhập trong kỳ': item.importQuantity,
        'Xuất trong kỳ': item.exportQuantity,
        'Tồn cuối kỳ': item.closingBalance
      }));
      exportToExcel(data, `Bao_cao_nhap_xuat_ton_${fromDate}_${toDate}`);
    } else {
      if (!documents) return;
      const data = documents.map((item, index) => ({
        'STT': index + 1,
        'Ngày': dayjs(item.docDate).format('DD/MM/YYYY'),
        'Số chứng từ': item.invoiceNumber || `PN${index + 1}`, // Fallback if no invoice number
        'Nhà cung cấp': item.supplierName,
        'Mã hàng': item.productCode,
        'Tên hàng': item.productName,
        'Số lượng': item.quantity,
        'Đơn giá': item.unitPrice,
        'Thành tiền': item.amount
      }));
      exportToExcel(data, `Bang_ke_${reportType}_${fromDate}_${toDate}`);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ArchiveBoxIcon className="h-8 w-8 text-blue-600" />
            Báo cáo Nhập - Xuất - Tồn
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Theo dõi biến động hàng hóa trong kho
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={reportType === 'summary' ? !report?.length : !documents?.length}
          className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Xuất Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Store Selector */}
          {!user?.storeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cửa hàng</label>
              <div className="relative">
                <select
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Chọn cửa hàng</option>
                  {stores?.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          )}
          {isStoreUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cửa hàng
                <span className="ml-2 text-xs text-gray-500">(Cửa hàng của bạn)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={user?.store?.name || 'Cửa hàng của bạn'}
                  disabled
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-100 text-gray-600 cursor-not-allowed sm:text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Report Type Toggle */}
        <div className="flex justify-center">
          <span className="relative z-0 inline-flex shadow-sm rounded-md">
            <button
              type="button"
              onClick={() => setReportType('summary')}
              className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                reportType === 'summary'
                  ? 'bg-blue-50 text-blue-600 border-blue-500 z-10'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tổng hợp
            </button>
            <button
              type="button"
              onClick={() => setReportType('import')}
              className={`-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                reportType === 'import'
                  ? 'bg-blue-50 text-blue-600 border-blue-500 z-10'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Bảng kê Nhập
            </button>
            <button
              type="button"
              onClick={() => setReportType('export')}
              className={`-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                reportType === 'export'
                  ? 'bg-blue-50 text-blue-600 border-blue-500 z-10'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Bảng kê Xuất
            </button>
          </span>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {reportType === 'summary' ? (
                    <>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mã hàng
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tên hàng
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ĐVT
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tồn đầu kỳ
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nhập
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Xuất
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tồn cuối kỳ
                      </th>
                    </>
                  ) : (
                    <>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số chứng từ
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {reportType === 'import' ? 'Nhà cung cấp' : 'Khách hàng/Ghi chú'}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mặt hàng
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số lượng
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Đơn giá
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thành tiền
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportType === 'summary' && report && report.length > 0 ? (
                  report.map((item) => (
                    <tr key={item.productId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.productCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unitName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.openingBalance.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                        {item.importQuantity.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                        {item.exportQuantity.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                        {item.closingBalance.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))
                ) : reportType !== 'summary' && documents && documents.length > 0 ? (
                  documents.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dayjs(item.docDate).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.invoiceNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.supplierName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {Number(item.quantity).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {Number(item.unitPrice).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                        {Number(item.amount).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <ArchiveBoxIcon className="h-12 w-12 mb-3 text-gray-400" />
                        <p className="text-sm font-medium">
                          {reportType === 'summary'
                            ? 'Chưa có dữ liệu nhập xuất tồn trong kỳ này'
                            : reportType === 'import'
                            ? 'Chưa có phiếu nhập hàng trong kỳ này'
                            : 'Chưa có phiếu xuất hàng trong kỳ này'
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Thử chọn khoảng thời gian khác hoặc tạo phiếu mới
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryReportPage;
