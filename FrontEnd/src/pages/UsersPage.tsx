import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { rolesApi } from '../api/roles';
import { storesApi } from '../api/stores';
import type { User, CreateUserDto } from '../api/users';
import Swal from 'sweetalert2';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import SearchableSelect from '../components/SearchableSelect';

const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<CreateUserDto>({
    username: '',
    password: '',
    fullName: '',
    roleId: 0,
    storeId: null,
  });

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  // Fetch roles
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.getAll,
  });

  // Fetch stores
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeDialog();
      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Tài khoản đã được tạo',
        confirmButtonColor: '#315eac',
      });
    },
    onError: () => {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể tạo tài khoản',
        confirmButtonColor: '#f78f1e',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeDialog();
      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Tài khoản đã được cập nhật',
        confirmButtonColor: '#315eac',
      });
    },
    onError: () => {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể cập nhật tài khoản',
        confirmButtonColor: '#f78f1e',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      Swal.fire({
        icon: 'success',
        title: 'Đã xóa',
        text: 'Tài khoản đã được xóa',
        confirmButtonColor: '#315eac',
      });
    },
    onError: () => {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể xóa tài khoản',
        confirmButtonColor: '#f78f1e',
      });
    },
  });

  const openDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        fullName: user.fullName,
        roleId: user.roleId,
        storeId: user.storeId,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        roleId: roles?.[0]?.id || 1,
        storeId: null,
      });
    }
    setIsDialogOpen(true);
    setShowPassword(false);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
  };

  // Lấy role code từ roleId
  const selectedRole = roles?.find((r) => r.id === formData.roleId);
  const roleCode = selectedRole?.code || '';

  // Xác định xem có cần cửa hàng không
  const needsStore = ['STORE'].includes(roleCode);
  const cannotHaveStore = ['ADMIN', 'DIRECTOR', 'SALES', 'ACCOUNTING'].includes(roleCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = { ...formData };

    // Nếu edit và không đổi password, xóa field password
    if (editingUser && !submitData.password) {
      delete (submitData as any).password;
    }

    // Nếu role không được phép có cửa hàng, xóa storeId
    if (cannotHaveStore) {
      submitData.storeId = null;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: number) => {
    Swal.fire({
      title: 'Xác nhận xóa',
      text: 'Bạn có chắc chắn muốn xóa tài khoản này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f78f1e',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(id);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#315eac' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Quản Lý Tài Khoản</h2>
          <p className="text-gray-600 mt-2">Danh sách tài khoản người dùng trong hệ thống</p>
        </div>
        <button
          onClick={() => openDialog()}
          className="flex items-center px-4 py-2 text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Thêm tài khoản
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Tên đăng nhập
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Họ tên
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Vai trò
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Cửa hàng
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                  {user.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {user.fullName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {user.role?.name || user.role?.code}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  {user.store?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => openDialog(user)}
                    className="mr-3 transition-colors"
                    style={{ color: '#315eac' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#2a4f8f')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#315eac')}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}
              </h3>
              <button onClick={closeDialog} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mật khẩu {editingUser && '(để trống nếu không đổi)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                  <SearchableSelect
                    options={roles?.map(role => ({ 
                      value: role.id, 
                      label: `${role.name} (${role.code})` 
                    })) || []}
                    value={formData.roleId}
                    onChange={(value) => {
                      const newRoleId = value as number;
                      const newRole = roles?.find((r) => r.id === newRoleId);
                      const newRoleCode = newRole?.code || '';

                      // Nếu chọn ADMIN/DIRECTOR, tự động xóa cửa hàng
                      if (['ADMIN', 'DIRECTOR'].includes(newRoleCode)) {
                        setFormData({ ...formData, roleId: newRoleId, storeId: null });
                      } else {
                        setFormData({ ...formData, roleId: newRoleId });
                      }
                    }}
                    placeholder="Chọn vai trò"
                    required
                  />
                </div>

                {!cannotHaveStore && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cửa hàng {needsStore && <span className="text-red-500">*</span>}
                    </label>
                    <SearchableSelect
                      options={[
                        { value: null, label: needsStore ? 'Chọn cửa hàng' : 'Không gán cửa hàng' },
                        ...(stores?.map(store => ({ value: store.id, label: store.name })) || [])
                      ]}
                      value={formData.storeId}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          storeId: value as number | null,
                        })
                      }
                      placeholder="Chọn cửa hàng"
                      required={needsStore}
                      isClearable
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: '#f78f1e' }}
                  onMouseEnter={(e) =>
                    !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#e07c0f')
                  }
                  onMouseLeave={(e) =>
                    !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#f78f1e')
                  }
                >
                  {editingUser ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
