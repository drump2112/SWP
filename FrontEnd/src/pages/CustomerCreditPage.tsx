import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi, type CreditStatus, type Customer, type CustomerStoreLimitsResponse } from '../api/customers';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import { MagnifyingGlassIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon, CreditCardIcon, FunnelIcon, ArrowDownTrayIcon, EyeIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { exportToExcel } from '../utils/excel';

interface CustomerCreditData extends CreditStatus {
  taxCode?: string;
  address?: string;
  phone?: string;
  overLimitAmount?: number;
}

const CustomerCreditPage: React.FC = () => {
  usePageTitle('Hạn mức công nợ');
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'withinLimit' | 'overLimit'>('all');
  const [filterType, setFilterType] = useState<'all' | 'EXTERNAL' | 'INTERNAL'>('all');
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [storeListPage, setStoreListPage] = useState(1);
  const storeListPageSize = 5;

  // Lấy tất cả credit status
  const { data: allCreditStatus, isLoading: loadingCreditStatus } = useQuery({
    queryKey: ['credit-status-all', user?.storeId],
    queryFn: () => customersApi.getAllCreditStatus(user?.storeId),
  });

  // Lấy danh sách khách hàng để lấy thông tin tax code, address
  const { data: allCustomers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers-all', user?.storeId],
    queryFn: () => customersApi.getAll(user?.storeId),
  });

  // Lấy hạn mức theo từng cửa hàng cho khách hàng đang xem chi tiết
  const { data: storeCreditLimits, isLoading: loadingStoreLimits } = useQuery({
    queryKey: ['store-credit-limits', expandedCustomerId],
    queryFn: () => expandedCustomerId ? customersApi.getStoreCreditLimits(expandedCustomerId) : null,
    enabled: !!expandedCustomerId && user?.roleCode !== 'STORE',
  });

  // Reset store list page when expanded customer changes
  useEffect(() => {
    setStoreListPage(1);
  }, [expandedCustomerId]);

  // Tính toán thống kê
  const stats = useMemo(() => {
    if (!allCreditStatus) return { withinLimit: 0, overLimit: 0, total: 0 };
    return allCreditStatus.reduce((acc, curr) => {
      acc.total++;
      if (curr.warningLevel === 'overlimit') {
        acc.overLimit++;
      } else {
        acc.withinLimit++;
      }
      return acc;
    }, { withinLimit: 0, overLimit: 0, total: 0 });
  }, [allCreditStatus]);

  // Merge credit status với customer info
  const mergedData = useMemo(() => {
    if (!allCreditStatus || !allCustomers) return [];

    return allCreditStatus.map((status) => {
      const customer = allCustomers.find(c => c.id === status.customerId);
      const overLimitAmount = Math.max(0, status.currentDebt - status.creditLimit);

      return {
        ...status,
        taxCode: customer?.taxCode,
        address: customer?.address,
        phone: customer?.phone,
        overLimitAmount,
      };
    });
  }, [allCreditStatus, allCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!mergedData) return [];
    return mergedData.filter((status) => {
      const matchesSearch =
        status.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        status.customerCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        status.taxCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        status.address?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesFilter = true;
      if (filterLevel === 'withinLimit') {
        matchesFilter = status.warningLevel !== 'overlimit';
      } else if (filterLevel === 'overLimit') {
        matchesFilter = status.warningLevel === 'overlimit';
      }

      const matchesType = filterType === 'all' || (status.customerType || 'EXTERNAL') === filterType;

      return matchesSearch && matchesFilter && matchesType;
    });
  }, [mergedData, searchTerm, filterLevel, filterType]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(startIndex, startIndex + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'safe':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'danger':
        return 'text-orange-600';
      case 'overlimit':
        return 'text-red-600';
      case 'unlocked':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getWarningBgColor = (level: string) => {
    switch (level) {
      case 'safe':
        return 'bg-green-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'danger':
        return 'bg-orange-50';
      case 'overlimit':
        return 'bg-red-50';
      case 'unlocked':
        return 'bg-orange-50';
      default:
        return 'bg-gray-50';
    }
  };

  const handleExport = () => {
    if (!filteredCustomers) return;

    const getStatusText = (level: string) => {
      switch (level) {
        case 'safe': return 'An toàn';
        case 'warning': return 'Cảnh báo';
        case 'danger': return 'Nguy hiểm';
        case 'overlimit': return 'Vượt hạn';
        case 'unlocked': return 'Được mở chặn';
        default: return level;
      }
    };

    const data = filteredCustomers.map(item => ({
      'Mã KH': item.customerCode,
      'Tên khách hàng': item.customerName,
      'Mã số thuế': item.taxCode || 'N/A',
      'Địa chỉ': item.address || 'N/A',
      'Hạn mức': item.creditLimit,
      'Công nợ hiện tại': item.currentDebt,
      'Còn lại': item.availableCredit,
      'Vượt hạn': item.overLimitAmount || 0,
      'Sử dụng (%)': item.creditUsagePercent,
      'Trạng thái': getStatusText(item.warningLevel)
    }));

    exportToExcel(data, `Han_muc_cong_no_${dayjs().format('YYYY-MM-DD')}`);
  };

  if (loadingCreditStatus || loadingCustomers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải dữ liệu công nợ...</div>
      </div>
    );
  }

  const isStoreRole = user?.roleCode === 'STORE';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <CreditCardIcon className="h-8 w-8 text-blue-600" />
            Quản lý định mức công nợ
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Theo dõi và quản lý định mức công nợ khách hàng
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div
          onClick={() => setFilterLevel('all')}
          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${filterLevel === 'all' ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'} bg-blue-50 border-blue-200`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Tổng cộng</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <CreditCardIcon className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </div>

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
        </div>
      </div>

      {/* Filter Info */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-sm text-gray-700 font-medium">Bộ lọc:</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-sm px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tất cả khách hàng</option>
            <option value="EXTERNAL">Khách hàng thường</option>
            <option value="INTERNAL">Nội bộ (Nhân viên)</option>
          </select>

          {filterLevel !== 'all' && (
            <span className="text-sm text-gray-700">
              Trạng thái: <span className="font-bold uppercase">
                {filterLevel === 'withinLimit' ? 'Trong hạn mức' : 'Vượt hạn mức'}
              </span>
            </span>
          )}
        </div>

        {(filterLevel !== 'all' || filterType !== 'all') && (
          <button
            onClick={() => {
              setFilterLevel('all');
              setFilterType('all');
              setCurrentPage(1);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, mã khách hàng, mã số thuế hoặc địa chỉ..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tên khách hàng
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Mã số thuế
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider max-w-xs">
                  Địa chỉ
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Hạn mức
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Công nợ hiện tại
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Còn lại
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Vượt hạn
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Sử dụng (%)
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData && paginatedData.length > 0 ? (
                paginatedData.map((customer) => (
                  <React.Fragment key={customer.customerId}>
                    <tr className={`hover:bg-gray-50 transition-colors ${getWarningBgColor(customer.warningLevel)}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div>
                          {customer.customerName}
                          {customer.customerType === 'INTERNAL' && (
                            <span className="ml-2 px-2 py-0.5 inline-block text-xs font-medium bg-purple-100 text-purple-700 rounded border border-purple-200">
                              NB
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{customer.customerCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {customer.taxCode || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={customer.address}>
                        {customer.address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600">
                        {customer.creditLimit.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-orange-600">
                        {customer.currentDebt.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        <span className={customer.availableCredit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {customer.availableCredit.toLocaleString('vi-VN')} ₫
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        {customer.overLimitAmount && customer.overLimitAmount > 0 ? (
                          <span className="text-red-600">
                            {customer.overLimitAmount.toLocaleString('vi-VN')} ₫
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getWarningColor(customer.warningLevel)} bg-white border`}>
                          {customer.creditUsagePercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.warningLevel === 'safe' ? 'bg-green-100 text-green-800' :
                          customer.warningLevel === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          customer.warningLevel === 'danger' ? 'bg-orange-100 text-orange-800' :
                          customer.warningLevel === 'unlocked' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {customer.warningLevel === 'safe' ? 'An toàn' :
                           customer.warningLevel === 'warning' ? 'Cảnh báo' :
                           customer.warningLevel === 'danger' ? 'Nguy hiểm' :
                           customer.warningLevel === 'unlocked' ? 'Được mở chặn' :
                           'Vượt hạn'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setExpandedCustomerId(
                            expandedCustomerId === customer.customerId ? null : customer.customerId
                          )}
                          className="text-blue-600 hover:text-blue-800"
                          title="Xem chi tiết"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {expandedCustomerId === customer.customerId && (
                      <tr className="bg-gray-50">
                        <td colSpan={9} className="px-6 py-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left column */}
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase">Mã khách hàng</label>
                                <p className="text-sm font-medium text-gray-900 mt-1">{customer.customerCode}</p>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase">Loại khách hàng</label>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                  {customer.customerType === 'INTERNAL' ? 'Nội bộ (Nhân viên)' : 'Khách hàng thường'}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase">Mã số thuế</label>
                                <p className="text-sm font-medium text-gray-900 mt-1">{customer.taxCode || 'Chưa cài đặt'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase">Điện thoại</label>
                                <p className="text-sm font-medium text-gray-900 mt-1">{customer.phone || 'Chưa cài đặt'}</p>
                              </div>
                            </div>

                            {/* Right column */}
                            <div className="space-y-4">
                              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                <label className="text-xs font-semibold text-blue-600 uppercase">Hạn mức tổng</label>
                                <p className="text-2xl font-bold text-blue-600 mt-2">
                                  {customer.creditLimit.toLocaleString('vi-VN')} ₫
                                </p>
                                <p className="text-xs text-gray-600 mt-1">Áp dụng cho tất cả cửa hàng</p>
                              </div>
                              <div className="bg-orange-50 border border-orange-200 rounded p-4">
                                <label className="text-xs font-semibold text-orange-600 uppercase">Công nợ hiện tại</label>
                                <p className="text-2xl font-bold text-orange-600 mt-2">
                                  {customer.currentDebt.toLocaleString('vi-VN')} ₫
                                </p>
                              </div>
                              <div className={`rounded p-4 border ${
                                customer.availableCredit >= 0
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-red-50 border-red-200'
                              }`}>
                                <label className={`text-xs font-semibold uppercase ${
                                  customer.availableCredit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>Còn lại</label>
                                <p className={`text-2xl font-bold mt-2 ${
                                  customer.availableCredit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {customer.availableCredit.toLocaleString('vi-VN')} ₫
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Store-specific Credit Limits - Show for non-STORE roles */}
                          {user?.roleCode !== 'STORE' && storeCreditLimits && (
                            <div className="mt-8">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4">Hạn mức theo từng cửa hàng</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                                  <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cửa hàng</th>
                                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Hạn mức riêng</th>
                                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Hạn mức áp dụng</th>
                                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Công nợ cửa hàng</th>
                                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Còn lại</th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Sử dụng</th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Vượt hạn</th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Trạng thái</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 bg-white">
                                    {storeCreditLimits.storeLimits.slice(
                                      (storeListPage - 1) * storeListPageSize,
                                      storeListPage * storeListPageSize
                                    ).map((store, idx) => {
                                      const overAmount = Math.max(0, store.currentDebt - store.effectiveLimit);
                                      return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{store.storeName}</td>
                                          <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                                            {store.creditLimit !== null
                                              ? `${store.creditLimit.toLocaleString('vi-VN')} ₫`
                                              : <span className="text-gray-400">Không cài đặt</span>
                                            }
                                          </td>
                                          <td className="px-4 py-3 text-sm text-right font-semibold text-indigo-600">
                                            {store.effectiveLimit.toLocaleString('vi-VN')} ₫
                                          </td>
                                          <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600">
                                            {store.currentDebt.toLocaleString('vi-VN')} ₫
                                          </td>
                                          <td className="px-4 py-3 text-sm text-right font-semibold">
                                            <span className={store.availableCredit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                              {store.availableCredit.toLocaleString('vi-VN')} ₫
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-sm text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                              store.creditUsagePercent < 75 ? 'bg-green-100 text-green-800' :
                                              store.creditUsagePercent < 100 ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-red-100 text-red-800'
                                            }`}>
                                              {store.creditUsagePercent.toFixed(1)}%
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-sm text-right font-semibold">
                                            {overAmount > 0 ? (
                                              <span className="text-red-600">{overAmount.toLocaleString('vi-VN')} ₫</span>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-center">
                                            {store.isBypassed ? (
                                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                                🔓 Mở chặn
                                              </span>
                                            ) : (
                                              <span className="text-gray-400 text-xs">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Pagination for Store List */}
                              {storeCreditLimits.storeLimits.length > storeListPageSize && (
                                <div className="mt-4 flex items-center justify-between bg-gray-50 px-4 py-3 rounded-b-lg border border-t-0 border-gray-200">
                                  <div className="text-sm text-gray-600">
                                    Hiển thị <span className="font-medium">{(storeListPage - 1) * storeListPageSize + 1}</span> đến{' '}
                                    <span className="font-medium">{Math.min(storeListPage * storeListPageSize, storeCreditLimits.storeLimits.length)}</span> của{' '}
                                    <span className="font-medium">{storeCreditLimits.storeLimits.length}</span> cửa hàng
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setStoreListPage(Math.max(1, storeListPage - 1))}
                                      disabled={storeListPage === 1}
                                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Trước
                                    </button>
                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: Math.ceil(storeCreditLimits.storeLimits.length / storeListPageSize) }, (_, i) => i + 1).map((pageNum) => (
                                        <button
                                          key={pageNum}
                                          onClick={() => setStoreListPage(pageNum)}
                                          className={`px-3 py-1 text-sm font-medium rounded ${
                                            storeListPage === pageNum
                                              ? 'bg-indigo-600 text-white'
                                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                          }`}
                                        >
                                          {pageNum}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => setStoreListPage(Math.min(Math.ceil(storeCreditLimits.storeLimits.length / storeListPageSize), storeListPage + 1))}
                                      disabled={storeListPage >= Math.ceil(storeCreditLimits.storeLimits.length / storeListPageSize)}
                                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Sau
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  <strong>Lưu ý:</strong> "Hạn mức áp dụng" là hạn mức thực tế sử dụng cho từng cửa hàng. Nếu không cài đặt hạn mức riêng, sẽ dùng hạn mức tổng {customer.creditLimit.toLocaleString('vi-VN')} ₫
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Progress Bar */}
                          <div className="mt-6">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-semibold text-gray-600">Sử dụng hạn mức (tổng)</span>
                              <span className="text-sm font-bold text-gray-900">{customer.creditUsagePercent.toFixed(1)}%</span>
                            </div>
                            <div className="overflow-hidden h-6 text-xs flex rounded-full bg-gray-200">
                              <div
                                style={{ width: `${Math.min(customer.creditUsagePercent, 100)}%` }}
                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 font-semibold ${
                                  customer.warningLevel === 'safe'
                                    ? 'bg-green-500'
                                    : customer.warningLevel === 'warning' || customer.warningLevel === 'danger'
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                              >
                                {customer.creditUsagePercent.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          {customer.warningLevel === 'overlimit' && (
                            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="font-semibold text-red-800">Cảnh báo: Vượt hạn mức</h4>
                                  <p className="text-sm text-red-700 mt-1">
                                    Khách hàng này đã vượt quá hạn mức công nợ với số tiền <strong>{customer.overLimitAmount?.toLocaleString('vi-VN')} ₫</strong>.
                                    Không nên thực hiện bán công nợ thêm cho đến khi khách hàng thanh toán.
                                  </p>
                                </div>
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
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="text-gray-400 mb-4">
                      <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Không tìm thấy dữ liệu
                    </h3>
                    <p className="text-sm text-gray-500">
                      Không có khách hàng nào phù hợp với tiêu chí tìm kiếm của bạn
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Hiển thị <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> đến{' '}
              <span className="font-medium">{Math.min(currentPage * pageSize, filteredCustomers.length)}</span> của{' '}
              <span className="font-medium">{filteredCustomers.length}</span> kết quả
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerCreditPage;
