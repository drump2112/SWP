import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '../hooks/usePageTitle';
import { lossConfigApi, getCategoryLabel, lossRateToPercent, percentToLossRate } from '../api/loss-config';
import type { StoreLossConfig, ProductCategory } from '../api/loss-config';
import { storesApi } from '../api/stores';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../components/SearchableSelect';
import dayjs from 'dayjs';

const LossConfigPage: React.FC = () => {
  usePageTitle('Cấu hình hao hụt');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StoreLossConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    storeId: 0,
    productCategory: 'GASOLINE' as ProductCategory,
    lossRatePercent: 0.25, // Hiển thị dạng %
    effectiveFrom: dayjs().format('YYYY-MM-DD'),
    effectiveTo: '',
    notes: '',
  });

  // Queries
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ['loss-configs', selectedStoreId],
    queryFn: () => selectedStoreId === 'all'
      ? lossConfigApi.getAll()
      : lossConfigApi.getByStore(selectedStoreId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: lossConfigApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loss-configs'] });
      toast.success('Đã thêm cấu hình hao hụt');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => lossConfigApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loss-configs'] });
      toast.success('Đã cập nhật cấu hình');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: lossConfigApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loss-configs'] });
      toast.success('Đã xóa cấu hình');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingConfig(null);
    setFormData({
      storeId: stores?.[0]?.id || 0,
      productCategory: 'GASOLINE',
      lossRatePercent: 0.25,
      effectiveFrom: dayjs().format('YYYY-MM-DD'),
      effectiveTo: '',
      notes: '',
    });
  };

  const handleEdit = (config: StoreLossConfig) => {
    console.log('handleEdit called', config);
    setEditingConfig(config);
    setFormData({
      storeId: config.storeId,
      productCategory: config.productCategory,
      lossRatePercent: parseFloat(String(config.lossRate)) * 100,
      effectiveFrom: dayjs(config.effectiveFrom).format('YYYY-MM-DD'),
      effectiveTo: config.effectiveTo ? dayjs(config.effectiveTo).format('YYYY-MM-DD') : '',
      notes: config.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc muốn xóa cấu hình này?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingConfig) {
      // Update - không gửi storeId (không cho phép đổi store)
      const updatePayload = {
        productCategory: formData.productCategory,
        lossRate: percentToLossRate(formData.lossRatePercent),
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || undefined,
        notes: formData.notes || undefined,
      };
      updateMutation.mutate({ id: editingConfig.id, data: updatePayload });
    } else {
      // Create - gửi đầy đủ
      const createPayload = {
        storeId: formData.storeId,
        productCategory: formData.productCategory,
        lossRate: percentToLossRate(formData.lossRatePercent),
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || undefined,
        notes: formData.notes || undefined,
      };
      createMutation.mutate(createPayload);
    }
  };

  // Kiểm tra quyền admin
  const isAdmin = user?.roleCode === 'ADMIN' || user?.roleCode === 'SUPERADMIN';

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ Cấu hình hệ số hao hụt</h1>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            Thêm cấu hình
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Lọc theo cửa hàng:</label>
          <div className="w-64">
            <SearchableSelect
              options={[
                { value: 'all', label: 'Tất cả cửa hàng' },
                ...(stores?.map((store) => ({
                  value: store.id,
                  label: `${store.code} - ${store.name}`,
                })) || []),
              ]}
              value={selectedStoreId}
              onChange={(val) => setSelectedStoreId(val === 'all' ? 'all' : Number(val))}
              placeholder="Chọn cửa hàng"
              isClearable={false}
            />
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">
              {editingConfig ? 'Sửa cấu hình hao hụt' : 'Thêm cấu hình hao hụt'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cửa hàng *</label>
                <SearchableSelect
                  key={`store-${editingConfig?.id || 'new'}`}
                  options={stores?.map((store) => ({
                    value: store.id,
                    label: `${store.code} - ${store.name}`,
                  })) || []}
                  value={formData.storeId || null}
                  onChange={(val) => setFormData({ ...formData, storeId: Number(val) || 0 })}
                  placeholder="-- Chọn cửa hàng --"
                  isDisabled={!!editingConfig}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại sản phẩm *</label>
                <SearchableSelect
                  key={`category-${editingConfig?.id || 'new'}`}
                  options={[
                    { value: 'GASOLINE', label: 'Xăng' },
                    { value: 'DIESEL', label: 'Dầu' },
                  ]}
                  value={formData.productCategory}
                  onChange={(val) => setFormData({ ...formData, productCategory: (val as ProductCategory) || 'GASOLINE' })}
                  placeholder="Chọn loại sản phẩm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hệ số hao hụt (%) *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="10"
                  required
                  value={formData.lossRatePercent}
                  onChange={(e) => setFormData({ ...formData, lossRatePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 0.25 cho 0.25%"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nhập 0.25 cho 0.25%, 0.1 cho 0.1%
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu *</label>
                <input
                  type="date"
                  required
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                <input
                  type="date"
                  value={formData.effectiveTo}
                  onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Để trống nếu đang áp dụng</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Mùa hè 2026"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cửa hàng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại SP</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hệ số hao hụt</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ngày bắt đầu</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ngày kết thúc</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
              {isAdmin && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : configs && configs.length > 0 ? (
              configs.map((config) => {
                const isActive = !config.effectiveTo || dayjs(config.effectiveTo).isAfter(dayjs());
                return (
                  <tr key={config.id} className={isActive ? '' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {config.store?.code || `#${config.storeId}`} - {config.store?.name || ''}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        config.productCategory === 'GASOLINE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {getCategoryLabel(config.productCategory)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                      {lossRateToPercent(Number(config.lossRate))}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-700">
                      {dayjs(config.effectiveFrom).format('DD/MM/YYYY')}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {config.effectiveTo ? (
                        dayjs(config.effectiveTo).format('DD/MM/YYYY')
                      ) : (
                        <span className="text-green-600 font-medium">Đang áp dụng</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {config.notes || '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(config)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Sửa"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Xóa"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Chưa có cấu hình hao hụt nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">💡 Hướng dẫn</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Xăng (GASOLINE)</strong>: Bao gồm RON95, E5, RON92...</li>
          <li>• <strong>Dầu (DIESEL)</strong>: Bao gồm DO 0.05S, DO 0.001S...</li>
          <li>• Hệ số hao hụt được tính trên lượng <strong>đã xuất</strong> trong kỳ</li>
          <li>• Khi tạo cấu hình mới, các cấu hình cũ sẽ tự động được đóng</li>
        </ul>
      </div>
    </div>
  );
};

export default LossConfigPage;
