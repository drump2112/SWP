import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { shiftsApi, type Shift } from '../api/shifts';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/sweetalert';
import {
  LockOpenIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { exportToExcel, exportMultiSheetExcel } from '../utils/excel';

const ShiftClosurePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.roleCode === 'ADMIN';

  // Fetch shifts based on role
  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', user?.storeId],
    queryFn: async () => {
      if (user?.storeId && !isAdmin) {
        return shiftsApi.getByStore(user.storeId);
      }
      return shiftsApi.getAll();
    },
    enabled: !!user,
  });

  // Reopen mutation (ADMIN only)
  const reopenMutation = useMutation({
    mutationFn: shiftsApi.reopenShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      showSuccess('Đã mở lại ca thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Mở lại ca thất bại');
    },
  });

  const handleReopen = async (shift: Shift) => {
    if (!isAdmin) {
      showWarning('Chỉ Admin mới có quyền mở lại ca!');
      return;
    }

    if (shift.status !== 'CLOSED') {
      showWarning('Chỉ có thể mở lại ca đã chốt!');
      return;
    }

    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn mở lại ca ${shift.shiftNo} ngày ${dayjs(shift.shiftDate).format('DD/MM/YYYY')}? Hành động này sẽ được ghi log để kiểm soát.`,
      'Xác nhận mở lại ca'
    );
    if (confirmed) {
      reopenMutation.mutate(shift.id);
    }
  };

  const handleExportShift = async (shift: Shift) => {
    try {
      const report = await shiftsApi.getReport(shift.id);

      const summaryData = [
        { 'Mục': 'Cửa hàng', 'Giá trị': shift.store?.name },
        { 'Mục': 'Ca số', 'Giá trị': shift.shiftNo },
        { 'Mục': 'Ngày', 'Giá trị': dayjs(shift.shiftDate).format('DD/MM/YYYY') },
        { 'Mục': 'Người mở', 'Giá trị': shift.openedBy?.fullName },
        { 'Mục': 'Người chốt', 'Giá trị': shift.closedBy?.fullName },
        { 'Mục': '---', 'Giá trị': '---' },
        { 'Mục': 'Tổng bán lẻ', 'Giá trị': report.summary.totalRetailSales },
        { 'Mục': 'Bán nợ', 'Giá trị': report.summary.totalDebtSales },
        { 'Mục': 'Tổng doanh thu', 'Giá trị': report.summary.totalRevenue },
        { 'Mục': 'Thu nợ', 'Giá trị': report.summary.totalReceipts },
        { 'Mục': 'Nộp tiền', 'Giá trị': report.summary.totalDeposits },
        { 'Mục': 'Tồn quỹ', 'Giá trị': report.summary.cashBalance },
      ];

      const pumpReadingsData = report.pumpReadings.map((pr: any) => ({
        'Vòi': pr.pumpName,
        'Mặt hàng': pr.productName,
        'Số đầu': pr.startValue,
        'Số cuối': pr.endValue,
        'Số lượng': pr.quantity,
        'Đơn giá': pr.price,
        'Thành tiền': pr.amount
      }));

      const debtSalesData = report.debtSales.map((ds: any) => ({
        'Khách hàng': ds.customerName,
        'Mặt hàng': ds.productName,
        'Số lượng': ds.quantity,
        'Đơn giá': ds.unitPrice,
        'Thành tiền': ds.amount,
        'Ghi chú': ds.notes
      }));

      const sheets = [
        { data: summaryData, sheetName: 'Tong_Hop' },
        { data: pumpReadingsData, sheetName: 'Chi_Tiet_Voi' },
        { data: debtSalesData, sheetName: 'Ban_No' }
      ];

      exportMultiSheetExcel(sheets, `So_giao_ca_${shift.store?.code}_Ca${shift.shiftNo}_${dayjs(shift.shiftDate).format('YYYYMMDD')}`);

    } catch (error) {
      console.error(error);
      showError('Không thể lấy dữ liệu báo cáo ca');
    }
  };

  const filteredShifts = shifts?.filter((shift) => {
    const matchesSearch =
      shift.shiftNo.toString().includes(searchTerm) ||
      dayjs(shift.shiftDate).format('DD/MM/YYYY').includes(searchTerm) ||
      shift.store?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
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
        <p className="text-gray-600 mt-2">
          {isAdmin
            ? 'Xem tất cả các ca của hệ thống'
            : 'Xem các ca của cửa hàng'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm theo ca, ngày, cửa hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cửa hàng
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giờ mở
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giờ chốt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredShifts?.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">Ca {shift.shiftNo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dayjs(shift.shiftDate).format('DD/MM/YYYY')}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{shift.store?.name || 'N/A'}</div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {shift.openedAt ? dayjs(shift.openedAt).format('HH:mm') : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {shift.closedAt ? dayjs(shift.closedAt).format('HH:mm DD/MM') : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        shift.status
                      )}`}
                    >
                      {getStatusText(shift.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => navigate(`/shifts/${shift.id}/operations`)}
                      className="inline-flex items-center px-3 py-1.5 border border-indigo-300 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-1" />
                      Chi tiết
                    </button>
                    {isAdmin && shift.status === 'CLOSED' && (
                      <button
                        onClick={() => handleReopen(shift)}
                        className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all"
                        title="Mở lại ca (chỉ Admin)"
                      >
                        <LockOpenIcon className="h-4 w-4 mr-1" />
                        Mở lại
                      </button>
                    )}
                    {shift.status === 'ADJUSTED' && (
                      <span className="text-xs text-yellow-600 ml-2">Đã điều chỉnh</span>
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

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Lưu ý:</strong> Ca đã chốt sẽ không thể sửa đổi. Chỉ Admin mới có quyền mở lại ca để điều chỉnh.
              Mọi thao tác mở lại ca đều được ghi log để kiểm soát và audit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftClosurePage;
