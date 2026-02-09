import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { usePageTitle } from '../hooks/usePageTitle';
import { exportOrdersAPI, type ExportOrder, type CreateExportOrderDto } from '../api/commercial-export-orders';
import { warehousesAPI } from '../api/commercial-warehouses';
import { commercialCustomersAPI } from '../api/commercial-customers';
import { importBatchesAPI, type ImportBatch } from '../api/commercial-import-batches';
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, ShoppingCartIcon, EyeIcon, PlusIcon, XMarkIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import Select2 from '../components/Select2';
import Swal from 'sweetalert2';

const CommercialExportOrdersPage: React.FC = () => {
  usePageTitle('Xuất hàng TM');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [warehouseFilter, setWarehouseFilter] = useState<number | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ExportOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<number | null>(null);

  interface OrderItem {
    warehouse_id: number;
    customer_id: number;
    batch_id: number;
    quantity: number;
    unit_price: number;
    discount_amount: number;
  }

  const [formData, setFormData] = useState({
    warehouse_id: 0,
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    vat_percent: 0,
    payment_method: '',
    payment_status: 'UNPAID',
    notes: '',
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const queryClient = useQueryClient();

  const filters = useMemo(() => ({
    warehouse_id: warehouseFilter || undefined,
    payment_status: paymentStatusFilter || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  }), [warehouseFilter, paymentStatusFilter, fromDate, toDate]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['commercial-export-orders', filters],
    queryFn: async () => {
      const response = await exportOrdersAPI.getAll(filters);
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

  const { data: customers = [] } = useQuery({
    queryKey: ['commercial-customers'],
    queryFn: async () => {
      const response = await commercialCustomersAPI.getAll();
      return response.data;
    },
  });

  const { data: availableBatches = [] } = useQuery({
    queryKey: ['import-batches-for-export'],
    queryFn: async () => {
      const response = await importBatchesAPI.getAll({});
      return response.data.filter((batch: ImportBatch) => batch.remaining_quantity > 0);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateExportOrderDto) => exportOrdersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-export-orders'] });
      Swal.fire('Thành công!', 'Tạo đơn hàng thành công', 'success');
      handleCloseCreateModal();
    },
    onError: (error: any) => {
      console.error('Error creating order:', error.response?.data);
      console.error('Error messages:', error.response?.data?.message);
      const errorMsg = typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : JSON.stringify(error.response?.data?.message || error.response?.data || 'Có lỗi xảy ra');
      Swal.fire('Lỗi!', errorMsg, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; payload: Partial<Omit<CreateExportOrderDto, 'items'>> }) =>
      exportOrdersAPI.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-export-orders'] });
      Swal.fire('Thành công!', 'Cập nhật đơn hàng thành công', 'success');
      handleCloseEditModal();
    },
    onError: (error: any) => {
      console.error('Error updating order:', error.response?.data);
      const errorMsg = typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : JSON.stringify(error.response?.data?.message || error.response?.data || 'Có lỗi xảy ra');
      Swal.fire('Lỗi!', errorMsg, 'error');
    },
  });

  const handleOpenCreateModal = () => {
    setFormData({
      warehouse_id: 0,
      order_number: '',
      order_date: new Date().toISOString().split('T')[0],
      vehicle_number: '',
      driver_name: '',
      driver_phone: '',
      vat_percent: 0,
      payment_method: '',
      payment_status: 'UNPAID',
      notes: '',
    });
    setOrderItems([]);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = async (order: ExportOrder) => {
    try {
      const response = await exportOrdersAPI.getOne(order.id);
      const order_data = response.data;
      setFormData({
        warehouse_id: order_data.warehouse_id || 0,
        order_number: order_data.order_number || '',
        order_date: order_data.order_date?.split('T')[0] || '',
        vehicle_number: order_data.vehicle_number || '',
        driver_name: order_data.driver_name || '',
        driver_phone: order_data.driver_phone || '',
        vat_percent: order_data.vat_percent || 0,
        payment_method: order_data.payment_method || '',
        payment_status: order_data.payment_status || 'UNPAID',
        notes: order_data.notes || '',
      });
      setEditOrderId(order_data.id);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error loading order for edit:', error);
      Swal.fire('Lỗi!', 'Không thể tải thông tin đơn hàng', 'error');
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditOrderId(null);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrderId) return;

    const updateData: Partial<Omit<CreateExportOrderDto, 'items'>> = {
      warehouse_id: formData.warehouse_id,
      order_number: formData.order_number,
      order_date: formData.order_date,
      vehicle_number: formData.vehicle_number,
      driver_name: formData.driver_name,
      driver_phone: formData.driver_phone,
      vat_percent: formData.vat_percent,
      payment_method: formData.payment_method,
      payment_status: formData.payment_status,
      notes: formData.notes,
    };

    updateMutation.mutate({ id: editOrderId, payload: updateData });
  };

  const handleAddItem = () => {
    setOrderItems([...orderItems, { warehouse_id: 0, customer_id: 0, batch_id: 0, quantity: 0, unit_price: 0, discount_amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: number) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderItems(newItems);
  };

  const calculateItemTotal = (item: OrderItem) => {
    return item.quantity * item.unit_price - item.quantity * item.discount_amount;
  };

  const calculateOrderTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalDiscount = orderItems.reduce((sum, item) =>
      sum + (item.quantity * item.discount_amount), 0
    );
    const afterDiscount = subtotal - totalDiscount;
    const vat = afterDiscount * (formData.vat_percent / 100);
    const total = afterDiscount + vat;

    return { subtotal, totalDiscount, vat, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      Swal.fire('Lỗi!', 'Vui lòng thêm ít nhất 1 sản phẩm', 'error');
      return;
    }

    const invalidItems = orderItems.filter(item =>
      item.warehouse_id === 0 || item.customer_id === 0 || item.batch_id === 0 || item.quantity <= 0 || item.unit_price <= 0
    );

    if (invalidItems.length > 0) {
      Swal.fire('Lỗi!', 'Vui lòng điền đầy đủ thông tin cho mỗi dòng (kho, khách hàng, lô hàng, số lượng, giá)', 'error');
      return;
    }

    const { warehouse_id, ...restFormData } = formData;
    const dataToSend: any = {
      ...restFormData,
      items: orderItems.map(item => ({
        customer_id: item.customer_id,
        batch_id: item.batch_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount_amount: Number(item.discount_amount || 0),
      })),
    };

    // Only include warehouse_id if it's a valid number > 0
    const warehouseIdNum = Number(warehouse_id);
    if (warehouseIdNum && warehouseIdNum > 0) {
      dataToSend.warehouse_id = warehouseIdNum;
    }

    console.log('Sending order data:', JSON.stringify(dataToSend, null, 2));
    createMutation.mutate(dataToSend);
  };

  const handleViewDetail = async (order: ExportOrder) => {
    const response = await exportOrdersAPI.getOne(order.id);
    setSelectedOrder(response.data);
    setIsDetailModalOpen(true);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items?.some(item =>
          item.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      return matchesSearch;
    });
  }, [orders, searchTerm]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'UNPAID': { label: 'Chưa thanh toán', className: 'bg-red-100 text-red-800' },
      'PARTIAL': { label: 'Thanh toán 1 phần', className: 'bg-yellow-100 text-yellow-800' },
      'PAID': { label: 'Đã thanh toán', className: 'bg-green-100 text-green-800' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Xuất hàng thương mại</h1>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          Tạo đơn hàng
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã đơn, khách hàng, xe..."
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
            value={paymentStatusFilter}
            onChange={(val) => {
              setPaymentStatusFilter(String(val || ''));
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả TT thanh toán' },
              { value: 'UNPAID', label: 'Chưa thanh toán' },
              { value: 'PARTIAL', label: 'Thanh toán 1 phần' },
              { value: 'PAID', label: 'Đã thanh toán' },
            ]}
            placeholder="Trạng thái thanh toán"
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
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ShoppingCartIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Không tìm thấy đơn xuất hàng nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã đơn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Xe / Lái xe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kho xuất
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày xuất
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số KH
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái TT
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOrders.map((order) => {
                    const uniqueCustomers = new Set(order.items?.map(item => item.customer_id) || []);
                    return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{order.vehicle_number || '-'}</div>
                        <div className="text-xs text-gray-500">{order.driver_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.warehouse?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.order_date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {uniqueCustomers.size} khách
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.total_amount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentStatusBadge(order.payment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(order)}
                          className="text-yellow-600 hover:text-yellow-900 inline-block"
                          title="Sửa đơn hàng"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewDetail(order)}
                          className="text-blue-600 hover:text-blue-900 inline-block"
                          title="Xem chi tiết"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Tổng giá trị đơn hàng:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {filteredOrders.reduce((sum, order) => sum + order.total_amount, 0).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Đã thu:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    {filteredOrders.reduce((sum, order) => sum + (order.total_amount - order.debt_amount), 0).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Còn nợ:</span>
                  <span className="ml-2 font-semibold text-red-600">
                    {filteredOrders.reduce((sum, order) => sum + order.debt_amount, 0).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>
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
                        {Math.min(currentPage * itemsPerPage, filteredOrders.length)}
                      </span>{' '}
                      trong tổng số <span className="font-medium">{filteredOrders.length}</span> kết quả
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

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Tạo đơn xuất hàng mới</h2>
              <button onClick={handleCloseCreateModal} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kho chính (Tùy chọn)
                  </label>
                  <Select2
                    value={formData.warehouse_id || ''}
                    onChange={(val) => {
                      setFormData({ ...formData, warehouse_id: Number(val) });
                    }}
                    options={[
                      { value: 0, label: '-- Nhiều kho --' },
                      ...warehouses.map((warehouse) => ({
                        value: warehouse.id,
                        label: warehouse.name,
                      })),
                    ]}
                    placeholder="Chọn kho (nếu chỉ 1 kho)"
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày xuất hàng</label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã đơn hàng</label>
                  <input
                    type="text"
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tự động nếu để trống"
                  />
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biển số xe</label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="VD: 29C-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên lái xe</label>
                  <input
                    type="text"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Họ tên lái xe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SĐT lái xe</label>
                  <input
                    type="text"
                    value={formData.driver_phone}
                    onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Số điện thoại"
                  />
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Danh sách sản phẩm</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Thêm sản phẩm
                  </button>
                </div>

                {orderItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để bắt đầu
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kho</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lô hàng</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SL</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CK/ĐV</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orderItems.map((item, index) => {
                          const itemBatches = item.warehouse_id > 0
                            ? availableBatches.filter(b => b.warehouse_id === item.warehouse_id)
                            : [];
                          return (
                          <tr key={index}>
                            <td className="px-4 py-3">
                              <Select2
                                value={item.warehouse_id}
                                onChange={(val) => {
                                  const newItems = [...orderItems];
                                  newItems[index] = {
                                    ...newItems[index],
                                    warehouse_id: Number(val || 0),
                                    batch_id: 0
                                  };
                                  setOrderItems(newItems);
                                }}
                                options={[
                                  { value: 0, label: '-- Chọn kho --' },
                                  ...warehouses.map((warehouse) => ({
                                    value: warehouse.id,
                                    label: warehouse.name,
                                  })),
                                ]}
                                placeholder="Kho"
                                className="min-w-[150px]"
                                isClearable={true}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Select2
                                value={item.customer_id}
                                onChange={(val) => handleItemChange(index, 'customer_id', Number(val || 0))}
                                options={[
                                  { value: 0, label: '-- Chọn khách --' },
                                  ...customers.map((customer) => ({
                                    value: customer.id,
                                    label: customer.name,
                                  })),
                                ]}
                                placeholder="Khách hàng"
                                className="min-w-[180px]"
                                isClearable={true}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Select2
                                value={item.batch_id}
                                onChange={(val) => {
                                  const batch = itemBatches.find(b => b.id === Number(val));
                                  const newItems = [...orderItems];
                                  newItems[index] = {
                                    ...newItems[index],
                                    batch_id: Number(val || 0),
                                    unit_price: batch ? batch.unit_price : newItems[index].unit_price
                                  };
                                  setOrderItems(newItems);
                                }}
                                options={[
                                  { value: 0, label: item.warehouse_id ? '-- Chọn lô --' : '-- Chọn kho trước --' },
                                  ...itemBatches.map((batch) => ({
                                    value: batch.id,
                                    label: `${batch.batch_code} - ${batch.product?.name} (Tồn: ${batch.remaining_quantity})`,
                                  })),
                                ]}
                                placeholder="Chọn lô"
                                className="min-w-[280px]"
                                isDisabled={!item.warehouse_id}
                                isClearable={true}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity || ''}
                                onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                value={item.unit_price || ''}
                                onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                value={item.discount_amount || ''}
                                onChange={(e) => handleItemChange(index, 'discount_amount', Number(e.target.value))}
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {calculateItemTotal(item).toLocaleString('vi-VN')} ₫
                            </td>
                            <td className="px-4 py-3">
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
                )}
              </div>

              {/* Summary */}
              {orderItems.length > 0 && (
                <div className="border-t pt-4">
                  <div className="max-w-md ml-auto space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tạm tính:</span>
                      <span className="font-medium">{calculateOrderTotals().subtotal.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Chiết khấu:</span>
                      <span className="font-medium text-red-600">-{calculateOrderTotals().totalDiscount.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT ({formData.vat_percent}%):</span>
                      <span className="font-medium">{calculateOrderTotals().vat.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Tổng cộng:</span>
                      <span className="text-blue-600">{calculateOrderTotals().total.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ghi chú thêm về đơn hàng..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Đang xử lý...' : 'Tạo đơn hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Chi tiết đơn hàng: {selectedOrder.order_number}
              </h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Kho xuất</h3>
                  <p className="mt-1 text-base text-gray-900">{selectedOrder.warehouse?.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Ngày xuất hàng</h3>
                  <p className="mt-1 text-base text-gray-900">
                    {new Date(selectedOrder.order_date).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phương thức thanh toán</h3>
                  <p className="mt-1 text-base text-gray-900">{selectedOrder.payment_method || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Biển số xe</h3>
                  <p className="mt-1 text-base text-gray-900">{selectedOrder.vehicle_number || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Lái xe</h3>
                  <p className="mt-1 text-base text-gray-900">{selectedOrder.driver_name || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">SĐT lái xe</h3>
                  <p className="mt-1 text-base text-gray-900">{selectedOrder.driver_phone || '-'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Danh sách hàng hóa</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã lô</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SL</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chiết khấu</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.customer?.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.import_batch?.batch_code}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.import_batch?.product?.name}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {item.quantity.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {item.selling_price.toLocaleString('vi-VN')} ₫
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {item.discount_amount > 0
                              ? `${item.discount_amount.toLocaleString('vi-VN')} ₫/ĐV`
                              : '-'
                            }
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {item.total_amount.toLocaleString('vi-VN')} ₫
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t pt-4">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tổng tiền hàng:</span>
                    <span className="font-medium">{(selectedOrder.subtotal || 0).toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chiết khấu:</span>
                    <span className="font-medium text-red-600">
                      -{(selectedOrder.total_discount || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT:</span>
                    <span className="font-medium">{(selectedOrder.vat_amount || 0).toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="flex justify-between text-lg pt-2 border-t">
                    <span className="font-semibold text-gray-900">Tổng cộng:</span>
                    <span className="font-bold text-blue-600">
                      {(selectedOrder.total_amount || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Đã thanh toán:</span>
                    <span className="font-medium text-green-600">
                      {((selectedOrder.total_amount || 0) - (selectedOrder.debt_amount || 0)).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Còn nợ:</span>
                    <span className="font-semibold text-red-600">
                      {(selectedOrder.debt_amount || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Ghi chú</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Sửa thông tin đơn hàng</h2>
              <button onClick={handleCloseEditModal} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrder} className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kho chính (Tùy chọn)
                  </label>
                  <Select2
                    value={formData.warehouse_id || ''}
                    onChange={(val) => {
                      setFormData({ ...formData, warehouse_id: Number(val) });
                    }}
                    options={[
                      { value: 0, label: '-- Nhiều kho --' },
                      ...warehouses.map((warehouse) => ({
                        value: warehouse.id,
                        label: warehouse.name,
                      })),
                    ]}
                    placeholder="Chọn kho (nếu chỉ 1 kho)"
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày xuất hàng</label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã đơn hàng</label>
                  <input
                    type="text"
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biển số xe</label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="VD: 29C-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên lái xe</label>
                  <input
                    type="text"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Họ tên lái xe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SĐT lái xe</label>
                  <input
                    type="text"
                    value={formData.driver_phone}
                    onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Số điện thoại"
                  />
                </div>
              </div>

              {/* Other Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% VAT</label>
                  <input
                    type="number"
                    value={formData.vat_percent}
                    onChange={(e) => setFormData({ ...formData, vat_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức TT</label>
                  <Select2
                    value={formData.payment_method || ''}
                    onChange={(val) => setFormData({ ...formData, payment_method: String(val || '') })}
                    options={[
                      { value: '', label: '-- Chọn ptts --' },
                      { value: 'CASH', label: 'Tiền mặt' },
                      { value: 'TRANSFER', label: 'Chuyển khoản' },
                      { value: 'CHECK', label: 'Séc' },
                    ]}
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái TT</label>
                  <Select2
                    value={formData.payment_status}
                    onChange={(val) => setFormData({ ...formData, payment_status: String(val || 'UNPAID') })}
                    options={[
                      { value: 'UNPAID', label: 'Chưa thanh toán' },
                      { value: 'PARTIAL', label: 'Thanh toán 1 phần' },
                      { value: 'PAID', label: 'Đã thanh toán' },
                    ]}
                    isSearchable={false}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Ghi chú về đơn hàng"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommercialExportOrdersPage;
