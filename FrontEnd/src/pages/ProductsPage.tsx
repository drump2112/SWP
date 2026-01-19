import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, type Product, type CreateProductDto } from '../api/products';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CubeIcon } from '@heroicons/react/24/outline';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import { HybridTable } from '../components/ResponsiveTable';

const ProductsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      setEditingProduct(null);
      showSuccess('Đã thêm mặt hàng thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Không thể thêm mặt hàng');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateProductDto }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      setEditingProduct(null);
      showSuccess('Đã cập nhật mặt hàng thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Không thể cập nhật mặt hàng');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showSuccess('Đã xóa mặt hàng thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Không thể xóa mặt hàng');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: CreateProductDto = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      unit: formData.get('unit') as string || undefined,
      isFuel: formData.get('isFuel') === 'on',
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm(
      'Bạn có chắc chắn muốn xóa mặt hàng này?',
      'Xác nhận xóa',
      'warning',
      'Xóa',
      'Hủy'
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const filteredProducts = products?.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
          <CubeIcon className="h-8 w-8 text-blue-600" />
          Quản lý mặt hàng
        </h1>
        <p className="text-gray-600 mt-2">Quản lý danh sách mặt hàng trong hệ thống</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-96">
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc mã mặt hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
            >
              <PlusIcon className="h-5 w-5" />
              Thêm mặt hàng
            </button>
          </div>
        </div>

        <div className="p-4">
          <HybridTable
            data={filteredProducts || []}
            keyField="id"
            title={(product) => product.name}
            subtitle={(product) => product.code}
            columns={[
              { key: 'code', header: 'Mã SP', mobileLabel: 'Mã' },
              { key: 'name', header: 'Tên mặt hàng', mobileLabel: 'Tên' },
              { key: 'unit', header: 'Đơn vị', render: (p) => p.unit || '-' },
              {
                key: 'isFuel',
                header: 'Loại',
                render: (p) => (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    p.isFuel ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {p.isFuel ? 'Nhiên liệu' : 'Hàng hóa'}
                  </span>
                )
              },
            ]}
            actions={(product) => (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleEdit(product)}
                  className="text-blue-600 hover:text-blue-900 p-2"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="text-red-600 hover:text-red-900 p-2"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            emptyMessage="Không tìm thấy mặt hàng nào"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {editingProduct ? 'Chỉnh sửa mặt hàng' : 'Thêm mặt hàng mới'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã mặt hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    defaultValue={editingProduct?.code}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                    placeholder="Nhập mã mặt hàng"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên mặt hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingProduct?.name}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                    placeholder="Nhập tên mặt hàng"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị tính
                  </label>
                  <input
                    type="text"
                    name="unit"
                    defaultValue={editingProduct?.unit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                    placeholder="VD: Lít, Kg, Thùng..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isFuel"
                    id="isFuel"
                    defaultChecked={editingProduct?.isFuel}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isFuel" className="ml-2 block text-sm text-gray-700">
                    Là nhiên liệu
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Đang xử lý...'
                    : editingProduct
                      ? 'Cập nhật'
                      : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
