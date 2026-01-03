import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storesApi } from '../api/stores';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import StoreDetailTabs from '../components/StoreDetailTabs';

const StoreDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const storeId = Number(id);

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => storesApi.getById(storeId),
    enabled: !!storeId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Không tìm thấy cửa hàng</p>
          <button
            onClick={() => navigate('/stores')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/stores')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Quay lại danh sách cửa hàng
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
            <p className="text-gray-600 mt-2">Mã: {store.code}</p>
          </div>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${
              store.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {store.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
          </span>
        </div>
      </div>

      {/* Store Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cửa hàng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Địa chỉ</p>
            <p className="text-gray-900">{store.address}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Điện thoại</p>
            <p className="text-gray-900">{store.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Khu vực</p>
            <p className="text-gray-900">{store.region?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Tanks and Pumps Tabs */}
      <StoreDetailTabs storeId={storeId} storeName={store.name} />
    </div>
  );
};

export default StoreDetailPage;
