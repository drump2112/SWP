import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi, type CreateShiftDto, type CloseShiftDto, type PumpReadingDto, type Shift, type ShiftDebtSaleDto, type CashDepositDto } from '../api/shifts';
import { pumpsApi } from '../api/pumps';
import { productsApi } from '../api/products';
import { storesApi } from '../api/stores';
import { customersApi } from '../api/customers';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/sweetalert';
import {
  PlusIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';

const ShiftManagementPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPumpReadingModalOpen, setIsPumpReadingModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Form states
  const [newShiftDate, setNewShiftDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [newShiftNo, setNewShiftNo] = useState(1);
  const [newShiftTime, setNewShiftTime] = useState(dayjs().format('HH:mm'));

  // Pump readings
  const [pumpReadings, setPumpReadings] = useState<Record<number, PumpReadingDto>>({});
  const [productPrices, setProductPrices] = useState<Record<number, number>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch shifts for current store
  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', user?.storeId],
    queryFn: async () => {
      if (!user?.storeId) return [];
      return shiftsApi.getByStore(user.storeId);
    },
    enabled: !!user?.storeId,
  });

  // Fetch store info to get regionId
  const { data: store } = useQuery({
    queryKey: ['store', user?.storeId],
    queryFn: async () => {
      if (!user?.storeId) return null;
      return storesApi.getById(user.storeId);
    },
    enabled: !!user?.storeId,
  });

  // Fetch pumps for current store
  const { data: pumps } = useQuery({
    queryKey: ['pumps', user?.storeId],
    queryFn: async () => {
      if (!user?.storeId) return [];
      return pumpsApi.getByStore(user.storeId);
    },
    enabled: !!user?.storeId,
  });

  // Initialize pump readings when opening modal for a shift
  useEffect(() => {
    if (!selectedShift || !pumps || pumps.length === 0 || !isPumpReadingModalOpen) return;

    // Initialize readings for this shift
    const initialReadings: Record<number, PumpReadingDto> = {};
    pumps.forEach((pump) => {
      initialReadings[pump.id] = {
        pumpCode: pump.pumpCode,
        productId: pump.productId,
        startValue: 0,
        endValue: 0,
      };
    });
    setPumpReadings(initialReadings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShift, pumps, isPumpReadingModalOpen]);

  // Fetch prices when store and pumps are loaded
  useEffect(() => {
    if (!store?.regionId || !pumps || pumps.length === 0) return;

    const fetchPrices = async () => {
      const prices: Record<number, number> = {};
      const uniqueProductIds = [...new Set(pumps.map((p) => p.productId))];

      for (const productId of uniqueProductIds) {
        try {
          const priceData = await productsApi.getCurrentPrice(productId, store.regionId);
          prices[productId] = Number(priceData.price);
        } catch (error) {
          console.error(`Failed to fetch price for product ${productId}:`, error);
          prices[productId] = 0;
        }
      }

      setProductPrices(prices);
    };

    fetchPrices();
  }, [store, pumps]);

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

  // Close shift mutation
  const closeShiftMutation = useMutation({
    mutationFn: shiftsApi.closeShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setIsPumpReadingModalOpen(false);
      setSelectedShift(null);
      setPumpReadings({});
      showSuccess('Đã chốt ca thành công!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Chốt ca thất bại');
    },
  });

  const handleCreateShift = () => {
    if (!user?.storeId) {
      showError('Không tìm thấy thông tin cửa hàng');
      return;
    }

    // Validate: Giờ mở ca sau phải sau giờ chốt ca trước
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

  const handleOpenPumpReadingModal = (shift: Shift) => {
    setSelectedShift(shift);
    setIsPumpReadingModalOpen(true);
  };

  const handlePumpReadingChange = (
    pumpId: number,
    field: 'startValue' | 'endValue',
    value: string
  ) => {
    setPumpReadings((prev) => {
      const currentReading = prev[pumpId];
      if (!currentReading) return prev;

      return {
        ...prev,
        [pumpId]: {
          ...currentReading,
          [field]: parseFloat(value) || 0,
        },
      };
    });
  };

  const handleCloseShift = async () => {
    if (!selectedShift) {
      showError('Không có ca được chọn');
      return;
    }

    // Validate pump readings
    const readingsArray = Object.values(pumpReadings);
    const hasInvalidReadings = readingsArray.some(
      (r) => r.endValue < r.startValue
    );

    if (hasInvalidReadings) {
      showWarning('Số cuối phải lớn hơn hoặc bằng số đầu!');
      return;
    }

    const hasEmptyReadings = readingsArray.some(
      (r) => r.startValue === 0 && r.endValue === 0
    );

    if (hasEmptyReadings) {
      const confirmed = await showConfirm(
        'Có vòi chưa nhập số liệu. Bạn có chắc muốn chốt ca?',
        'Cảnh báo',
        'Chốt ca',
        'Hủy'
      );
      if (!confirmed) return;
    }

    const dto: CloseShiftDto = {
      shiftId: selectedShift.id,
      pumpReadings: readingsArray,
    };

    closeShiftMutation.mutate(dto);
  };

  const calculateQuantity = (reading: PumpReadingDto) => {
    return reading.endValue - reading.startValue;
  };

  const calculateAmount = (reading: PumpReadingDto) => {
    const quantity = calculateQuantity(reading);
    const price = productPrices[reading.productId] || 0;
    return quantity * price;
  };

  const getTotalQuantity = () => {
    return Object.values(pumpReadings).reduce(
      (sum, reading) => sum + calculateQuantity(reading),
      0
    );
  };

  const getTotalAmount = () => {
    return Object.values(pumpReadings).reduce(
      (sum, reading) => sum + calculateAmount(reading),
      0
    );
  };

  const activePumps = pumps?.filter((p) => p.isActive) || [];
  const fuelPumps = activePumps.filter((p) => p.product?.isFuel);
  const totalQuantity = getTotalQuantity();
  const totalAmount = getTotalAmount();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
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
        <h1 className="text-3xl font-bold text-gray-900">Quản lý ca làm việc</h1>
        <p className="text-gray-600 mt-2">Danh sách ca và nhập số đọc đồng hồ vòi bơm</p>
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Tạo ca mới
            </button>
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {shift.status === 'OPEN' && (
                      <button
                        onClick={() => handleOpenPumpReadingModal(shift)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Nhập số đọc đồng hồ"
                      >
                        <PencilSquareIcon className="h-5 w-5 inline" />
                        <span className="ml-1">Nhập số liệu</span>
                      </button>
                    )}
                    {shift.status === 'CLOSED' && (
                      <span className="text-gray-400 text-sm">Đã chốt</span>
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
              <h3 className="text-xl font-semibold text-gray-900">Tạo ca mới</h3>
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số ca <span className="text-red-500">*</span>
                </label>
                <select
                  value={newShiftNo}
                  onChange={(e) => setNewShiftNo(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value={1}>Ca 1 - Sáng</option>
                  <option value={2}>Ca 2 - Chiều</option>
                  <option value={3}>Ca 3 - Tối</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giờ mở ca <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={newShiftTime}
                  onChange={(e) => setNewShiftTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

      {/* Pump Reading Modal */}
      {isPumpReadingModalOpen && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-7xl bg-white rounded-xl shadow-2xl transform transition-all my-8">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
              <div className="text-white">
                <h3 className="text-xl font-semibold">
                  Nhập số đọc đồng hồ - Ca {selectedShift.shiftNo}
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  Ngày: {dayjs(selectedShift.shiftDate).format('DD/MM/YYYY')} •
                  Mở lúc: {selectedShift.openedAt ? dayjs(selectedShift.openedAt).format('HH:mm') : '-'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPumpReadingModalOpen(false);
                  setSelectedShift(null);
                  setPumpReadings({});
                }}
                className="text-white hover:text-blue-100 transition-colors"
              >
                <XMarkIcon className="h-7 w-7" />
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Vòi bơm
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Sản phẩm
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Số đầu
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Số cuối
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Số lít
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Đơn giá
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {fuelPumps.map((pump) => {
                        const reading = pumpReadings[pump.id];
                        if (!reading) return null;

                        const quantity = calculateQuantity(reading);
                        const unitPrice = productPrices[pump.productId] || 0;
                        const amount = calculateAmount(reading);

                        return (
                          <tr key={pump.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <span className="text-blue-600 font-bold text-sm">{pump.pumpCode}</span>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{pump.name}</div>
                                  <div className="text-xs text-gray-500">Mã: {pump.pumpCode}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{pump.product?.name || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <input
                                type="number"
                                step="0.001"
                                value={reading.startValue}
                                onChange={(e) =>
                                  handlePumpReadingChange(pump.id, 'startValue', e.target.value)
                                }
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <input
                                type="number"
                                step="0.001"
                                value={reading.endValue}
                                onChange={(e) =>
                                  handlePumpReadingChange(pump.id, 'endValue', e.target.value)
                                }
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <span className={`text-sm font-bold px-3 py-1 rounded-full ${quantity < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {quantity.toFixed(3)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <span className="text-sm font-medium text-gray-700">{formatCurrency(unitPrice)}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-green-600">
                                {formatCurrency(amount)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 sticky bottom-0">
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-right font-bold text-gray-800 text-base">
                          Tổng cộng:
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-base">
                            {totalQuantity.toFixed(3)} lít
                          </span>
                        </td>
                        <td className="px-4 py-4"></td>
                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-base">
                            {formatCurrency(totalAmount)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{fuelPumps.length}</span> vòi bơm
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsPumpReadingModalOpen(false);
                    setSelectedShift(null);
                    setPumpReadings({});
                  }}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCloseShift}
                  disabled={closeShiftMutation.isPending}
                  className="inline-flex items-center px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-lg hover:shadow-xl"
                >
                  {closeShiftMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang chốt ca...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5 mr-2" />
                      Chốt ca
                    </>
                  )}
                </button>
              </div>
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
              <br />• Bấm "Tạo ca mới" và chọn ngày, ca
              <br />• Với ca đang mở, bấm "Nhập số liệu" để nhập số đồng hồ
              <br />• Hệ thống tự động tính: Số lít = Số cuối - Số đầu, Thành tiền = Số lít × Đơn giá
              <br />• Ca đã chốt không thể sửa (trừ Admin mở lại)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftManagementPage;
