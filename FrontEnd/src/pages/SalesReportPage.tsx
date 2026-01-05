import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, type SalesReportParams } from '../api/reports';
import { storesApi } from '../api/stores';
import { productsApi, type ProductPrice } from '../api/products';
import { useAuth } from '../contexts/AuthContext';
import {
  ChartBarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import SearchableSelect from '../components/SearchableSelect';
import { toast } from 'react-toastify';

const SalesReportPage: React.FC = () => {
  const { user } = useAuth();

  // State for filters
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // State for Price Period selection
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<number | null>(null);

  // Fetch stores (Admin/Director/Sales/Accounting)
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  });

  // Fetch regions (hardcoded for now or fetch if API exists, assuming 1 for default)
  // Ideally we should fetch regions. For now let's assume we can get them from stores or just use a static list if not available.
  // Let's try to get regions from stores if possible, or just fetch price history for a default region if not selected.
  // Actually, let's just fetch price history for Region 1 (Default) if no region selected, or add a Region selector if we have the API.
  // I'll skip Region selector for now and assume Region 1 or let user input dates manually.
  // Wait, `productsApi.getPriceHistory` needs regionId.
  // Let's add a simple Region selector if we can find the API.
  // Checking `storesApi` might reveal regions.
  // `storesApi.getAll()` returns stores, which have `regionId`.
  const regions = React.useMemo(() => {
    if (!stores) return [];
    const uniqueRegions = new Map();
    stores.forEach((s: any) => {
      if (s.region) {
        uniqueRegions.set(s.region.id, s.region.name);
      }
    });
    return Array.from(uniqueRegions.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [stores]);

  // Fetch Price History when Product and Region are selected
  const { data: priceHistory } = useQuery({
    queryKey: ['price-history', selectedProductId, selectedRegionId],
    queryFn: () => productsApi.getPriceHistory(selectedProductId!, selectedRegionId!),
    enabled: !!selectedProductId && !!selectedRegionId,
  });

  // Fetch Report
  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['sales-report', fromDate, toDate, selectedStoreIds, selectedProductId],
    queryFn: () => reportsApi.getSalesReport({
      fromDate,
      toDate,
      storeIds: user?.storeId ? [user.storeId] : (selectedStoreIds.length > 0 ? selectedStoreIds : undefined),
      productId: selectedProductId || undefined,
    }),
  });

  // Handle Price Period Selection
  useEffect(() => {
    if (selectedPriceId && priceHistory) {
      const price = priceHistory.find(p => p.id === selectedPriceId);
      if (price) {
        setFromDate(dayjs(price.validFrom).format('YYYY-MM-DD'));
        setToDate(price.validTo ? dayjs(price.validTo).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
      }
    }
  }, [selectedPriceId, priceHistory]);

  // Handle Export
  const handleExportExcel = () => {
    toast.info('Chức năng xuất Excel đang phát triển');
  };

  // Calculate Summary
  const totalQuantity = report?.reduce((sum, item) => sum + Number(item.totalQuantity), 0) || 0;
  const totalAmount = report?.reduce((sum, item) => sum + Number(item.totalAmount), 0) || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            Báo Cáo Bán Hàng
          </h1>
          <p className="text-gray-600 mt-2">
            Thống kê doanh số bán hàng theo cửa hàng, sản phẩm và thời gian
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-gray-500" />
          Xuất Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
          <FunnelIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Bộ lọc tìm kiếm</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Date Range */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
              <div className="relative">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setSelectedPriceId(null); // Clear price period if manual date change
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
              <div className="relative">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setSelectedPriceId(null);
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Store Selection (Multi) */}
          {!user?.storeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cửa hàng</label>
              <SearchableSelect
                options={stores?.map((s: any) => ({ value: s.id, label: s.name })) || []}
                value={selectedStoreIds}
                onChange={(val) => setSelectedStoreIds(val as number[])}
                placeholder="Tất cả cửa hàng"
                isMulti={true}
                isClearable={true}
              />
              <p className="text-xs text-gray-500 mt-1">Để trống để xem tất cả</p>
            </div>
          )}

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm</label>
            <SearchableSelect
              options={products?.map((p: any) => ({ value: p.id, label: p.name })) || []}
              value={selectedProductId}
              onChange={(val) => {
                setSelectedProductId(val as number);
                setSelectedPriceId(null);
              }}
              placeholder="Tất cả sản phẩm"
              isClearable={true}
            />
          </div>

          {/* Price Period Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theo kỳ giá (Tùy chọn)</label>
            <div className="space-y-2">
              <SearchableSelect
                options={regions}
                value={selectedRegionId}
                onChange={(val) => setSelectedRegionId(val as number)}
                placeholder="Chọn vùng giá..."
                isDisabled={!selectedProductId}
                isClearable={true}
              />
              <SearchableSelect
                options={priceHistory?.map((p: ProductPrice) => ({
                  value: p.id,
                  label: `${new Intl.NumberFormat('vi-VN').format(p.price)}₫ (${dayjs(p.validFrom).format('DD/MM/YYYY')} - ${p.validTo ? dayjs(p.validTo).format('DD/MM/YYYY') : 'Nay'})`
                })) || []}
                value={selectedPriceId}
                onChange={(val) => setSelectedPriceId(val as number)}
                placeholder="Chọn kỳ giá..."
                isDisabled={!selectedRegionId || !selectedProductId}
                isClearable={true}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Chọn sản phẩm & vùng để xem các kỳ giá</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Tổng sản lượng bán</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {totalQuantity.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} <span className="text-lg text-gray-500 font-normal">lít</span>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Tổng doanh thu</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {totalAmount.toLocaleString('vi-VN')} <span className="text-lg text-gray-500 font-normal">₫</span>
          </p>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cửa hàng
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lượng (Lít)
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doanh thu (VNĐ)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : report && report.length > 0 ? (
                report.map((item, index) => (
                  <tr key={`${item.storeId}-${item.productId}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.storeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-bold">
                      {Number(item.totalQuantity).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-bold">
                      {Number(item.totalAmount).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Không có dữ liệu bán hàng trong khoảng thời gian này
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={2} className="px-6 py-4 text-right font-bold text-gray-900">
                  Tổng cộng:
                </td>
                <td className="px-6 py-4 text-right font-bold text-blue-700">
                  {totalQuantity.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                </td>
                <td className="px-6 py-4 text-right font-bold text-green-700">
                  {totalAmount.toLocaleString('vi-VN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesReportPage;
