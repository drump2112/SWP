import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, type DebtReportParams } from '../api/reports';
import { storesApi } from '../api/stores';
import { customersApi } from '../api/customers';
import { useAuth } from '../contexts/AuthContext';
import {
  ChartBarIcon,
  FunnelIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import SearchableSelect from '../components/SearchableSelect';

const DebtReportPage: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DebtReportParams>({
    storeId: user?.storeId,
    fromDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    toDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  const [showDetails, setShowDetails] = useState<number | null>(null);

  // Fetch stores (cho kế toán)
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId, // Chỉ load nếu là kế toán (không có storeId)
  });

  // Fetch customers (cho filter)
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
  });

  // Fetch debt report
  const { data: report, isLoading } = useQuery({
    queryKey: ['debt-report', filters],
    queryFn: () => reportsApi.getDebtReport(filters),
  });

  const handleExportExcel = () => {
    // TODO: Implement Excel export
    alert('Chức năng xuất Excel đang phát triển');
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('Chức năng xuất PDF đang phát triển');
  };

  const totalSummary = report?.reduce(
    (acc, item) => ({
      openingBalance: acc.openingBalance + item.openingBalance,
      totalDebit: acc.totalDebit + item.totalDebit,
      totalCredit: acc.totalCredit + item.totalCredit,
      closingBalance: acc.closingBalance + item.closingBalance,
    }),
    { openingBalance: 0, totalDebit: 0, totalCredit: 0, closingBalance: 0 },
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
          Báo Cáo Công Nợ Khách Hàng
        </h1>
        <p className="text-gray-600 mt-2">
          Theo dõi công nợ, phát sinh và dư cuối kỳ của khách hàng
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Bộ lọc</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {!user?.storeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cửa hàng
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: 'Tất cả cửa hàng' },
                  ...(stores?.map(store => ({
                    value: store.id.toString(),
                    label: `${store.code} - ${store.name}`
                  })) || [])
                ]}
                value={filters.storeId?.toString() || ''}
                onChange={(value) =>
                  setFilters({ ...filters, storeId: value && value !== '' ? +value : undefined })
                }
                placeholder="Chọn cửa hàng"
                isClearable
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Khách hàng
            </label>
            <SearchableSelect
              options={[
                { value: '', label: 'Tất cả khách hàng' },
                ...(customers?.map(customer => ({
                  value: customer.id,
                  label: `${customer.code} - ${customer.name}`
                })) || [])
              ]}
              value={filters.customerId || ''}
              onChange={(value) =>
                setFilters({ ...filters, customerId: value ? +value : undefined })
              }
              placeholder="Chọn khách hàng"
              isClearable
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Từ ngày
            </label>
            <input
              type="date"
              value={filters.fromDate || ''}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đến ngày
            </label>
            <input
              type="date"
              value={filters.toDate || ''}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Xuất Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Xuất PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-4">
          <div className="text-sm text-blue-600 font-medium">Dư đầu kỳ</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {totalSummary?.openingBalance.toLocaleString('vi-VN')} ₫
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow p-4">
          <div className="text-sm text-red-600 font-medium">Phát sinh nợ</div>
          <div className="text-2xl font-bold text-red-700 mt-1">
            {totalSummary?.totalDebit.toLocaleString('vi-VN')} ₫
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-4">
          <div className="text-sm text-green-600 font-medium">Phát sinh có</div>
          <div className="text-2xl font-bold text-green-700 mt-1">
            {totalSummary?.totalCredit.toLocaleString('vi-VN')} ₫
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-4">
          <div className="text-sm text-purple-600 font-medium">Dư cuối kỳ</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {totalSummary?.closingBalance.toLocaleString('vi-VN')} ₫
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Mã KH
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Tên khách hàng
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Dư đầu kỳ
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Phát sinh nợ
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Phát sinh có
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Dư cuối kỳ
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {report && report.length > 0 ? (
                report.map((item) => (
                  <React.Fragment key={item.customer.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                        {item.customer.code}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        <div className="font-medium">{item.customer.name}</div>
                        {item.customer.phone && (
                          <div className="text-xs text-gray-500">{item.customer.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <span className={item.openingBalance > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {item.openingBalance.toLocaleString('vi-VN')} ₫
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <span className="text-red-600 font-semibold">
                          {item.totalDebit.toLocaleString('vi-VN')} ₫
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <span className="text-green-600 font-semibold">
                          {item.totalCredit.toLocaleString('vi-VN')} ₫
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <span className={item.closingBalance > 0 ? 'text-purple-600 font-bold' : 'text-gray-600'}>
                          {item.closingBalance.toLocaleString('vi-VN')} ₫
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <button
                          onClick={() => setShowDetails(showDetails === item.customer.id ? null : item.customer.id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {showDetails === item.customer.id ? 'Ẩn' : 'Chi tiết'}
                        </button>
                      </td>
                    </tr>

                    {/* Detail Rows */}
                    {showDetails === item.customer.id && item.ledgers.length > 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="text-sm font-semibold text-gray-700 mb-2">Chi tiết phát sinh:</div>
                          <table className="w-full text-xs">
                            <thead className="bg-gray-200">
                              <tr>
                                <th className="px-4 py-2 text-left">Ngày</th>
                                <th className="px-4 py-2 text-left">Loại</th>
                                <th className="px-4 py-2 text-left">Sản phẩm</th>
                                <th className="px-4 py-2 text-right">Số lượng (L)</th>
                                <th className="px-4 py-2 text-right">Đơn giá (₫/L)</th>
                                <th className="px-4 py-2 text-right">Nợ (₫)</th>
                                <th className="px-4 py-2 text-right">Có (₫)</th>
                                <th className="px-4 py-2 text-left">Ghi chú</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.ledgers.map((ledger: any) => (
                                <tr key={ledger.id} className="border-t hover:bg-gray-100">
                                  <td className="px-4 py-2 whitespace-nowrap">{dayjs(ledger.date).format('DD/MM/YYYY HH:mm')}</td>
                                  <td className="px-4 py-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      ledger.refType === 'DEBT_SALE'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {ledger.refType === 'DEBT_SALE' ? 'Bán nợ' :
                                       ledger.refType === 'PAYMENT' ? 'Thu tiền' :
                                       ledger.refType === 'RECEIPT' ? 'Thu tiền' :
                                       ledger.refType === 'ADJUST' ? 'Điều chỉnh' :
                                       'Khác'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    {ledger.productDetails ? (
                                      <span className="font-medium text-gray-900">
                                        {ledger.productDetails.productName}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono">
                                    {ledger.productDetails ? (
                                      ledger.productDetails.quantity.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono">
                                    {ledger.productDetails ? (
                                      ledger.productDetails.unitPrice.toLocaleString('vi-VN')
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right font-semibold">
                                    {ledger.debit > 0 ? (
                                      <span className="text-red-600">{ledger.debit.toLocaleString('vi-VN')}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right font-semibold">
                                    {ledger.credit > 0 ? (
                                      <span className="text-green-600">{ledger.credit.toLocaleString('vi-VN')}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-gray-600">{ledger.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Không có dữ liệu công nợ trong kỳ này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DebtReportPage;
