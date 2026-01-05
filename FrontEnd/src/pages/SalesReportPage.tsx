import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { storesApi } from '../api/stores';
import { useAuth } from '../contexts/AuthContext';
import {
  ChartBarIcon,
  FunnelIcon,
  CalendarIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';

const SalesReportPage: React.FC = () => {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(user?.storeId);
  const [reportType, setReportType] = useState<'pump' | 'product'>('pump');

  // Fetch stores for admin/accountant/sales
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId, // Only fetch if user is not bound to a store
  });

  // Fetch report data
  const { data: pumpReport, isLoading: loadingPump } = useQuery({
    queryKey: ['sales-report-pump', selectedStoreId, fromDate, toDate],
    queryFn: () => reportsApi.getSalesByPump({
      storeId: selectedStoreId,
      fromDate,
      toDate
    }),
    enabled: !!selectedStoreId && reportType === 'pump',
  });

  const { data: productReport, isLoading: loadingProduct } = useQuery({
    queryKey: ['sales-report-product', selectedStoreId, fromDate, toDate],
    queryFn: () => reportsApi.getSalesByProduct({
      storeId: selectedStoreId,
      fromDate,
      toDate
    }),
    enabled: !!selectedStoreId && reportType === 'product',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
          Báo cáo xuất hàng
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Xem báo cáo xuất hàng theo cột bơm hoặc mặt hàng
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Store Selector (if applicable) */}
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

          {/* Report Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại báo cáo</label>
            <div className="flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setReportType('pump')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                  reportType === 'pump'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Theo vòi bơm
              </button>
              <button
                type="button"
                onClick={() => setReportType('product')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r ${
                  reportType === 'product'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Theo mặt hàng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {!selectedStoreId ? (
          <div className="p-12 text-center text-gray-500">
            <FunnelIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Vui lòng chọn cửa hàng để xem báo cáo</p>
          </div>
        ) : (
          <>
            {(loadingPump || loadingProduct) ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {reportType === 'pump' ? (
                        <>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vòi bơm
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mặt hàng
                          </th>
                        </>
                      ) : (
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mặt hàng
                        </th>
                      )}
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số lượng (Lít)
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportType === 'pump' && pumpReport?.map((item, index) => (
                      <tr key={`${item.pumpId}-${item.productName}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.pumpCode} - {item.pumpName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatNumber(Number(item.totalQuantity))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">
                          {formatCurrency(Number(item.totalAmount))}
                        </td>
                      </tr>
                    ))}

                    {reportType === 'product' && productReport?.map((item, index) => (
                      <tr key={`${item.productId}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatNumber(Number(item.totalQuantity))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">
                          {formatCurrency(Number(item.totalAmount))}
                        </td>
                      </tr>
                    ))}

                    {/* Summary Row */}
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={reportType === 'pump' ? 2 : 1} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        Tổng cộng:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                        {formatNumber(
                          (reportType === 'pump' ? pumpReport : productReport)?.reduce(
                            (sum, item) => sum + Number(item.totalQuantity), 0
                          ) || 0
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">
                        {formatCurrency(
                          (reportType === 'pump' ? pumpReport : productReport)?.reduce(
                            (sum, item) => sum + Number(item.totalAmount), 0
                          ) || 0
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {((reportType === 'pump' && (!pumpReport || pumpReport.length === 0)) ||
                  (reportType === 'product' && (!productReport || productReport.length === 0))) && (
                  <div className="p-12 text-center text-gray-500">
                    Không có dữ liệu trong khoảng thời gian này
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesReportPage;
