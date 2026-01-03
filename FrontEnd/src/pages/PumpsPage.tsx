import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pumpsApi, type Pump, type CreatePumpDto, type UpdatePumpDto } from '../api/pumps';
import { tanksApi } from '../api/tanks';
import { storesApi } from '../api/stores';
import { productsApi } from '../api/products';
import { showConfirm } from '../utils/sweetalert';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, BeakerIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../components/SearchableSelect';

const PumpsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPump, setEditingPump] = useState<Pump | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStoreId, setFilterStoreId] = useState<number | 'all'>('all');
  const [selectedStoreForAdd, setSelectedStoreForAdd] = useState<number | null>(null);

  // State cho SearchableSelect
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data: pumps, isLoading } = useQuery({
    queryKey: ['pumps'],
    queryFn: pumpsApi.getAll,
  });

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  const { data: tanks } = useQuery({
    queryKey: ['tanks'],
    queryFn: tanksApi.getAll,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: pumpsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumps'] });
      setIsModalOpen(false);
      setEditingPump(null);
      setSelectedStoreForAdd(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePumpDto }) =>
      pumpsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumps'] });
      setIsModalOpen(false);
      setEditingPump(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: pumpsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumps'] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (editingPump) {
      // Update - không gửi storeId
      const updateData = {
        tankId: Number(formData.get('tankId')),
        pumpCode: formData.get('pumpCode') as string,
        name: formData.get('name') as string,
        productId: Number(formData.get('productId')),
        isActive: formData.get('isActive') === 'on',
      };
      updateMutation.mutate({ id: editingPump.id, data: updateData });
    } else {
      // Create - cần storeId
      const createData: CreatePumpDto = {
        storeId: Number(formData.get('storeId')),
        tankId: Number(formData.get('tankId')),
        pumpCode: formData.get('pumpCode') as string,
        name: formData.get('name') as string,
        productId: Number(formData.get('productId')),
        isActive: formData.get('isActive') === 'on',
      };
      createMutation.mutate(createData);
    }

    // Reset states
    setSelectedStoreForAdd(null);
    setSelectedTankId(null);
    setSelectedProductId(null);
  };

  const handleEdit = (pump: Pump) => {
    setEditingPump(pump);
    setSelectedStoreForAdd(pump.storeId);
    setSelectedTankId(pump.tankId);
    setSelectedProductId(pump.productId);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm(
      'Bạn có chắc chắn muốn xóa vòi bơm này?',
      'Xác nhận xóa'
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPump(null);
    setSelectedStoreForAdd(null);
    setSelectedTankId(null);
    setSelectedProductId(null);
  };

  const filteredPumps = pumps?.filter((pump) => {
    const matchesSearch =
      pump.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pump.pumpCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStore = filterStoreId === 'all' || pump.storeId === filterStoreId;
    return matchesSearch && matchesStore;
  });

  const getStoreName = (storeId: number) => {
    return stores?.find(s => s.id === storeId)?.name || 'N/A';
  };

  const getTankName = (tankId: number) => {
    return tanks?.find(t => t.id === tankId)?.name || 'N/A';
  };

  const getProductName = (productId: number) => {
    return products?.find(p => p.id === productId)?.name || 'N/A';
  };

  const getAvailableTanks = () => {
    if (!selectedStoreForAdd) return [];
    return tanks?.filter(t => t.storeId === selectedStoreForAdd && t.isActive) || [];
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
          <BeakerIcon className="h-8 w-8 text-blue-600" />
          Quản lý vòi bơm
        </h1>
        <p className="text-gray-600 mt-2">Quản lý vòi bơm xăng dầu tại các cửa hàng</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc mã vòi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Tất cả cửa hàng' },
                  ...(stores?.map(store => ({ value: store.id, label: store.name })) || [])
                ]}
                value={filterStoreId}
                onChange={(value) => setFilterStoreId(value as number | 'all')}
                placeholder="Chọn cửa hàng"
                className="min-w-[200px]"
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm whitespace-nowrap"
            >
              <PlusIcon className="h-5 w-5" />
              Thêm vòi bơm
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Mã vòi
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tên vòi
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Cửa hàng
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Bồn bể
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPumps?.map((pump) => (
                <tr key={pump.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium text-gray-900">{pump.pumpCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{pump.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-500">{getStoreName(pump.storeId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-500">{getTankName(pump.tankId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-500">{getProductName(pump.productId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        pump.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {pump.isActive ? 'Hoạt động' : 'Ngưng hoạt động'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(pump)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <PencilIcon className="h-5 w-5 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(pump.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPumps?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Không tìm thấy vòi bơm nào</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {editingPump ? 'Chỉnh sửa vòi bơm' : 'Thêm vòi bơm mới'}
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
                    Cửa hàng <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={stores?.map(store => ({ value: store.id, label: store.name })) || []}
                    value={selectedStoreForAdd}
                    onChange={(value) => {
                      setSelectedStoreForAdd(value as number);
                      setSelectedTankId(null); // Reset tank khi đổi cửa hàng
                    }}
                    placeholder="Chọn cửa hàng"
                    isDisabled={!!editingPump}
                    required
                  />
                  <input type="hidden" name="storeId" value={selectedStoreForAdd || ''} required={!editingPump} />
                  {editingPump && (
                    <p className="text-xs text-gray-500 mt-1">Không thể thay đổi cửa hàng khi chỉnh sửa</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bồn bể <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={getAvailableTanks().map(tank => ({
                      value: tank.id,
                      label: `${tank.name} (${tank.tankCode})`
                    }))}
                    value={selectedTankId}
                    onChange={(value) => setSelectedTankId(value as number)}
                    placeholder="Chọn bồn bể"
                    isDisabled={!selectedStoreForAdd}
                    required
                  />
                  <input type="hidden" name="tankId" value={selectedTankId || ''} required />
                  {!selectedStoreForAdd && (
                    <p className="text-xs text-gray-500 mt-1">Vui lòng chọn cửa hàng trước</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã vòi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pumpCode"
                    defaultValue={editingPump?.pumpCode}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="VD: PUMP-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên vòi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingPump?.name}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="VD: Vòi số 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={products?.filter(p => p.isFuel).map(product => ({ value: product.id, label: product.name })) || []}
                    value={selectedProductId}
                    onChange={(value) => setSelectedProductId(value as number)}
                    placeholder="Chọn sản phẩm"
                    required
                  />
                  <input type="hidden" name="productId" value={selectedProductId || ''} required />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    defaultChecked={editingPump?.isActive ?? true}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Đang hoạt động
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
                    : editingPump
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

export default PumpsPage;
