import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, type CashReportParams } from '../api/reports';
import { storesApi } from '../api/stores';
import { useAuth } from '../contexts/AuthContext';
import {
  BanknotesIcon,
  FunnelIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import SearchableSelect from '../components/SearchableSelect';
import { exportToExcel } from '../utils/excel';

const CashReportPage: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<CashReportParams>({
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

  // Fetch cash report
  const { data: report, isLoading } = useQuery({
    queryKey: ['cash-report', filters],
    queryFn: () => reportsApi.getCashReport(filters),
  });

  const handleExportExcel = () => {
    if (!report?.ledgers) return;

    const data = report.ledgers.map((item: any, index: number) => ({
      'STT': index + 1,
      'Ngày': dayjs(item.date).format('DD/MM/YYYY'),
      'Loại chứng từ': getRefTypeLabel(item.refType),
      'Mã phiếu': item.refId ? `PC${item.refId}` : '', // Giả lập mã phiếu
      'Diễn giải': item.details?.notes || item.notes || '',
      'Thu': item.cashIn,
      'Chi': item.cashOut,
      'Tồn': item.balance
    }));

    exportToExcel(data, `So_quy_tien_mat_${filters.fromDate}_${filters.toDate}`);
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('Chức năng xuất PDF đang phát triển');
  };

  const getRefTypeLabel = (refType: string) => {
    switch (refType) {
      case 'RECEIPT':
        return 'Phiếu thu';
      case 'DEPOSIT':
        return 'Phiếu nộp';
      case 'EXPENSE':
        return 'Chi phí';
      case 'ADJUST':
        return 'Điều chỉnh';
      case 'SHIFT_CLOSE':
        return 'Chốt ca';
      case 'SHIFT_OPEN':
        return 'Mở ca';
      case 'SALE':
        return 'Bán hàng';
      case 'PAYMENT':
        return 'Thu tiền';
      default:
        return 'Khác';
    }
  };

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
          <BanknotesIcon className="h-8 w-8 text-blue-600" />
          Báo Cáo Sổ Quỹ Tiền Mặt
        </h1>
        <p className="text-gray-600 mt-2">
          Theo dõi thu chi tiền mặt qua phiếu thu và phiếu nộp
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Bộ lọc</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại chứng từ
            </label>
            <select
              value={filters.refType || ''}
              onChange={(e) => setFilters({ ...filters, refType: e.target.value || undefined })}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
            >
              <option value="">Tất cả</option>
              <option value="RECEIPT">Phiếu thu</option>
              <option value="DEPOSIT">Phiếu nộp</option>
              <option value="EXPENSE">Chi phí</option>
              <option value="ADJUST">Điều chỉnh</option>
              <option value="SHIFT_CLOSE">Chốt ca</option>
              <option value="SHIFT_OPEN">Mở ca</option>
              <option value="SALE">Bán hàng</option>
              <option value="PAYMENT">Thu tiền</option>
            </select>
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
          <div className="text-sm text-blue-600 font-medium">Số dư đầu kỳ</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {report?.openingBalance.toLocaleString('vi-VN')} ₫
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-4">
          <div className="text-sm text-green-600 font-medium flex items-center gap-1">
            <ArrowDownIcon className="h-4 w-4" />
            Tổng thu
          </div>
          <div className="text-2xl font-bold text-green-700 mt-1">
            {report?.totalCashIn.toLocaleString('vi-VN')} ₫
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow p-4">
          <div className="text-sm text-red-600 font-medium flex items-center gap-1">
            <ArrowUpIcon className="h-4 w-4" />
            Tổng chi
          </div>
          <div className="text-2xl font-bold text-red-700 mt-1">
            {report?.totalCashOut.toLocaleString('vi-VN')} ₫
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-4">
          <div className="text-sm text-purple-600 font-medium">Số dư cuối kỳ</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {report?.closingBalance.toLocaleString('vi-VN')} ₫
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {/* Opening Balance Row */}
              <tr className="bg-blue-50">
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900" colSpan={5}>
                  Số dư đầu kỳ
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-blue-700">
                  {report?.openingBalance.toLocaleString('vi-VN')} ₫
                </th>
                <th></th>
              </tr>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Ngày giờ
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Loại chứng từ
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Hình thức
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Tiền thu (₫)
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Tiền chi (₫)
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Số dư (₫)
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">

              {report?.ledgers && report.ledgers.length > 0 ? (
                report.ledgers.map((ledger: any) => (
                  <React.Fragment key={ledger.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-center text-sm text-gray-900 whitespace-nowrap">
                        {dayjs(ledger.date).format('DD/MM/YYYY HH:mm')}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ledger.refType === 'RECEIPT'
                            ? 'bg-green-100 text-green-700'
                            : ledger.refType === 'DEPOSIT'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {getRefTypeLabel(ledger.refType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {ledger.details?.paymentMethod === 'BANK_TRANSFER' ? (
                          <span className="text-xs font-medium text-blue-600">🏦 CK</span>
                        ) : (
                          <span className="text-xs font-medium text-green-600">💵 TM</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {ledger.cashIn > 0 ? (
                          <span className="text-green-600 font-semibold">
                            {ledger.cashIn.toLocaleString('vi-VN')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {ledger.cashOut > 0 ? (
                          <span className="text-red-600 font-semibold">
                            {ledger.cashOut.toLocaleString('vi-VN')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <span className={`font-bold ${
                          ledger.balance >= 0 ? 'text-purple-600' : 'text-red-600'
                        }`}>
                          {ledger.balance.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {ledger.details && (
                          <button
                            onClick={() => setShowDetails(showDetails === ledger.id ? null : ledger.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {showDetails === ledger.id ? 'Ẩn' : 'Chi tiết'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Detail Rows */}
                    {showDetails === ledger.id && ledger.details && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="text-sm font-semibold text-gray-700 mb-2">
                            Chi tiết {getRefTypeLabel(ledger.refType)}:
                          </div>

                          {ledger.details.type === 'RECEIPT' && (
                            <div className="bg-white rounded-lg p-4 border border-green-200">
                              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div>
                                  <span className="text-gray-600">Loại phiếu thu:</span>{' '}
                                  <span className="font-medium">
                                    {ledger.details.receiptType === 'CASH_SALES' ? 'Bán lẻ' : 'Thu nợ'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Tổng tiền:</span>{' '}
                                  <span className="font-bold text-green-600">
                                    {ledger.details.totalAmount?.toLocaleString('vi-VN')} ₫
                                  </span>
                                </div>
                              </div>

                              {ledger.details.customers && ledger.details.customers.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-600 mb-2">
                                    Danh sách khách hàng:
                                  </div>
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-3 py-2 text-left">Khách hàng</th>
                                        <th className="px-3 py-2 text-right">Số tiền (₫)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {ledger.details.customers.map((customer: any, idx: number) => (
                                        <tr key={idx} className="border-t">
                                          <td className="px-3 py-2">{customer.customerName}</td>
                                          <td className="px-3 py-2 text-right font-mono">
                                            {customer.amount.toLocaleString('vi-VN')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {ledger.details.type === 'DEPOSIT' && (
                            <div className="bg-white rounded-lg p-4 border border-red-200">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-600">Ngày nộp:</span>{' '}
                                  <span className="font-medium">
                                    {dayjs(ledger.details.depositDate).format('DD/MM/YYYY')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Giờ nộp:</span>{' '}
                                  <span className="font-medium">{ledger.details.depositTime || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Người nhận:</span>{' '}
                                  <span className="font-medium">{ledger.details.receiverName || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Số tiền:</span>{' '}
                                  <span className="font-bold text-red-600">
                                    {ledger.details.amount?.toLocaleString('vi-VN')} ₫
                                  </span>
                                </div>
                                {ledger.details.notes && (
                                  <div className="col-span-2">
                                    <span className="text-gray-600">Ghi chú:</span>{' '}
                                    <span className="font-medium">{ledger.details.notes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Không có giao dịch trong kỳ này
                  </td>
                </tr>
              )}

              {/* Closing Balance Row */}
              {report?.ledgers && report.ledgers.length > 0 && (
                <tr className="bg-purple-50 font-bold">
                  <td className="px-6 py-4 text-center text-sm text-gray-900" colSpan={6}>
                    Số dư cuối kỳ
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-purple-700">
                    {report?.closingBalance.toLocaleString('vi-VN')} ₫
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashReportPage;
