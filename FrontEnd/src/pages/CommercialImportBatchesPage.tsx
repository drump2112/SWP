import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '../hooks/usePageTitle';
import { importBatchesAPI, type ImportBatch, type CreateImportBatchDto } from '../api/commercial-import-batches';
import { warehousesAPI } from '../api/commercial-warehouses';
import { suppliersAPI } from '../api/commercial-suppliers';
import { productsApi } from '../api/products';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import Select2 from '../components/Select2';

const CommercialImportBatchesPage: React.FC = () => {
  usePageTitle('Nhập hàng (Lô)');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ImportBatch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [warehouseFilter, setWarehouseFilter] = useState<number | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [formData, setFormData] = useState<CreateImportBatchDto>({
    warehouse_id: 0,
    supplier_id: 0,
    product_id: 0,
    batch_code: '',
    import_quantity: 0,
    unit_price: 0,
    discount_per_unit: 0,
    import_date: new Date().toISOString().split('T')[0],
    vat_percent: 8,
    notes: '',
  });

  const queryClient = useQueryClient();

  const filters = useMemo(() => ({
    warehouse_id: warehouseFilter || undefined,
    supplier_id: supplierFilter || undefined,
    product_id: productFilter || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  }), [warehouseFilter, supplierFilter, productFilter, fromDate, toDate]);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['commercial-import-batches', filters],
    queryFn: async () => {
      const response = await importBatchesAPI.getAll(filters);
      return response.data;
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['commercial-warehouses'],
    queryFn: async () => {
      const response = await warehousesAPI.getAll();
      return response.data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['commercial-suppliers'],
    queryFn: async () => {
      const response = await suppliersAPI.getAll();
      return response.data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return await productsApi.getAll();
    },
  });

  const createMutation = useMutation({
    mutationFn: importBatchesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-import-batches'] });
      setIsModalOpen(false);
      resetForm();
      showSuccess('Đã tạo phiếu nhập hàng thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Tạo phiếu nhập hàng thất bại');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateImportBatchDto> }) =>
      importBatchesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-import-batches'] });
      setIsModalOpen(false);
      resetForm();
      showSuccess('Đã cập nhật phiếu nhập hàng thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Cập nhật phiếu nhập hàng thất bại');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: importBatchesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-import-batches'] });
      showSuccess('Đã xóa phiếu nhập hàng thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Xóa phiếu nhập hàng thất bại');
    },
  });

  const resetForm = () => {
    setFormData({
      warehouse_id: 0,
      supplier_id: 0,
      product_id: 0,
      batch_code: '',
      import_quantity: 0,
      unit_price: 0,
      discount_per_unit: 0,
      import_date: new Date().toISOString().split('T')[0],
      vat_percent: 8,
      notes: '',
    });
    setEditingBatch(null);
  };

  const handleOpenModal = (batch?: ImportBatch) => {
    if (batch) {
      setEditingBatch(batch);
      setFormData({
        warehouse_id: batch.warehouse_id,
        supplier_id: batch.supplier_id,
        product_id: batch.product_id,
        batch_code: batch.batch_code,
        import_quantity: batch.import_quantity,
        unit_price: batch.unit_price,
        discount_per_unit: batch.discount_per_unit,
        import_date: new Date(batch.import_date).toISOString().split('T')[0],
        vat_percent: batch.vat_percent,
        notes: batch.notes || '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBatch) {
      updateMutation.mutate({ id: editingBatch.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = async (batch: ImportBatch) => {
    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn xóa phiếu nhập "${batch.batch_code}"?`,
      'Thao tác này không thể hoàn tác!'
    );
    if (confirmed) {
      deleteMutation.mutate(batch.id);
    }
  };

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesSearch =
        batch.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.product?.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [batches, searchTerm]);

  const paginatedBatches = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBatches.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBatches, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);

  const calculateTotal = () => {
    const lineTotal = formData.import_quantity * formData.unit_price;
    const discountAmount = formData.import_quantity * (formData.discount_per_unit || 0);
    const subtotal = lineTotal - discountAmount;
    const vat = subtotal * (formData.vat_percent || 0) / 100;
    return subtotal + vat;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Nhập hàng (Theo lô)</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          Tạo phiếu nhập
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <Select2
            value={warehouseFilter}
            onChange={(val) => {
              setWarehouseFilter(val ? Number(val) : null);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả kho' },
              ...warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
              })),
            ]}
            placeholder="Chọn kho"
            isClearable
          />

          <Select2
            value={supplierFilter}
            onChange={(val) => {
              setSupplierFilter(val ? Number(val) : null);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả NCC' },
              ...suppliers.map((supplier) => ({
                value: supplier.id,
                label: supplier.name,
              })),
            ]}
            placeholder="Chọn nhà cung cấp"
            isClearable
          />

          <Select2
            value={productFilter}
            onChange={(val) => {
              setProductFilter(val ? Number(val) : null);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả sản phẩm' },
              ...products.map((product) => ({
                value: product.id,
                label: product.name,
              })),
            ]}
            placeholder="Chọn sản phẩm"
            isClearable
          />

          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Từ ngày"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Đến ngày"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Select2
            value={itemsPerPage}
            onChange={(val) => {
              setItemsPerPage(Number(val));
              setCurrentPage(1);
            }}
            options={[
              { value: 10, label: '10 / trang' },
              { value: 25, label: '25 / trang' },
              { value: 50, label: '50 / trang' },
              { value: 100, label: '100 / trang' },
            ]}
            placeholder="Số lượng"
            isSearchable={false}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Không tìm thấy phiếu nhập hàng nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Mã lô</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Kho</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">NCC</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Sản phẩm</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">SL nhập</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Còn lại</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Đơn giá</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">CK/lít</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Tiền hàng</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Subtotal</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">VAT</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Tổng cộng</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Ngày nhập</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{batch.batch_code}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{batch.warehouse?.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{batch.supplier?.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">{batch.product?.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                        {batch.import_quantity.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={batch.remaining_quantity > 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {batch.remaining_quantity.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                        {batch.unit_price.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                        {batch.discount_per_unit.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                        {(batch.import_quantity * batch.unit_price).toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-gray-900">
                        {batch.subtotal.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-right text-gray-600">
                          {batch.vat_percent.toLocaleString('vi-VN')}%
                        </div>
                        <div className="text-right text-gray-900 font-medium">
                          {batch.vat_amount.toLocaleString('vi-VN')} ₫
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-lg font-bold text-blue-600">
                        {batch.total_amount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-gray-600">
                        {new Date(batch.import_date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(batch)}
                            className="text-blue-600 hover:text-blue-900 hover:bg-blue-100 p-1 rounded transition-colors"
                            title="Chỉnh sửa"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(batch)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-100 p-1 rounded transition-colors disabled:opacity-50"
                            disabled={batch.remaining_quantity !== batch.import_quantity}
                            title={batch.remaining_quantity !== batch.import_quantity ? 'Không thể xóa lô đã xuất hàng' : 'Xóa'}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Hiển thị <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> đến{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, filteredBatches.length)}
                      </span>{' '}
                      trong tổng số <span className="font-medium">{filteredBatches.length}</span> kết quả
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBatch ? 'Cập nhật phiếu nhập' : 'Tạo phiếu nhập mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã lô nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.batch_code}
                    onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="VD: BATCH-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kho nhận <span className="text-red-500">*</span>
                  </label>
                  <Select2
                    value={formData.warehouse_id || ''}
                    onChange={(val) => setFormData({ ...formData, warehouse_id: Number(val) })}
                    options={[
                      { value: 0, label: '-- Chọn kho --' },
                      ...warehouses.map((warehouse) => ({
                        value: warehouse.id,
                        label: warehouse.name,
                      })),
                    ]}
                    placeholder="Chọn kho"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <Select2
                    value={formData.supplier_id || ''}
                    onChange={(val) => setFormData({ ...formData, supplier_id: Number(val) })}
                    options={[
                      { value: 0, label: '-- Chọn nhà cung cấp --' },
                      ...suppliers.map((supplier) => ({
                        value: supplier.id,
                        label: supplier.name,
                      })),
                    ]}
                    placeholder="Chọn nhà cung cấp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <Select2
                    value={formData.product_id || ''}
                    onChange={(val) => setFormData({ ...formData, product_id: Number(val) })}
                    options={[
                      { value: 0, label: '-- Chọn sản phẩm --' },
                      ...products.map((product) => ({
                        value: product.id,
                        label: product.name,
                      })),
                    ]}
                    placeholder="Chọn sản phẩm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.import_quantity}
                    onChange={(e) => setFormData({ ...formData, import_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn giá (₫) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chiết khấu/lít (₫)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_per_unit || 0}
                    onChange={(e) => setFormData({ ...formData, discount_per_unit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.import_date || ''}
                    onChange={(e) => setFormData({ ...formData, import_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.vat_percent}
                    onChange={(e) => setFormData({ ...formData, vat_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tiền hàng:</span>
                    <span className="ml-2 font-semibold">
                      {(formData.import_quantity * formData.unit_price).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Chiết khấu:</span>
                    <span className="ml-2 font-semibold">
                      {(formData.import_quantity * (formData.discount_per_unit || 0)).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="ml-2 font-semibold">
                      {(formData.import_quantity * formData.unit_price - formData.import_quantity * (formData.discount_per_unit || 0)).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">VAT:</span>
                    <span className="ml-2 font-semibold">
                      {(((formData.import_quantity * formData.unit_price - formData.import_quantity * (formData.discount_per_unit || 0)) * (formData.vat_percent || 0)) / 100).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="col-span-2 text-lg">
                    <span className="text-gray-900 font-medium">Tổng cộng:</span>
                    <span className="ml-2 font-bold text-blue-600">
                      {calculateTotal().toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ghi chú thêm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Đang xử lý...'
                    : editingBatch
                    ? 'Cập nhật'
                    : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommercialImportBatchesPage;
