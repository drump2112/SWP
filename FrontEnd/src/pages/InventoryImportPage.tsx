import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { storesApi } from '../api/stores';
import { usePageTitle } from '../hooks/usePageTitle';
import { productsApi } from '../api/products';
import { tanksApi } from '../api/tanks';
import { inventoryApi, type CreateInventoryDocumentDto, type InventoryItemDto } from '../api/inventory';
import { useAuth } from '../contexts/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import { toast } from 'react-toastify';
import { PlusIcon, TrashIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';

const InventoryImportPage: React.FC = () => {
  usePageTitle('Nhập hàng');
  const { user } = useAuth();

  const [storeId, setStoreId] = useState<number | null>(user?.storeId || null);
  const [docDate, setDocDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const [items, setItems] = useState<InventoryItemDto[]>([
    { productId: 0, quantity: 0, unitPrice: 0 }
  ]);

  // Fetch Stores
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId,
  });

  // Fetch Products
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  });

  // Fetch Tanks for selected Store
  const { data: tanks } = useQuery({
    queryKey: ['tanks', storeId],
    queryFn: () => tanksApi.getByStore(storeId!),
    enabled: !!storeId,
  });

  const createMutation = useMutation({
    mutationFn: inventoryApi.createDocument,
    onSuccess: () => {
      toast.success('Nhập hàng thành công');
      // Reset form
      setItems([{ productId: 0, quantity: 0, unitPrice: 0 }]);
      setSupplierName('');
      setInvoiceNumber('');
      setLicensePlate('');
    },
    onError: (error: any) => {
      toast.error('Lỗi khi nhập kho: ' + (error.response?.data?.message || error.message));
    }
  });

  const handleAddItem = () => {
    setItems([...items, { productId: 0, quantity: 0, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof InventoryItemDto, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // If product changes, reset tank
    if (field === 'productId') {
        newItems[index].tankId = undefined;
    }

    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error('Vui lòng chọn cửa hàng');
      return;
    }

    // Validate items
    const validItems = items.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Vui lòng nhập ít nhất một mặt hàng hợp lệ');
      return;
    }

    const data: CreateInventoryDocumentDto = {
      storeId: storeId,
      docType: 'IMPORT',
      docDate,
      supplierName,
      invoiceNumber,
      licensePlate,
      items: validItems.map(item => ({ ...item, unitPrice: 0 }))
    };

    createMutation.mutate(data);
  };

  const storeOptions = stores?.map(s => ({ value: s.id, label: s.name })) || [];
  const productOptions = products?.map(p => ({ value: p.id, label: p.name })) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <CircleStackIcon className="h-8 w-8 text-blue-600" />
            Nhập Hàng Hóa
          </h2>
          <p className="text-gray-600 mt-2">Tạo phiếu nhập xăng dầu và hàng hóa</p>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden px-4 py-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Store Selection */}
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Cửa hàng</label>
              <div className="mt-1">
                <SearchableSelect
                  options={storeOptions}
                  value={storeId}
                  onChange={(val) => setStoreId(val as number)}
                  placeholder="Chọn cửa hàng"
                  isDisabled={!!user?.storeId}
                />
              </div>
            </div>

            {/* Date Selection */}
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Ngày nhập</label>
              <div className="mt-1">
                <input
                  type="date"
                  required
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-all"
                />
              </div>
            </div>

            {/* Supplier Info */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Nhà cung cấp</label>
              <div className="mt-1">
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-all"
                  placeholder="Tên nhà cung cấp"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Số hóa đơn</label>
              <div className="mt-1">
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-all"
                  placeholder="Số hóa đơn"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Biển số xe</label>
              <div className="mt-1">
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-all"
                  placeholder="Biển số xe bồn"
                />
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Chi tiết hàng hóa</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center px-4 py-2 text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
              >
                <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                Thêm dòng
              </button>
            </div>

            <div className="flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/4">
                            mặt hàng
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/4">
                            Bể chứa (nếu có)
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/6">
                            Số lượng
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Xóa</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item, index) => {
                          const availableTanks = tanks?.filter(t => t.productId === item.productId) || [];
                          const tankOptions = availableTanks.map(t => ({ value: t.id, label: t.name }));

                          return (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <SearchableSelect
                                  options={productOptions}
                                  value={item.productId}
                                  onChange={(val) => handleItemChange(index, 'productId', val)}
                                  placeholder="Chọn mặt hàng"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <SearchableSelect
                                  options={tankOptions}
                                  value={item.tankId || null}
                                  onChange={(val) => handleItemChange(index, 'tankId', val)}
                                  placeholder="Chọn bể chứa"
                                  isDisabled={!item.productId || tankOptions.length === 0}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-all"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="ml-3 flex items-center px-4 py-2 text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50"
            >
              {createMutation.isPending ? 'Đang xử lý...' : 'Lưu phiếu nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryImportPage;
