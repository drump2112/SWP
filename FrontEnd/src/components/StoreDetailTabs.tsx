import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tanksApi, type Tank, type CreateTankDto, type UpdateTankDto } from '../api/tanks';
import { pumpsApi, type Pump, type CreatePumpDto, type UpdatePumpDto } from '../api/pumps';
import { productsApi } from '../api/products';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface StoreDetailTabsProps {
  storeId: number;
  storeName: string;
}

type TabType = 'tanks' | 'pumps';

const StoreDetailTabs: React.FC<StoreDetailTabsProps> = ({ storeId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('tanks');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Tank | Pump | null>(null);
  const queryClient = useQueryClient();

  const { data: tanks } = useQuery({
    queryKey: ['tanks', storeId],
    queryFn: () => tanksApi.getByStore(storeId),
  });

  const { data: pumps } = useQuery({
    queryKey: ['pumps', storeId],
    queryFn: () => pumpsApi.getByStore(storeId),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  });

  const createTankMutation = useMutation({
    mutationFn: tanksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks', storeId] });
      setIsModalOpen(false);
      setEditingItem(null);
    },
  });

  const updateTankMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTankDto }) =>
      tanksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks', storeId] });
      setIsModalOpen(false);
      setEditingItem(null);
    },
  });

  const deleteTankMutation = useMutation({
    mutationFn: tanksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks', storeId] });
    },
  });

  const createPumpMutation = useMutation({
    mutationFn: pumpsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumps', storeId] });
      setIsModalOpen(false);
      setEditingItem(null);
    },
  });

  const updatePumpMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePumpDto }) =>
      pumpsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumps', storeId] });
      setIsModalOpen(false);
      setEditingItem(null);
    },
  });

  const deletePumpMutation = useMutation({
    mutationFn: pumpsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumps', storeId] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (activeTab === 'tanks') {
      if (editingItem && 'tankCode' in editingItem) {
        // Update tank - không gửi storeId
        const updateData = {
          tankCode: formData.get('tankCode') as string,
          name: formData.get('name') as string,
          capacity: Number(formData.get('capacity')),
          productId: Number(formData.get('productId')),
          currentStock: Number(formData.get('currentStock')) || 0,
          isActive: formData.get('isActive') === 'on',
        };
        updateTankMutation.mutate({ id: editingItem.id, data: updateData });
      } else {
        // Create tank - cần storeId
        const createData: CreateTankDto = {
          storeId,
          tankCode: formData.get('tankCode') as string,
          name: formData.get('name') as string,
          capacity: Number(formData.get('capacity')),
          productId: Number(formData.get('productId')),
          currentStock: Number(formData.get('currentStock')) || 0,
          isActive: formData.get('isActive') === 'on',
        };
        createTankMutation.mutate(createData);
      }
    } else {
      if (editingItem && 'pumpCode' in editingItem) {
        // Update pump - không gửi storeId
        const updateData = {
          tankId: Number(formData.get('tankId')),
          pumpCode: formData.get('pumpCode') as string,
          name: formData.get('name') as string,
          productId: Number(formData.get('productId')),
          isActive: formData.get('isActive') === 'on',
        };
        updatePumpMutation.mutate({ id: editingItem.id, data: updateData });
      } else {
        // Create pump - cần storeId
        const createData: CreatePumpDto = {
          storeId,
          tankId: Number(formData.get('tankId')),
          pumpCode: formData.get('pumpCode') as string,
          name: formData.get('name') as string,
          productId: Number(formData.get('productId')),
          isActive: formData.get('isActive') === 'on',
        };
        createPumpMutation.mutate(createData);
      }
    }
  };

  const handleEdit = (item: Tank | Pump) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number, type: 'tank' | 'pump') => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${type === 'tank' ? 'bồn bể' : 'vòi bơm'} này?`)) {
      if (type === 'tank') {
        deleteTankMutation.mutate(id);
      } else {
        deletePumpMutation.mutate(id);
      }
    }
  };

  const getProductName = (productId: number) => {
    return products?.find(p => p.id === productId)?.name || 'N/A';
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow">
      {/* Tabs Header */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('tanks')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tanks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Bồn bể ({tanks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('pumps')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pumps'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Vòi bơm ({pumps?.length || 0})
          </button>
        </nav>
      </div>

      {/* Tabs Content */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeTab === 'tanks' ? 'Danh sách bồn bể' : 'Danh sách vòi bơm'}
          </h3>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            {activeTab === 'tanks' ? 'Thêm bồn bể' : 'Thêm vòi bơm'}
          </button>
        </div>

        {/* Tanks Table */}
        {activeTab === 'tanks' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã bồn</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">mặt hàng</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dung tích</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tồn Đầu</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trạng Thái</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tanks?.map((tank) => (
                  <tr key={tank.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{tank.tankCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{tank.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{getProductName(tank.productId)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{Number(tank.capacity).toLocaleString()} L</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{Number(tank.currentStock).toLocaleString()} L</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${tank.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {tank.isActive ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(tank)} className="text-blue-600 hover:text-blue-900 mr-3">
                        <PencilIcon className="h-4 w-4 inline" />
                      </button>
                      <button onClick={() => handleDelete(tank.id, 'tank')} className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tanks?.length === 0 && (
              <div className="text-center py-8 text-gray-500">Chưa có bồn bể nào</div>
            )}
          </div>
        )}

        {/* Pumps Table */}
        {activeTab === 'pumps' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã vòi</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bồn bể</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">mặt hàng</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trạng Thái</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pumps?.map((pump) => (
                  <tr key={pump.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{pump.pumpCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{pump.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {tanks?.find(t => t.id === pump.tankId)?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{getProductName(pump.productId)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${pump.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {pump.isActive ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(pump)} className="text-blue-600 hover:text-blue-900 mr-3">
                        <PencilIcon className="h-4 w-4 inline" />
                      </button>
                      <button onClick={() => handleDelete(pump.id, 'pump')} className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pumps?.length === 0 && (
              <div className="text-center py-8 text-gray-500">Chưa có vòi bơm nào</div>
            )}
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingItem ? 'Chỉnh sửa' : 'Thêm'} {activeTab === 'tanks' ? 'bồn bể' : 'vòi bơm'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingItem(null); }}>
                <XMarkIcon className="h-6 w-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {activeTab === 'tanks' ? (
                <>
                  <input type="text" name="tankCode" defaultValue={(editingItem as Tank)?.tankCode} required placeholder="Mã bồn *" className="w-full px-3 py-2 border rounded-lg" />
                  <input type="text" name="name" defaultValue={(editingItem as Tank)?.name} required placeholder="Tên bồn *" className="w-full px-3 py-2 border rounded-lg" />
                  <select name="productId" defaultValue={(editingItem as Tank)?.productId} required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Chọn mặt hàng *</option>
                    {products?.filter(p => p.isFuel).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" name="capacity" defaultValue={(editingItem as Tank)?.capacity} required step="0.001" placeholder="Dung tích (L) *" className="w-full px-3 py-2 border rounded-lg" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tồn đầu (L)</label>
                    <input type="number" name="currentStock" defaultValue={(editingItem as Tank)?.currentStock || 0} min="0" step="0.001" placeholder="Tồn đầu (L)" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </>
              ) : (
                <>
                  <input type="text" name="pumpCode" defaultValue={(editingItem as Pump)?.pumpCode} required placeholder="Mã vòi *" className="w-full px-3 py-2 border rounded-lg" />
                  <input type="text" name="name" defaultValue={(editingItem as Pump)?.name} required placeholder="Tên vòi *" className="w-full px-3 py-2 border rounded-lg" />
                  <select name="tankId" defaultValue={(editingItem as Pump)?.tankId} required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Chọn bồn bể *</option>
                    {tanks?.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name} ({t.tankCode})</option>)}
                  </select>
                  <select name="productId" defaultValue={(editingItem as Pump)?.productId} required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Chọn mặt hàng *</option>
                    {products?.filter(p => p.isFuel).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </>
              )}
              <label className="flex items-center">
                <input type="checkbox" name="isActive" defaultChecked={editingItem?.isActive ?? true} className="mr-2" />
                <span className="text-sm">Đang hoạt động</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Hủy</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingItem ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreDetailTabs;
