import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '../hooks/usePageTitle';
import { inventoryCheckApi, type InventoryCheckDto } from '../api/inventory';
import { storesApi } from '../api/stores';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import {
  ClipboardDocumentListIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { exportInventoryCheckExcel, type InventoryCheckRow, type InventoryCheckExportData } from '../utils/excel';

const InventoryCheckListPage: React.FC = () => {
  usePageTitle('Biên bản kiểm kê');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter states
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(
    user?.storeId || null
  );
  const [fromDate, setFromDate] = useState<string>(
    dayjs().startOf('month').format('YYYY-MM-DD')
  );
  const [toDate, setToDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Detail modal
  const [selectedCheck, setSelectedCheck] = useState<InventoryCheckDto | null>(null);

  // Fetch stores
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  // Fetch inventory checks
  const { data: inventoryChecks, isLoading } = useQuery({
    queryKey: ['inventory-checks', selectedStoreId, fromDate, toDate, statusFilter],
    queryFn: () =>
      inventoryCheckApi.getAll({
        storeId: selectedStoreId || undefined,
        fromDate,
        toDate,
        status: statusFilter || undefined,
      }),
    enabled: !!selectedStoreId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: inventoryCheckApi.delete,
    onSuccess: () => {
      toast.success('Đã xóa biên bản kiểm kê');
      queryClient.invalidateQueries({ queryKey: ['inventory-checks'] });
    },
    onError: () => {
      toast.error('Không thể xóa biên bản');
    },
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: inventoryCheckApi.confirm,
    onSuccess: () => {
      toast.success('Đã xác nhận biên bản');
      queryClient.invalidateQueries({ queryKey: ['inventory-checks'] });
    },
    onError: () => {
      toast.error('Không thể xác nhận biên bản');
    },
  });

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa?',
      text: 'Bạn có chắc muốn xóa biên bản kiểm kê này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    });
    if (result.isConfirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleConfirm = async (id: number) => {
    const result = await Swal.fire({
      title: 'Xác nhận biên bản?',
      text: 'Sau khi xác nhận sẽ không thể chỉnh sửa',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Hủy',
    });
    if (result.isConfirmed) {
      confirmMutation.mutate(id);
    }
  };

  const handleExportExcel = async (check: InventoryCheckDto) => {
    const rows: InventoryCheckRow[] = [];
    let stt = 0;
    let currentProduct = '';

    (check.tankData || []).forEach((tank: any) => {
      if (tank.productName !== currentProduct) {
        stt++;
        currentProduct = tank.productName;
      }
      rows.push({
        stt: tank.productName !== currentProduct ? stt : '',
        productName: tank.productName !== currentProduct ? tank.productName : '',
        tankName: tank.tankCode,
        heightTotal: tank.heightTotal || '',
        heightWater: tank.heightWater || '',
        actualStock: tank.actualStock || '',
        bookStock: tank.bookStock || '',
        difference: tank.difference || '',
        pumpElectronic: '',
        pumpMechanical: '',
      });
    });

    const exportData: InventoryCheckExportData = {
      companyName: 'CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P',
      branchName: check.store?.name || 'CỬA HÀNG XĂNG DẦU',
      storeName: check.store?.name || '',
      checkTime: dayjs(check.checkAt).format('HH:mm [ngày] DD [tháng] MM [năm] YYYY'),
      members: [
        { name: check.member1Name || '', department: check.store?.name || '' },
        { name: check.member2Name || '', department: '' },
      ].filter((m) => m.name),
      rows,
      reason: check.reason || '',
      conclusion: check.conclusion || '',
    };

    const fileName = `Kiem_ke_${check.store?.code || 'store'}_${dayjs(check.checkAt).format('YYYYMMDD_HHmm')}`;
    await exportInventoryCheckExcel(exportData, fileName);
    toast.success('Đã xuất file Excel!');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardDocumentListIcon className="h-8 w-8 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Biên Bản Kiểm Kê Tồn Kho</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-700">Bộ lọc</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cửa hàng</label>
            <select
              value={selectedStoreId || ''}
              onChange={(e) => setSelectedStoreId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Chọn cửa hàng --</option>
              {stores?.map((store: any) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Tất cả</option>
              <option value="DRAFT">Nháp</option>
              <option value="CONFIRMED">Đã xác nhận</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {!selectedStoreId ? (
          <div className="p-8 text-center text-gray-500">
            Vui lòng chọn cửa hàng để xem danh sách biên bản kiểm kê
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : !inventoryChecks?.length ? (
          <div className="p-8 text-center text-gray-500">
            Không có biên bản kiểm kê nào trong khoảng thời gian này
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">STT</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Thời gian</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cửa hàng</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Thành viên</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Chênh lệch</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Người tạo</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventoryChecks.map((check, idx) => (
                <tr key={check.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {dayjs(check.checkAt).format('DD/MM/YYYY HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{check.store?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {[check.member1Name, check.member2Name].filter(Boolean).join(', ') || '-'}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      Number(check.totalDifference) > 0
                        ? 'text-green-600'
                        : Number(check.totalDifference) < 0
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {Number(check.totalDifference) > 0 ? '+' : ''}
                    {Number(check.totalDifference).toLocaleString('vi-VN')} L
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        check.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {check.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Nháp'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{check.creator?.fullName || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedCheck(check)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Xem chi tiết"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleExportExcel(check)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Xuất Excel"
                      >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                      </button>
                      {check.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => handleConfirm(check.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Xác nhận"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(check.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Xóa"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCheck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Chi tiết biên bản kiểm kê</h2>
                <button
                  onClick={() => setSelectedCheck(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="text-gray-500">Thời gian:</span>{' '}
                  <span className="font-medium">
                    {dayjs(selectedCheck.checkAt).format('DD/MM/YYYY HH:mm')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Cửa hàng:</span>{' '}
                  <span className="font-medium">{selectedCheck.store?.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Thành viên 1:</span>{' '}
                  <span className="font-medium">{selectedCheck.member1Name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Thành viên 2:</span>{' '}
                  <span className="font-medium">{selectedCheck.member2Name || '-'}</span>
                </div>
              </div>

              {/* Tank Data */}
              <h3 className="font-medium text-gray-800 mb-2">Số liệu bể chứa</h3>
              <table className="w-full text-sm mb-6 border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left border">Bể</th>
                    <th className="px-3 py-2 text-left border">Mặt hàng</th>
                    <th className="px-3 py-2 text-right border">Cao chung</th>
                    <th className="px-3 py-2 text-right border">Cao nước</th>
                    <th className="px-3 py-2 text-right border">Tồn thực tế</th>
                    <th className="px-3 py-2 text-right border">Tồn sổ sách</th>
                    <th className="px-3 py-2 text-right border">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedCheck.tankData || []).map((tank: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-2 border">{tank.tankCode}</td>
                      <td className="px-3 py-2 border">{tank.productName}</td>
                      <td className="px-3 py-2 text-right border">{tank.heightTotal || '-'}</td>
                      <td className="px-3 py-2 text-right border">{tank.heightWater || '-'}</td>
                      <td className="px-3 py-2 text-right border">
                        {tank.actualStock?.toLocaleString('vi-VN') || '-'}
                      </td>
                      <td className="px-3 py-2 text-right border">
                        {tank.bookStock?.toLocaleString('vi-VN') || '-'}
                      </td>
                      <td
                        className={`px-3 py-2 text-right border font-medium ${
                          tank.difference > 0
                            ? 'text-green-600'
                            : tank.difference < 0
                            ? 'text-red-600'
                            : ''
                        }`}
                      >
                        {tank.difference ? (tank.difference > 0 ? '+' : '') + tank.difference.toLocaleString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pump Data */}
              {selectedCheck.pumpData && selectedCheck.pumpData.length > 0 && (
                <>
                  <h3 className="font-medium text-gray-800 mb-2">Số đồng hồ bơm</h3>
                  <div className="flex flex-wrap gap-4 mb-6">
                    {selectedCheck.pumpData.map((pump: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 px-3 py-2 rounded">
                        <span className="text-gray-500">{pump.pumpCode}:</span>{' '}
                        <span className="font-medium">{pump.meterReading?.toLocaleString('vi-VN')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Reason & Conclusion */}
              {(selectedCheck.reason || selectedCheck.conclusion) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedCheck.reason && (
                    <div>
                      <h3 className="font-medium text-gray-800 mb-1">Nguyên nhân</h3>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {selectedCheck.reason}
                      </p>
                    </div>
                  )}
                  {selectedCheck.conclusion && (
                    <div>
                      <h3 className="font-medium text-gray-800 mb-1">Kiến nghị/Kết luận</h3>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {selectedCheck.conclusion}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => handleExportExcel(selectedCheck)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Xuất Excel
                </button>
                <button
                  onClick={() => setSelectedCheck(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryCheckListPage;
