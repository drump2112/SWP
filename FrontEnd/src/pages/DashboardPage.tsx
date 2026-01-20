import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '../hooks/usePageTitle';
import { analyticsApi } from '../api/analytics';
import MetricCard from '../components/MetricCard';
import RevenueChart from '../components/RevenueChart';
import StoreComparisonChart from '../components/StoreComparisonChart';
import StoreTrendsChart from '../components/StoreTrendsChart';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ChartBarIcon,
  CubeIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  usePageTitle('Trang chủ');
  const { user } = useAuth();

  // Date range cho overview (mặc định: tháng hiện tại)
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      fromDate: firstDay.toISOString().split('T')[0],
      toDate: lastDay.toISOString().split('T')[0],
    };
  });

  // Kiểm tra xem user có phải là STORE role không
  const isStoreRole = user?.roleCode === 'STORE';

  // Nếu là STORE, hiển thị dashboard cũ (đơn giản)
  if (isStoreRole) {
    return <StoreDashboard user={user} />;
  }

  // Dashboard cho các role quản lý
  return <ManagementDashboard user={user} dateRange={dateRange} setDateRange={setDateRange} />;
};

// Dashboard đơn giản cho STORE role
const StoreDashboard: React.FC<{ user: any }> = ({ user }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Xin chào, {user?.fullName}!
          </h1>
          <p className="text-xl text-gray-600">
            Chào mừng bạn đến với hệ thống quản lý cửa hàng
          </p>
        </div>

        <div className="mt-12">
          <a
            href="/shifts"
            className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
          >
            <ChartBarIcon className="h-6 w-6 mr-3" />
            Quản lý ca làm việc
          </a>
        </div>
      </div>
    </div>
  );
};

// Dashboard cho các role quản lý (SALES, ACCOUNTING, DIRECTOR, ADMIN)
const ManagementDashboard: React.FC<{
  user: any;
  dateRange: { fromDate: string; toDate: string };
  setDateRange: (range: { fromDate: string; toDate: string }) => void;
}> = ({ user, dateRange, setDateRange }) => {
  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', dateRange],
    queryFn: () => analyticsApi.getOverview(dateRange),
  });

  // Fetch monthly revenue (6 tháng gần nhất)
  const { data: monthlyRevenue } = useQuery({
    queryKey: ['monthly-revenue'],
    queryFn: () => analyticsApi.getMonthlyRevenue({ months: 6 }),
  });

  // Fetch store trends
  const { data: storeTrends } = useQuery({
    queryKey: ['store-trends'],
    queryFn: () => analyticsApi.getStoreTrends({ months: 6 }),
  });

  // Fetch quantity by store and product
  const { data: quantityByStore } = useQuery({
    queryKey: ['quantity-by-store', dateRange],
    queryFn: () => analyticsApi.getQuantityByStore(dateRange),
  });

  // Fetch total inventory
  const { data: inventoryData } = useQuery({
    queryKey: ['total-inventory'],
    queryFn: () => analyticsApi.getTotalInventory(),
  });

  // Fetch debt summary
  const { data: debtSummary } = useQuery({
    queryKey: ['debt-summary'],
    queryFn: () => analyticsApi.getDebtSummary(),
  });

  // Fetch top products
  const { data: topProducts } = useQuery({
    queryKey: ['top-products', dateRange],
    queryFn: () => analyticsApi.getTopProducts({ ...dateRange, limit: 5 }),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Dashboard Tổng Quan
          </h2>
          <p className="text-gray-600 mt-1">
            Xin chào, {user?.fullName}! Theo dõi hiệu suất toàn hệ thống
          </p>
        </div>

        {/* Date range picker */}
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.fromDate}
            onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="flex items-center text-gray-500">đến</span>
          <input
            type="date"
            value={dateRange.toDate}
            onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Metric Cards */}
      {overviewLoading ? (
        <div className="text-center py-8">Đang tải dữ liệu...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tổng doanh thu</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(overviewData?.revenue.current || 0)}</p>
                </div>
              </div>
              {overviewData?.revenue.change !== undefined && (
                <div className={`text-sm font-semibold ${overviewData.revenue.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {overviewData.revenue.change >= 0 ? '↑' : '↓'} {Math.abs(overviewData.revenue.change).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-full">
                  <UserGroupIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Khách hàng công nợ</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(overviewData?.debt.customersCount || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Cards - Filtered by Date */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Dữ liệu theo khoảng thời gian đã chọn
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products - Filtered */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BuildingStorefrontIcon className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Sản lượng bán theo mặt hàng
            </h3>
          </div>
          <div className="space-y-3">
            {topProducts?.map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between border-b border-gray-200 pb-3 hover:bg-gray-50 px-2 rounded">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {index + 1}
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    {product.productName}
                  </p>
                </div>
                <div className="flex items-center gap-8">
                  <p className="text-base font-bold text-blue-600 whitespace-nowrap">
                    {formatNumber(product.totalQuantity)} lít
                  </p>
                  <p className="text-base font-bold text-green-600 whitespace-nowrap min-w-[140px] text-right">
                    {formatCurrency(product.totalRevenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quantity by Store - Filtered */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ChartBarIcon className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Sản lượng theo cửa hàng
            </h3>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Cửa hàng
                  </th>
                  {quantityByStore?.products.map((product) => (
                    <th key={product.id} className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      {product.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
                    Tổng (lít)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quantityByStore?.storeData.map((store) => (
                  <tr key={store.storeId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-semibold text-gray-900 border-r border-gray-100">
                      {store.storeName}
                    </td>
                    {quantityByStore.products.map((product) => (
                      <td key={product.id} className="px-3 py-2 text-sm text-right font-medium text-gray-700 border-r border-gray-100">
                        {formatNumber(store.productQuantities[product.name] || 0)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-sm text-right font-bold text-blue-600">
                      {formatNumber(store.totalQuantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* General Information - Not filtered */}
      <div className="mt-8 mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Thông tin tổng quát
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Summary */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CubeIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Tồn kho theo mặt hàng
            </h3>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {inventoryData?.byProduct.slice(0, 10).map((item) => (
              <div key={item.productId} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <div className="flex-1">
                  <span className="text-gray-900 font-medium">{item.productName}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-blue-600">
                    {formatNumber(item.quantity)} lít
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Debt Summary */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <UserGroupIcon className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Công nợ phải thu
            </h3>
          </div>
          <div className="text-3xl font-bold text-red-600 mb-4">
            {formatCurrency(debtSummary?.totalDebt || 0)}
          </div>
          <div className="text-sm text-gray-600 mb-3">
            {debtSummary?.customersCount || 0} khách hàng đang có công nợ
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {debtSummary?.topDebtors.slice(0, 5).map((debtor) => (
              <div key={debtor.customerId} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate">{debtor.customerName}</span>
                <span className="font-medium text-red-600 ml-2">
                  {formatCurrency(debtor.debtAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts - Time-based trends */}
      <div className="mt-8 mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Biểu đồ doanh thu
        </h3>
      </div>

      {/* Charts Row 1: Revenue trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {monthlyRevenue && (
          <RevenueChart
            data={monthlyRevenue}
            title="Doanh thu 6 tháng gần nhất"
          />
        )}

        {storeTrends && (
          <StoreTrendsChart
            data={storeTrends}
            title="Doanh thu theo cửa hàng"
          />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
