import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { shiftsApi, type CreateShiftDto } from '../api/shifts';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError, showWarning } from '../utils/sweetalert';
import {
  PlusIcon,
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import SearchableSelect from '../components/SearchableSelect';

const ShiftManagementPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newShiftDate, setNewShiftDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [newShiftNo, setNewShiftNo] = useState(1);
  const [newShiftTime, setNewShiftTime] = useState(dayjs().format('HH:mm'));
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch shifts - Admin xem tất cả, Store xem của mình
  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', user?.roleCode, user?.storeId],
    queryFn: async () => {
      // Admin/Director/Accounting xem tất cả ca
      if (user?.roleCode === 'ADMIN' || user?.roleCode === 'DIRECTOR' || user?.roleCode === 'ACCOUNTING') {
        return shiftsApi.getAll();
      }
      // Store user chỉ xem ca của mình
      if (!user?.storeId) return [];
      return shiftsApi.getByStore(user.storeId);
    },
    enabled: !!user,
  });

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: shiftsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setIsCreateModalOpen(false);
      setNewShiftDate(dayjs().format('YYYY-MM-DD'));
      setNewShiftNo(1);
      setNewShiftTime(dayjs().format('HH:mm'));
      showSuccess('Đã tạo ca mới thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Tạo ca thất bại');
    },
  });

  const handleCreateShift = () => {
    if (!user?.storeId) {
      showError('Không tìm thấy thông tin cửa hàng');
      return;
    }

    const openedAtDateTime = dayjs(`${newShiftDate} ${newShiftTime}`);

    // Tìm ca gần nhất trước ca mới
    const previousShifts = shifts?.filter((s) => {
      const shiftDateTime = dayjs(s.shiftDate);
      return shiftDateTime.isBefore(newShiftDate) ||
             (shiftDateTime.isSame(newShiftDate, 'day') && s.shiftNo < newShiftNo);
    }).sort((a, b) => {
      const dateCompare = dayjs(b.shiftDate).diff(dayjs(a.shiftDate));
      if (dateCompare !== 0) return dateCompare;
      return b.shiftNo - a.shiftNo;
    });

    const lastShift = previousShifts?.[0];

    if (lastShift && lastShift.closedAt) {
      const lastClosedAt = dayjs(lastShift.closedAt);
      if (openedAtDateTime.isBefore(lastClosedAt) || openedAtDateTime.isSame(lastClosedAt)) {
        showWarning(`Giờ mở ca phải sau giờ chốt ca trước (${lastClosedAt.format('DD/MM/YYYY HH:mm')})`);
        return;
      }
    }

    const dto: CreateShiftDto = {
      storeId: user.storeId,
      shiftDate: newShiftDate,
      shiftNo: newShiftNo,
      openedAt: openedAtDateTime.toISOString(),
    };

    createShiftMutation.mutate(dto);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      case 'ADJUSTED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'Đang mở';
      case 'CLOSED':
        return 'Đã chốt';
      case 'ADJUSTED':
        return 'Điều chỉnh';
      default:
        return status;
    }
  };

  const filteredShifts = shifts?.filter((shift) => {
    const matchesSearch =
      shift.shiftNo.toString().includes(searchTerm) ||
      dayjs(shift.shiftDate).format('DD/MM/YYYY').includes(searchTerm);
    return matchesSearch;
  });

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
          <ClockIcon className="h-8 w-8 text-blue-600" />
          Quản lý ca làm việc
        </h1>
        <p className="text-gray-600 mt-2">Tạo ca mới và chốt ca làm việc</p>
      </div>

      {/* Shifts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm theo ca, ngày..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
            />
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Tạo ca mới
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Ca
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Ngày
                </th>
                {(user?.roleCode === 'ADMIN' || user?.roleCode === 'DIRECTOR' || user?.roleCode === 'ACCOUNTING') && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Cửa hàng
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Giờ mở
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Giờ chốt
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
              {filteredShifts?.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">Ca {shift.shiftNo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">
                      {dayjs(shift.shiftDate).format('DD/MM/YYYY')}
                    </div>
                  </td>
                  {(user?.roleCode === 'ADMIN' || user?.roleCode === 'DIRECTOR' || user?.roleCode === 'ACCOUNTING') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{shift.store?.name || `CH${shift.storeId}`}</div>
                      <div className="text-xs text-gray-500">{shift.store?.code || ''}</div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-500">
                      {shift.openedAt ? dayjs(shift.openedAt).format('HH:mm') : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-500">
                      {shift.closedAt ? dayjs(shift.closedAt).format('HH:mm DD/MM') : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        shift.status
                      )}`}
                    >
                      {getStatusText(shift.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    {shift.status === 'OPEN' && (
                      <button
                        onClick={() => navigate(`/shifts/${shift.id}/operations`)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        title="Nhập số liệu và chốt ca"
                      >
                        <DocumentTextIcon className="h-5 w-5 mr-2" />
                        Chốt ca
                      </button>
                    )}
                    {shift.status === 'CLOSED' && (
                      <button
                        onClick={() => navigate(`/shifts/${shift.id}/operations`)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-1" />
                        Chi tiết
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredShifts?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Không tìm thấy ca làm việc nào</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Shift Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Tạo ca mới</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newShiftDate}
                  onChange={(e) => setNewShiftDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số ca <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={[
                    { value: 1, label: 'Ca 1 - Sáng' },
                    { value: 2, label: 'Ca 2 - Chiều' },
                    { value: 3, label: 'Ca 3 - Tối' }
                  ]}
                  value={newShiftNo}
                  onChange={(value) => setNewShiftNo(value as number)}
                  placeholder="Chọn ca"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giờ mở ca <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={newShiftTime}
                  onChange={(e) => setNewShiftTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Giờ mở ca phải sau giờ chốt ca trước
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateShift}
                disabled={createShiftMutation.isPending}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium inline-flex items-center"
              >
                {createShiftMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-5 w-5 mr-1.5" />
                    Tạo ca
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Hướng dẫn:</strong>
              <br />• Bấm "Tạo ca mới" để tạo ca làm việc
              <br />• Bấm "Chốt ca" để nhập số liệu vòi bơm, công nợ, phiếu thu/nộp tiền
              <br />• Ca đã chốt có thể xem lại chi tiết
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftManagementPage;
