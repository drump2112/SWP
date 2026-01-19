import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  productsApi,
  type SetRegionPricesDto,
  type ProductPriceItem
} from '../api/products';
import { regionsApi } from '../api/regions';
import {
  TagIcon,
  PlusIcon,
  XMarkIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import SearchableSelect from '../components/SearchableSelect';

const PricesPage: React.FC = () => {
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priceItems, setPriceItems] = useState<ProductPriceItem[]>([]);
  // Khởi tạo với datetime đầy đủ (ISO 8601 format: YYYY-MM-DDTHH:mm)
  const [validFrom, setValidFrom] = useState<string>(
    new Date().toISOString().slice(0, 16) // Format: 2024-01-15T08:30
  );
  const queryClient = useQueryClient();

  // Fetch regions
  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: regionsApi.getAll,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  });

  // Fetch prices by region
  const { data: regionPrices, isLoading } = useQuery({
    queryKey: ['region-prices', selectedRegionId],
    queryFn: () => productsApi.getPricesByRegion(selectedRegionId!),
    enabled: !!selectedRegionId,
  });

  // Set region prices mutation
  const setRegionPricesMutation = useMutation({
    mutationFn: productsApi.setRegionPrices,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['region-prices'] });
      setIsModalOpen(false);
      setPriceItems([]);
      showSuccess(data.message || 'Đã áp dụng giá cho khu vực thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Không thể áp dụng giá');
    },
  });

  const handleAddPriceItem = () => {
    setPriceItems([...priceItems, { productId: 0, price: 0 }]);
  };

  const handleRemovePriceItem = (index: number) => {
    setPriceItems(priceItems.filter((_, i) => i !== index));
  };

  const handlePriceItemChange = (index: number, field: 'productId' | 'price', value: number) => {
    const newItems = [...priceItems];
    newItems[index][field] = value;
    setPriceItems(newItems);
  };

  const handleSubmit = async () => {
    if (!selectedRegionId) {
      showError('Vui lòng chọn khu vực');
      return;
    }

    const validItems = priceItems.filter(item => item.productId > 0 && item.price > 0);
    if (validItems.length === 0) {
      showError('Vui lòng thêm ít nhất một mặt hàng với giá hợp lệ');
      return;
    }

    const regionName = regions?.find(r => r.id === selectedRegionId)?.name;
    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn áp dụng giá mới cho ${validItems.length} mặt hàng trong khu vực "${regionName}"?\n\nGiá cũ sẽ tự động được đóng lại.`,
      'Xác nhận áp dụng giá',
      'question',
      'Áp dụng',
      'Hủy'
    );

    if (!confirmed) return;

    const data: SetRegionPricesDto = {
      regionId: selectedRegionId,
      prices: validItems,
      validFrom: new Date(validFrom).toISOString(),
    };

    setRegionPricesMutation.mutate(data);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getProductName = (productId: number) => {
    return products?.find(p => p.id === productId)?.name || 'N/A';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
          <TagIcon className="h-8 w-8 text-blue-600" />
          Quản lý giá mặt hàng theo khu vực
        </h1>
        <p className="text-gray-600 mt-2">
          Áp dụng giá cho khu vực sẽ tự động áp dụng cho tất cả cửa hàng trong khu vực đó
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Region Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-blue-600" />
              Chọn khu vực
            </h2>
            <div className="space-y-2">
              {regions?.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegionId(region.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedRegionId === region.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{region.name}</div>
                  <div className={`text-sm ${
                    selectedRegionId === region.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    Khu vực #{region.id}
                  </div>
                </button>
              ))}
            </div>

            {selectedRegionId && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all shadow-md"
              >
                <PlusIcon className="h-5 w-5" />
                Áp dụng giá mới
              </button>
            )}
          </div>
        </div>

        {/* Main Content - Price List */}
        <div className="lg:col-span-2">
          {!selectedRegionId ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MapPinIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Chọn khu vực để xem giá
              </h3>
              <p className="text-gray-500">
                Vui lòng chọn một khu vực bên trái để xem danh sách giá hiện tại
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  Giá hiện tại - {regions?.find(r => r.id === selectedRegionId)?.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Giá đang áp dụng cho tất cả cửa hàng trong khu vực
                </p>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          mặt hàng
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Giá bán
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hiệu lực từ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hiệu lực đến
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {regionPrices?.map((price) => (
                        <tr key={price.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {price.product?.name || getProductName(price.productId)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {price.product?.code}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-bold text-green-600">
                              {formatPrice(Number(price.price))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(price.validFrom)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {price.validTo ? formatDate(price.validTo) :
                                <span className="text-green-600 font-medium">Đang áp dụng</span>
                              }
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {regionPrices?.length === 0 && (
                    <div className="text-center py-12">
                      <TagIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Chưa có giá nào được áp dụng cho khu vực này</p>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Áp dụng giá ngay
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal - Set Region Prices */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Áp dụng giá cho khu vực: {regions?.find(r => r.id === selectedRegionId)?.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Giá sẽ tự động áp dụng cho tất cả cửa hàng trong khu vực
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setPriceItems([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Ngày và giờ áp dụng <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Giá sẽ bắt đầu áp dụng từ thời điểm này
                </p>
              </div>

              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Danh sách mặt hàng và giá</h3>
                <button
                  onClick={handleAddPriceItem}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Thêm mặt hàng
                </button>
              </div>

              <div className="space-y-3">
                {priceItems.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <TagIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Chưa có mặt hàng nào. Nhấn "Thêm mặt hàng" để bắt đầu</p>
                  </div>
                ) : (
                  priceItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start bg-gray-50 p-4 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          mặt hàng
                        </label>
                        <SearchableSelect
                          options={[
                            { value: 0, label: '-- Chọn mặt hàng --' },
                            ...(products?.map(product => ({
                              value: product.id,
                              label: `${product.name} (${product.code})`
                            })) || [])
                          ]}
                          value={item.productId}
                          onChange={(value) => handlePriceItemChange(index, 'productId', Number(value))}
                          placeholder="Chọn mặt hàng"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Giá bán (VNĐ)
                        </label>
                        <input
                          type="number"
                          value={item.price || ''}
                          onChange={(e) => handlePriceItemChange(index, 'price', Number(e.target.value))}
                          placeholder="0"
                          min="0"
                          step="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 focus:border-transparent transition-all"
                        />
                      </div>

                      <button
                        onClick={() => handleRemovePriceItem(index)}
                        className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setPriceItems([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={setRegionPricesMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {setRegionPricesMutation.isPending ? 'Đang xử lý...' : 'Áp dụng giá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricesPage;
