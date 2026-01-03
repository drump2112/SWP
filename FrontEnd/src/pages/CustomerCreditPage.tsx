import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../api/customers';
import { useAuth } from '../contexts/AuthContext';
import { MagnifyingGlassIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const CustomerCreditPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Lấy tất cả khách hàng, credit status sẽ filter theo storeId
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
  });

  const { data: creditStatus } = useQuery({
    queryKey: ['credit-status', selectedCustomerId, user?.storeId],
    queryFn: () => customersApi.getCreditStatus(selectedCustomerId!, user?.storeId),
    enabled: !!selectedCustomerId,
  });

  const filteredCustomers = customers?.filter((customer) => {
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
        return 'Nguy hiểm: Đã sử dụng 90% hạn mức';
      case 'overlimit':
        return 'Vượt hạn mức: Không nên bán công nợ thêm';
      default:
        return '';
    }
  };

  if (loadingCustomers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Quản lý hạn mức công nợ
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Theo dõi và quản lý hạn mức công nợ khách hàng
        </p>
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
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                {filteredCustomers && filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedCustomerId === customer.id
                          ? 'bg-blue-50 border-blue-500 shadow-sm'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {customer.code} {customer.phone && `• ${customer.phone}`}
                      </div>
                      <div className="text-xs text-blue-600 font-semibold mt-1">
                        HM: {customer.creditLimit !== null && customer.creditLimit !== undefined
                          ? `${customer.creditLimit.toLocaleString('vi-VN')} ₫`
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
          {selectedCustomerId && creditStatus ? (
            <div className="space-y-6">
              {/* Status Card */}
              <div className={`border-2 rounded-2xl p-6 ${getWarningColor(creditStatus.warningLevel)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getWarningIcon(creditStatus.warningLevel)}
                    <div>
                      <h3 className="text-xl font-bold">{creditStatus.customerName}</h3>
                      <p className="text-sm opacity-80">{creditStatus.customerCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-80">Mức sử dụng</div>
                    <div className="text-3xl font-bold">{creditStatus.creditUsagePercent}%</div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-semibold">{getWarningMessage(creditStatus.warningLevel)}</p>
                </div>
              </div>

              {/* Detail Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                  <div className="text-sm text-gray-600 mb-1">Hạn mức cho phép</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {creditStatus.creditLimit.toLocaleString('vi-VN')} ₫
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                  <div className="text-sm text-gray-600 mb-1">Công nợ hiện tại</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {creditStatus.currentDebt.toLocaleString('vi-VN')} ₫
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                  <div className="text-sm text-gray-600 mb-1">Còn lại có thể bán</div>
                  <div className={`text-2xl font-bold ${
                    creditStatus.availableCredit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {creditStatus.availableCredit.toLocaleString('vi-VN')} ₫
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
                        {creditStatus.creditUsagePercent}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                    <div
                      style={{ width: `${Math.min(creditStatus.creditUsagePercent, 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                        creditStatus.warningLevel === 'safe'
                          ? 'bg-green-500'
                          : creditStatus.warningLevel === 'warning'
                          ? 'bg-yellow-500'
                          : creditStatus.warningLevel === 'danger'
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      }`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0 ₫</span>
                    <span>{creditStatus.creditLimit.toLocaleString('vi-VN')} ₫</span>
                  </div>
                </div>

                {/* Markers */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-600">An toàn (&lt;75%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-gray-600">Cảnh báo (75-90%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-gray-600">Nguy hiểm (90-100%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-600">Vượt hạn (&gt;100%)</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {creditStatus.isOverLimit && (
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
