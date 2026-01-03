import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, type Customer, type CreateCustomerDto, type UpdateCustomerDto } from '../api/customers';
import { showSuccess, showError, showConfirm, showWarning } from '../utils/sweetalert';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, ExclamationTriangleIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      showSuccess('Đã tạo khách hàng thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Tạo khách hàng thất bại');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerDto }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      showSuccess('Đã cập nhật khách hàng thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Cập nhật khách hàng thất bại');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showSuccess('Đã xóa khách hàng thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Xóa khách hàng thất bại');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: any = {
      code: formData.get('code') as string || undefined,
      name: formData.get('name') as string,
      taxCode: formData.get('taxCode') as string || undefined,
      address: formData.get('address') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      creditLimit: formData.get('creditLimit') ? Number(formData.get('creditLimit')) : undefined,
      notes: formData.get('notes') as string || undefined,
    };

    // Thêm storeId nếu user là STORE
    if (user?.storeId && !editingCustomer) {
      data.storeId = user.storeId;
    }

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data as CreateCustomerDto);
    }
  };

  const checkDuplicate = async (name: string, phone: string, taxCode: string) => {
    if (!name || (!phone && !taxCode)) return;

    try {
      const result = await customersApi.checkDuplicate({ name, phone, taxCode });
      if (result.hasDuplicate) {
        const warnings = result.duplicates.map((d: any) =>
          `• ${d.field}: ${d.customer.name} (${d.customer.code})`
        ).join('\n');
        setDuplicateWarning(`Phát hiện trùng lặp:\n${warnings}`);
      } else {
        setDuplicateWarning('');
      }
    } catch (error) {
      console.error('Check duplicate error:', error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm(
      'Bạn có chắc chắn muốn xóa khách hàng này?',
      'Xác nhận xóa'
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setDuplicateWarning('');
  };

  const filteredCustomers = customers?.filter((customer) => {
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.taxCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.address?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <UserIcon className="h-8 w-8 text-blue-600" />
            Quản lý khách hàng
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Quản lý thông tin khách hàng và công nợ
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã, tên, số điện thoại, địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Mã KH
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Tên khách hàng
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                SĐT
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Địa chỉ
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Hạn mức
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCustomers && filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                    {customer.code}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">
                    <div className="font-medium">{customer.name}</div>
                    {customer.taxCode && (
                      <div className="text-xs text-gray-500">MST: {customer.taxCode}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                    {customer.phone || '-'}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600 max-w-xs truncate">
                    {customer.address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {customer.creditLimit !== null && customer.creditLimit !== undefined ? (
                      <span className="font-semibold text-blue-600">
                        {customer.creditLimit.toLocaleString('vi-VN')} ₫
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Chưa thiết lập</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="inline-flex items-center px-3 py-1.5 border border-blue-300 rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                  {searchTerm ? 'Không tìm thấy khách hàng nào' : 'Chưa có khách hàng nào'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-black bg-opacity-30 backdrop-blur-sm" onClick={handleCloseModal}></div>

            <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 -m-6 mb-6 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingCustomer ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Warning Banner */}
                {duplicateWarning && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 whitespace-pre-line">{duplicateWarning}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                      Mã khách hàng
                    </label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      defaultValue={editingCustomer?.code || ''}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Để trống để tự sinh"
                      disabled={!!editingCustomer}
                    />
                    {!editingCustomer && (
                      <p className="mt-1 text-xs text-gray-500">
                        Tự động sinh mã nếu để trống
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      defaultValue={editingCustomer?.phone || ''}
                      onBlur={(e) => {
                        const name = (document.getElementById('name') as HTMLInputElement)?.value;
                        const taxCode = (document.getElementById('taxCode') as HTMLInputElement)?.value;
                        if (!editingCustomer) checkDuplicate(name, e.target.value, taxCode);
                      }}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="VD: 0123456789"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    defaultValue={editingCustomer?.name || ''}
                    onBlur={(e) => {
                      const phone = (document.getElementById('phone') as HTMLInputElement)?.value;
                      const taxCode = (document.getElementById('taxCode') as HTMLInputElement)?.value;
                      if (!editingCustomer) checkDuplicate(e.target.value, phone, taxCode);
                    }}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="VD: Công ty ABC"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    defaultValue={editingCustomer?.address || ''}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="taxCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Mã số thuế
                    </label>
                    <input
                      type="text"
                      id="taxCode"
                      name="taxCode"
                      defaultValue={editingCustomer?.taxCode || ''}
                      onBlur={(e) => {
                        const name = (document.getElementById('name') as HTMLInputElement)?.value;
                        const phone = (document.getElementById('phone') as HTMLInputElement)?.value;
                        if (!editingCustomer) checkDuplicate(name, phone, e.target.value);
                      }}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="VD: 0123456789"
                    />
                  </div>

                  <div>
                    <label htmlFor="creditLimit" className="block text-sm font-medium text-gray-700 mb-1">
                      Hạn mức công nợ (₫)
                    </label>
                    <input
                      type="number"
                      id="creditLimit"
                      name="creditLimit"
                      min="0"
                      step="1000"
                      defaultValue={editingCustomer?.creditLimit || ''}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="VD: 50000000"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={editingCustomer?.notes || ''}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Ghi chú thêm về khách hàng..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Đang xử lý...'
                      : editingCustomer
                      ? 'Cập nhật'
                      : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
