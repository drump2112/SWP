import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi, type CreditStatus } from '../api/customers';
import { useAuth } from '../contexts/AuthContext';
import { MagnifyingGlassIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon, CreditCardIcon, FunnelIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { exportToExcel } from '../utils/excel';

const CustomerCreditPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [filterLevel, setFilterLevel] = useState<'all' | 'withinLimit' | 'overLimit'>('all');
  const [filterType, setFilterType] = useState<'all' | 'EXTERNAL' | 'INTERNAL'>('all');

  // Lấy tất cả credit status
  const { data: allCreditStatus, isLoading: loadingCreditStatus } = useQuery({
    queryKey: ['credit-status-all', user?.storeId],
    queryFn: () => customersApi.getAllCreditStatus(user?.storeId),
  });

  // Tính toán thống kê
  const stats = useMemo(() => {
    if (!allCreditStatus) return { withinLimit: 0, overLimit: 0 };
    return allCreditStatus.reduce((acc, curr) => {
      if (curr.warningLevel === 'overlimit') {
        acc.overLimit++;
      } else {
        acc.withinLimit++;
      }
      return acc;
    }, { withinLimit: 0, overLimit: 0 });
  }, [allCreditStatus]);

  const filteredCustomers = useMemo(() => {
    if (!allCreditStatus) return [];
    return allCreditStatus.filter((status) => {
      const matchesSearch =
        status.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        status.customerCode?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesFilter = true;
      if (filterLevel === 'withinLimit') {
        matchesFilter = status.warningLevel !== 'overlimit';
      } else if (filterLevel === 'overLimit') {
        matchesFilter = status.warningLevel === 'overlimit';
      }

      const matchesType = filterType === 'all' || (status.customerType || 'EXTERNAL') === filterType;

      return matchesSearch && matchesFilter && matchesType;
    });
  }, [allCreditStatus, searchTerm, filterLevel, filterType]);

  const selectedCustomerStatus = useMemo(() => {
    if (!selectedCustomerId || !allCreditStatus) return null;
    return allCreditStatus.find(s => s.customerId === selectedCustomerId);
  }, [selectedCustomerId, allCreditStatus]);

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'safe':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'danger':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'overlimit':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getWarningIcon = (level: string) => {
    switch (level) {
      case 'safe':
        return <CheckCircleIcon className="h-8 w-8 text-green-600" />;
      case 'warning':
      case 'danger':
        return <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />;
      case 'overlimit':
        return <XCircleIcon className="h-8 w-8 text-red-600" />;
      default:
        return null;
    }
  };

  const getWarningMessage = (level: string) => {
    switch (level) {
      case 'safe':
        return 'Công nợ trong hạn mức cho phép';
      case 'warning':
        return 'Cảnh báo: Đã sử dụng 75% hạn mức';
      case 'danger':
        return 'Cảnh báo: Đã sử dụng 75% hạn mức'; // Treat as warning
      case 'overlimit':
        return 'Vượt hạn mức: Không nên bán công nợ thêm';
      default:
        return '';
    }
  };

  const handleExport = () => {
    if (!filteredCustomers) return;

    const data = filteredCustomers.map(item => ({
      'Mã KH': item.customerCode,
      'Tên khách hàng': item.customerName,
      'Loại': item.customerType === 'INTERNAL' ? 'Nội bộ' : 'Khách hàng',
      'Hạn mức': item.creditLimit,
      'Công nợ hiện tại': item.currentDebt,
      'Còn lại': item.availableCredit,
      'Sử dụng (%)': item.creditUsagePercent,
      'Trạng thái': item.warningLevel
    }));

    exportToExcel(data, `Han_muc_cong_no_${dayjs().format('YYYY-MM-DD')}`);
  };

  if (loadingCreditStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải dữ liệu công nợ...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <CreditCardIcon className="h-8 w-8 text-blue-600" />
            Quản lý hạn mức công nợ
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Theo dõi và quản lý hạn mức công nợ khách hàng
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!filteredCustomers?.length}
          className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Xuất Excel
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div
          onClick={() => setFilterLevel('withinLimit')}
          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${filterLevel === 'withinLimit' ? 'ring-2 ring-green-500 shadow-lg' : 'hover:shadow-md'} bg-green-50 border-green-200`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Trong hạn mức</p>
              <p className="text-2xl font-bold text-green-600">{stats.withinLimit}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500 opacity-50" />
          </div>
          <p className="text-xs text-green-700 mt-2">Trong hạn mức cho phép</p>
        </div>

        <div
          onClick={() => setFilterLevel('overLimit')}
          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${filterLevel === 'overLimit' ? 'ring-2 ring-red-500 shadow-lg' : 'hover:shadow-md'} bg-red-50 border-red-200`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">Vượt hạn mức</p>
              <p className="text-2xl font-bold text-red-600">{stats.overLimit}</p>
            </div>
            <XCircleIcon className="h-8 w-8 text-red-500 opacity-50" />
          </div>
          <p className="text-xs text-red-700 mt-2">Đã vượt quá hạn mức</p>
        </div>
      </div>

      {/* Filter Info */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-sm text-gray-700 font-medium">Bộ lọc:</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tất cả khách hàng</option>
            <option value="EXTERNAL">Khách hàng thường</option>
            <option value="INTERNAL">Nội bộ (Nhân viên)</option>
          </select>

          {filterLevel !== 'all' && (
            <span className="text-sm text-gray-700">
              Trạng thái: <span className="font-bold uppercase">{filterLevel === 'withinLimit' ? 'Trong hạn mức' : 'Vượt hạn mức'}</span>
            </span>
          )}
        </div>

        {(filterLevel !== 'all' || filterType !== 'all') && (
          <button
            onClick={() => {
              setFilterLevel('all');
              setFilterType('all');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
              <h2 className="text-lg font-semibold text-white">Danh sách khách hàng</h2>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm khách hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                />
              </div>

              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                {filteredCustomers && filteredCustomers.length > 0 ? (
                  filteredCustomers.map((status) => (
                    <div
                      key={status.customerId}
                      onClick={() => setSelectedCustomerId(status.customerId)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedCustomerId === status.customerId
                          ? 'bg-blue-50 border-blue-500 shadow-sm'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900">{status.customerName}</div>
                            {status.customerType === 'INTERNAL' && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded border border-purple-200">
                                NB
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {status.customerCode}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          status.warningLevel === 'safe' ? 'bg-green-100 text-green-800' :
                          status.warningLevel === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          status.warningLevel === 'danger' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(status.creditUsagePercent)}%
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 font-semibold mt-1">
                        HM: {status.creditLimit !== null && status.creditLimit !== undefined
                          ? `${status.creditLimit.toLocaleString('vi-VN')} ₫`
                          : 'Chưa cài đặt'
                        }
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-gray-500 py-8">
                    Không tìm thấy khách hàng
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Credit Status Detail */}
        <div className="lg:col-span-2">
          {selectedCustomerStatus ? (
            <div className="space-y-6">
              {/* Status Card */}
              <div className={`border-2 rounded-2xl p-6 ${getWarningColor(selectedCustomerStatus.warningLevel)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getWarningIcon(selectedCustomerStatus.warningLevel)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">{selectedCustomerStatus.customerName}</h3>
                        {selectedCustomerStatus.customerType === 'INTERNAL' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded border border-purple-200">
                            Nội bộ
                          </span>
                        )}
                      </div>
                      <p className="text-sm opacity-80">{selectedCustomerStatus.customerCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-80">Mức sử dụng</div>
                    <div className="text-3xl font-bold">{selectedCustomerStatus.creditUsagePercent}%</div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-semibold">{getWarningMessage(selectedCustomerStatus.warningLevel)}</p>
                </div>
              </div>

              {/* Detail Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                  <div className="text-sm text-gray-600 mb-1">Hạn mức cho phép</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedCustomerStatus.creditLimit.toLocaleString('vi-VN')} ₫
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                  <div className="text-sm text-gray-600 mb-1">Công nợ hiện tại</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedCustomerStatus.currentDebt.toLocaleString('vi-VN')} ₫
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                  <div className="text-sm text-gray-600 mb-1">Còn lại có thể bán</div>
                  <div className={`text-2xl font-bold ${
                    selectedCustomerStatus.availableCredit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedCustomerStatus.availableCredit.toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Biểu đồ sử dụng hạn mức</h3>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-gray-600">
                        Đã sử dụng
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-gray-600">
                        {selectedCustomerStatus.creditUsagePercent}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                    <div
                      style={{ width: `${Math.min(selectedCustomerStatus.creditUsagePercent, 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                        selectedCustomerStatus.warningLevel === 'safe'
                          ? 'bg-green-500'
                          : selectedCustomerStatus.warningLevel === 'warning' || selectedCustomerStatus.warningLevel === 'danger'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0 ₫</span>
                    <span>{selectedCustomerStatus.creditLimit.toLocaleString('vi-VN')} ₫</span>
                  </div>
                </div>

                {/* Markers */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-600">An toàn (&lt;75%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-gray-600">Cảnh báo (75-100%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-600">Vượt hạn (&gt;100%)</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {selectedCustomerStatus.isOverLimit && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex items-start">
                    <XCircleIcon className="h-6 w-6 text-red-500 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-semibold text-red-800">Khuyến nghị</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Khách hàng đã vượt quá hạn mức công nợ. Không nên thực hiện bán công nợ thêm cho đến khi khách hàng thanh toán.
                        Liên hệ kế toán hoặc quản lý để xử lý.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-gray-400 mb-4">
                <MagnifyingGlassIcon className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chọn khách hàng để xem chi tiết
              </h3>
              <p className="text-sm text-gray-500">
                Chọn một khách hàng từ danh sách bên trái để xem trạng thái hạn mức công nợ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerCreditPage;
