import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { shiftsApi, type ShiftDebtSaleDto, type CashDepositDto, type CreateReceiptDto, type PumpReadingDto, type CloseShiftDto } from '../api/shifts';
import { customersApi } from '../api/customers';
import { productsApi } from '../api/products';
import { pumpsApi } from '../api/pumps';
import { storesApi } from '../api/stores';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showConfirm } from '../utils/sweetalert';
import { toast } from 'react-toastify';
import SearchableSelect from '../components/SearchableSelect';
import {
  PlusIcon,
  TrashIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ArrowLeftIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';

const ShiftOperationsPage: React.FC = () => {
  const { shiftId } = useParams<{ shiftId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'pump' | 'debt' | 'cash'>('pump');
  const [showDebtSaleForm, setShowDebtSaleForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [pumpReadings, setPumpReadings] = useState<Record<number, PumpReadingDto>>({});
  const [productPrices, setProductPrices] = useState<Record<number, number>>({});
  const [debtSaleFormPrice, setDebtSaleFormPrice] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasPreviousShift, setHasPreviousShift] = useState(false);

  // State cho SearchableSelect
  const [selectedDebtCustomer, setSelectedDebtCustomer] = useState<number | null>(null);
  const [selectedDebtProduct, setSelectedDebtProduct] = useState<number | null>(null);
  const [selectedReceiptCustomer, setSelectedReceiptCustomer] = useState<number | null>(null);

  // Draft Mode: Store all data until shift close
  const [draftDebtSales, setDraftDebtSales] = useState<Array<ShiftDebtSaleDto & { id: string }>>([]);
  const [draftReceipts, setDraftReceipts] = useState<Array<CreateReceiptDto & { id: string }>>([]);
  const [draftDeposits, setDraftDeposits] = useState<Array<CashDepositDto & { id: string }>>([]);

  // Fetch shift report
  const { data: report, isLoading } = useQuery({
    queryKey: ['shift-report', shiftId],
    queryFn: async () => {
      const data = await shiftsApi.getReport(Number(shiftId));
      console.log('📊 Shift report loaded:', {
        shiftId,
        cashDeposits: data.cashDeposits?.length || 0,
        totalDeposits: data.summary?.totalDeposits || 0,
        receipts: data.receipts?.length || 0,
        debtSales: data.debtSales?.length || 0,
      });
      return data;
    },
    enabled: !!shiftId,
  });

  // Fetch customers - Lấy tất cả vì khách hàng có thể lấy hàng ở nhiều cửa hàng
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  });

  // Fetch pumps
  const { data: pumps } = useQuery({
    queryKey: ['pumps', report?.shift.storeId],
    queryFn: async () => {
      if (!report?.shift.storeId) return [];
      return pumpsApi.getByStore(report.shift.storeId);
    },
    enabled: !!report?.shift.storeId,
  });

  // Fetch store for region
  const { data: store } = useQuery({
    queryKey: ['store', report?.shift.storeId],
    queryFn: async () => {
      if (!report?.shift.storeId) return null;
      return storesApi.getById(report.shift.storeId);
    },
    enabled: !!report?.shift.storeId,
  });

  // Cảnh báo khi rời trang có dữ liệu chưa lưu
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isShiftOpen = report?.shift.status === 'OPEN';
      if (hasUnsavedChanges && isShiftOpen) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, report?.shift.status]);

  // Theo dõi thay đổi pump readings và auto-save
  useEffect(() => {
    const hasPumpData = Object.values(pumpReadings).some(
      reading => reading.startValue !== 0 || reading.endValue !== 0
    );
    const hasDraftData = draftDebtSales.length > 0 || draftReceipts.length > 0 || draftDeposits.length > 0;
    setHasUnsavedChanges(hasPumpData || hasDraftData);

    // Auto-save to localStorage (debounced)
    if (shiftId) {
      const draftKey = `shift_${shiftId}_draft_data`;
      const draftData = {
        pumpReadings: hasPumpData ? pumpReadings : {},
        debtSales: draftDebtSales,
        receipts: draftReceipts,
        deposits: draftDeposits,
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    }
  }, [pumpReadings, draftDebtSales, draftReceipts, draftDeposits, shiftId]);

  // Reset forms khi chuyển tab
  useEffect(() => {
    setShowDebtSaleForm(false);
    setShowReceiptForm(false);
    setShowDepositForm(false);
    setDebtSaleFormPrice(0);
  }, [activeTab]);

  // Initialize pump readings
  useEffect(() => {
    if (!pumps || pumps.length === 0) {
      console.log('⚠️ No pumps data');
      return;
    }

    if (report?.shift.status !== 'OPEN') {
      console.log('⚠️ Shift is not OPEN');
      return;
    }

    // Chỉ init nếu chưa có dữ liệu (tránh ghi đè khi user đã nhập)
    const hasExistingData = Object.keys(pumpReadings).length > 0;
    if (hasExistingData) {
      console.log('✅ Already have pump readings data');
      return;
    }

    console.log('🔄 Initializing pump readings...');

    // Load từ localStorage nếu có
    const draftKey = `shift_${shiftId}_draft_data`;
    const savedData = localStorage.getItem(draftKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.pumpReadings && Object.keys(parsed.pumpReadings).length > 0) {
          console.log('📦 Restoring from localStorage:', parsed);
          setPumpReadings(parsed.pumpReadings);
          if (parsed.debtSales && parsed.debtSales.length > 0) {
            setDraftDebtSales(parsed.debtSales);
          }
          if (parsed.receipts && parsed.receipts.length > 0) {
            setDraftReceipts(parsed.receipts);
          }
          if (parsed.deposits && parsed.deposits.length > 0) {
            setDraftDeposits(parsed.deposits);
          }
          showSuccess('Đã khôi phục dữ liệu chưa lưu từ lần trước');
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved draft data', e);
      }
    }

    // Lấy số đọc của ca trước (nếu có)
    const fetchPreviousReadings = async () => {
      try {
        const previousData = await shiftsApi.getPreviousShiftReadings(Number(shiftId));
        console.log('📊 Previous shift readings:', previousData);

        // Set state để biết có ca trước hay không
        setHasPreviousShift(previousData.hasPreviousShift);

        // Init pump readings với số đầu từ ca trước (nếu có)
        const initialReadings: Record<number, PumpReadingDto> = {};
        pumps.forEach((pump: any) => {
          const previousEndValue = previousData.hasPreviousShift
            ? (previousData.readings[pump.pumpCode] || 0)
            : 0;

          initialReadings[pump.id] = {
            pumpCode: pump.pumpCode,
            productId: pump.productId,
            startValue: previousEndValue,
            endValue: 0, // KHÔNG fill sẵn, để người dùng nhập
          };
        });

        console.log('✅ Initialized pump readings:', initialReadings);
        setPumpReadings(initialReadings);

        if (previousData.hasPreviousShift) {
          showSuccess(`Đã tự động điền số đầu từ ca ${previousData.previousShiftNo} ngày ${previousData.previousShiftDate}`);
        }
      } catch (error) {
        console.error('Failed to fetch previous readings:', error);
        // Fallback: Init với 0
        setHasPreviousShift(false);
        const initialReadings: Record<number, PumpReadingDto> = {};
        pumps.forEach((pump: any) => {
          initialReadings[pump.id] = {
            pumpCode: pump.pumpCode,
            productId: pump.productId,
            startValue: 0,
            endValue: 0,
          };
        });
        setPumpReadings(initialReadings);
      }
    };

    fetchPreviousReadings();
  }, [pumps, report?.shift.status, shiftId]);

  // Fetch prices
  useEffect(() => {
    if (!store?.regionId || !pumps || pumps.length === 0) return;

    const fetchPrices = async () => {
      const prices: Record<number, number> = {};
      const uniqueProductIds = [...new Set(pumps.map((p: any) => p.productId))];

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

  // Close shift mutation
  const closeShiftMutation = useMutation({
    mutationFn: shiftsApi.closeShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-report', shiftId] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      // Clear localStorage
      if (shiftId) {
        const draftKey = `shift_${shiftId}_draft_data`;
        localStorage.removeItem(draftKey);
      }
      // Reset all state
      setPumpReadings({});
      setDraftDebtSales([]);
      setDraftReceipts([]);
      setDraftDeposits([]);
      setHasUnsavedChanges(false);
      showSuccess('Đã chốt ca thành công! Tất cả dữ liệu đã được lưu vào database.');
      navigate('/shifts');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Chốt ca thất bại', {
        position: 'top-right',
        autoClose: 3000,
      });
    },
  });

  // NOTE: Các mutations dưới đây không còn cần thiết vì đã chuyển sang Draft Mode
  // Tất cả dữ liệu lưu trong state và chỉ gửi API khi chốt ca

  const handlePumpReadingChange = (pumpId: number, field: 'startValue' | 'endValue', value: string) => {
    setPumpReadings((prev) => {
      const currentReading = prev[pumpId];
      if (!currentReading) return prev;

      // Parse và validate
      let numValue = parseFloat(value);

      // Không cho số âm
      if (numValue < 0) numValue = 0;

      // Nếu input rỗng hoặc không hợp lệ, giữ giá trị hiện tại hoặc set về 0
      if (value === '' || isNaN(numValue)) {
        numValue = 0;
      }

      // Giới hạn 3 chữ số thập phân
      numValue = Math.round(numValue * 1000) / 1000;

      // Validation realtime: Nếu đang nhập endValue và nhỏ hơn startValue
      if (field === 'endValue' && numValue < currentReading.startValue && numValue > 0) {
        toast.error(`Số cuối (${numValue}) không được nhỏ hơn số đầu (${currentReading.startValue})!`, {
          position: 'top-right',
          autoClose: 3000,
        });
      }

      return {
        ...prev,
        [pumpId]: {
          ...currentReading,
          [field]: numValue,
        },
      };
    });
  };

  const calculateQuantity = (reading: PumpReadingDto) => reading.endValue - reading.startValue;

  const calculateAmount = (reading: PumpReadingDto) => {
    const quantity = calculateQuantity(reading);
    const price = productPrices[reading.productId] || 0;
    return quantity * price;
  };

  const handleCloseShift = async () => {
    const readingsArray = Object.values(pumpReadings);

    // Validation 1: Số cuối >= số đầu
    const hasInvalidReadings = readingsArray.some((r) => r.endValue < r.startValue);
    if (hasInvalidReadings) {
      toast.error('Số cuối phải lớn hơn hoặc bằng số đầu!', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    // Validation 1.5: Kiểm tra có giá cho tất cả sản phẩm
    const missingPrices = readingsArray.filter((r) => !productPrices[r.productId] || productPrices[r.productId] === 0);
    if (missingPrices.length > 0) {
      toast.error('Có sản phẩm chưa có giá bán. Vui lòng cập nhật bảng giá trước khi chốt ca.', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    // Validation 2: Kiểm tra có vòi nào chưa nhập
    const hasEmptyReadings = readingsArray.some((r) => r.startValue === 0 && r.endValue === 0);
    if (hasEmptyReadings) {
      const confirmed = await showConfirm(
        'Có vòi chưa nhập số liệu. Bạn có chắc muốn chốt ca?',
        'Xác nhận chốt ca',
        'warning'
      );
      if (!confirmed) return;
    }

    // Tính toán để hiển thị trong confirmation
    const totalLiters = readingsArray.reduce((sum, r) => sum + (r.endValue - r.startValue), 0);
    const totalAmount = calculateTotalFromPumps();
    const draftDebtTotal = draftDebtSales.reduce((sum, ds) => sum + (ds.quantity * ds.unitPrice), 0);
    const draftReceiptTotal = draftReceipts.reduce((sum, r) => sum + r.amount, 0);
    const draftDepositTotal = draftDeposits.reduce((sum, d) => sum + d.amount, 0);
    const totalRetailCalc = totalAmount - draftDebtTotal;

    // Validation 3: Confirm chốt ca với tất cả thông tin
    const confirmed = await showConfirm(
      `Xác nhận chốt ca với:<br/>
      <strong>📊 Doanh thu:</strong><br/>
      • Tổng số lít: <strong>${totalLiters.toFixed(3)} lít</strong><br/>
      • Tổng doanh thu: <strong>${totalAmount.toLocaleString('vi-VN')} ₫</strong><br/>
      • Bán công nợ: <strong>${draftDebtTotal.toLocaleString('vi-VN')} ₫</strong> (${draftDebtSales.length} phiếu)<br/>
      • Bán lẻ: <strong>${totalRetailCalc.toLocaleString('vi-VN')} ₫</strong><br/><br/>
      <strong>💰 Thu chi:</strong><br/>
      • Thu tiền (thanh toán nợ): <strong>${draftReceiptTotal.toLocaleString('vi-VN')} ₫</strong> (${draftReceipts.length} phiếu)<br/>
      • Nộp về công ty: <strong>${draftDepositTotal.toLocaleString('vi-VN')} ₫</strong> (${draftDeposits.length} phiếu)<br/><br/>
      <span class="text-red-600 font-semibold">⚠️ Hành động này sẽ lưu TẤT CẢ dữ liệu vào database và không thể hoàn tác!</span>`,
      'Xác nhận chốt ca'
    );
    if (!confirmed) return;

    const dto: CloseShiftDto = {
      shiftId: Number(shiftId),
      pumpReadings: readingsArray,
      debtSales: draftDebtSales.map(ds => ({
        shiftId: Number(shiftId),
        customerId: ds.customerId,
        productId: ds.productId,
        quantity: ds.quantity,
        unitPrice: ds.unitPrice,
        notes: ds.notes,
      })),
      receipts: draftReceipts.map(r => ({
        storeId: r.storeId,
        shiftId: Number(shiftId),
        receiptType: r.receiptType,
        amount: r.amount,
        details: r.details,
        notes: r.notes,
      })),
      deposits: draftDeposits.map(d => ({
        storeId: d.storeId,
        shiftId: Number(shiftId),
        amount: d.amount,
        depositDate: d.depositDate,
        depositTime: d.depositTime,
        receiverName: d.receiverName,
        notes: d.notes,
      })),
    };

    closeShiftMutation.mutate(dto);
  };

  const handleDebtSaleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Lấy dữ liệu TRƯỚC khi async call (tránh event bị cleanup)
    const form = e.currentTarget;
    const formData = new FormData(form);

    const data: ShiftDebtSaleDto & { id: string } = {
      id: `draft_${Date.now()}`, // Temporary ID
      shiftId: Number(shiftId),
      customerId: Number(formData.get('customerId')),
      productId: Number(formData.get('productId')),
      quantity: Number(formData.get('quantity')),
      unitPrice: debtSaleFormPrice,
      notes: formData.get('notes') as string || undefined,
    };

    // Lưu vào draft state thay vì API
    setDraftDebtSales(prev => [...prev, data]);
    setShowDebtSaleForm(false);
    form.reset();
    setDebtSaleFormPrice(0);
    setSelectedDebtCustomer(null);
    setSelectedDebtProduct(null);
    showSuccess('Đã thêm vào danh sách công nợ (chưa lưu vào database)');
  };

  const handleReceiptSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerId = Number(formData.get('customerId'));
    const amount = Number(formData.get('amount'));

    const data: CreateReceiptDto & { id: string } = {
      id: `draft_${Date.now()}`, // Temporary ID
      storeId: user?.storeId || report?.shift.storeId || 0,
      shiftId: Number(shiftId),
      receiptType: 'DEBT_COLLECTION',
      amount,
      details: [{ customerId, amount }],
      notes: formData.get('notes') as string || undefined,
      paymentMethod: formData.get('paymentMethod') as string || 'CASH',
    };

    // Lưu vào draft state thay vì API
    setDraftReceipts(prev => [...prev, data]);
    setShowReceiptForm(false);
    setSelectedReceiptCustomer(null);
    e.currentTarget.reset();
    showSuccess('Đã thêm vào danh sách phiếu thu (chưa lưu vào database)');
  };

  const handleDepositSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));

    const data: CashDepositDto & { id: string } = {
      id: `draft_${Date.now()}`, // Temporary ID
      storeId: user?.storeId || report?.shift.storeId || 0,
      shiftId: Number(shiftId),
      amount,
      depositDate: formData.get('depositDate') as string,
      depositTime: formData.get('depositTime') as string || undefined,
      receiverName: formData.get('receiverName') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      paymentMethod: formData.get('paymentMethod') as string || 'CASH',
    };

    // Lưu vào draft state thay vì API
    setDraftDeposits(prev => [...prev, data]);
    setShowDepositForm(false);
    e.currentTarget.reset();
    showSuccess('Đã thêm vào danh sách nộp tiền (chưa lưu vào database)');
  };

  const handleDeleteDebtSale = async (id: string) => {
    const confirmed = await showConfirm('Bạn có chắc chắn muốn xóa doanh số này?', 'Xác nhận xóa');
    if (confirmed) {
      setDraftDebtSales(prev => prev.filter(item => item.id !== id));
      showSuccess('Đã xóa khỏi danh sách');
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    const confirmed = await showConfirm('Bạn có chắc chắn muốn xóa phiếu thu này?', 'Xác nhận xóa');
    if (confirmed) {
      setDraftReceipts(prev => prev.filter(item => item.id !== id));
      showSuccess('Đã xóa khỏi danh sách');
    }
  };

  const handleDeleteDeposit = async (id: string) => {
    const confirmed = await showConfirm('Bạn có chắc chắn muốn xóa phiếu nộp này?', 'Xác nhận xóa');
    if (confirmed) {
      setDraftDeposits(prev => prev.filter(item => item.id !== id));
      showSuccess('Đã xóa khỏi danh sách');
    }
  };

  const handleClearDraft = async () => {
    const confirmed = await showConfirm(
      'Xóa toàn bộ dữ liệu đã nhập (vòi bơm, công nợ, phiếu thu, nộp tiền) và bắt đầu lại?',
      'Xác nhận xóa',
      'warning'
    );
    if (confirmed) {
      setPumpReadings((prev) => {
        const cleared: Record<number, PumpReadingDto> = {};
        Object.keys(prev).forEach((key) => {
          const pumpId = Number(key);
          cleared[pumpId] = {
            ...prev[pumpId],
            startValue: 0,
            endValue: 0,
          };
        });
        return cleared;
      });
      setDraftDebtSales([]);
      setDraftReceipts([]);
      setDraftDeposits([]);
      if (shiftId) {
        const draftKey = `shift_${shiftId}_draft_data`;
        localStorage.removeItem(draftKey);
      }
      showSuccess('Đã xóa toàn bộ dữ liệu chưa lưu');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  // Tính toán real-time từ pump readings
  const calculateTotalFromPumps = () => {
    let total = 0;
    Object.values(pumpReadings).forEach((reading) => {
      const quantity = calculateQuantity(reading);
      const price = productPrices[reading.productId] || 0;
      total += quantity * price;
    });
    return total;
  };

  // Tính toán từ draft data (không dùng report API data nữa)
  const totalDebtSales = draftDebtSales.reduce((sum, sale) => sum + (sale.quantity * sale.unitPrice), 0);
  const totalReceipts = draftReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalDeposits = draftDeposits.reduce((sum, d) => sum + d.amount, 0);

  // Tính toán real-time
  const totalFromPumps = calculateTotalFromPumps();
  const totalRetailSales = totalFromPumps - totalDebtSales;
  const totalRevenue = totalFromPumps;

  const activePumps = pumps?.filter((p: any) => p.isActive) || [];
  const fuelPumps = activePumps.filter((p: any) => p.product?.isFuel);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isShiftOpen = report?.shift.status === 'OPEN';

  console.log('🔍 Debug info:', {
    pumpsCount: pumps?.length,
    activePumpsCount: activePumps.length,
    fuelPumpsCount: fuelPumps.length,
    pumpReadingsCount: Object.keys(pumpReadings).length,
    pumpReadingsData: pumpReadings,
    isShiftOpen,
    activeTab,
    shiftStatus: report?.shift.status,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/shifts')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Ca #{report?.shift.shiftNo}</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-blue-100">
                  Ngày: {dayjs(report?.shift.shiftDate).format('DD/MM/YYYY')}
                </p>
                <span className="text-blue-200">•</span>
                {isShiftOpen ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-sm">
                    <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse"></span>
                    Đang mở
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-500 text-white shadow-sm">
                    <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    Đã chốt
                  </span>
                )}
              </div>
            </div>
          </div>
          {isShiftOpen && (
            <button
              onClick={handleCloseShift}
              disabled={closeShiftMutation.isPending}
              className="inline-flex items-center px-6 py-3 text-white rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
            >
              {closeShiftMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang chốt...
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5 mr-2" />
                  Chốt ca
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bán lẻ</p>
              <p className="text-2xl font-bold text-green-600">
                {totalRetailSales.toLocaleString('vi-VN')} ₫
              </p>
            </div>
            <BanknotesIcon className="h-12 w-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bán công nợ</p>
              <p className="text-2xl font-bold text-orange-600">
                {totalDebtSales.toLocaleString('vi-VN')} ₫
              </p>
            </div>
            <CreditCardIcon className="h-12 w-12 text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng doanh thu</p>
              <p className="text-2xl font-bold text-blue-600">
                {totalRevenue.toLocaleString('vi-VN')} ₫
              </p>
            </div>
            <BuildingLibraryIcon className="h-12 w-12 text-blue-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={async () => {
                if (activeTab !== 'pump' || !hasUnsavedChanges) {
                  setActiveTab('pump');
                  return;
                }
                const confirmed = await showConfirm(
                  'Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.',
                  'Xác nhận chuyển tab',
                  'warning'
                );
                if (confirmed) setActiveTab('pump');
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pump'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Nhập số liệu vòi bơm
            </button>
            <button
              onClick={async () => {
                if (activeTab !== 'debt' || !hasUnsavedChanges) {
                  setActiveTab('debt');
                  return;
                }
                const confirmed = await showConfirm(
                  'Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.',
                  'Xác nhận chuyển tab',
                  'warning'
                );
                if (confirmed) setActiveTab('debt');
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'debt'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bán công nợ
            </button>
            <button
              onClick={async () => {
                if (activeTab !== 'cash' || !hasUnsavedChanges) {
                  setActiveTab('cash');
                  return;
                }
                const confirmed = await showConfirm(
                  'Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.',
                  'Xác nhận chuyển tab',
                  'warning'
                );
                if (confirmed) setActiveTab('cash');
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cash'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Phiếu thu/nộp tiền
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Tab 1: Pump Readings */}
          {activeTab === 'pump' && (
            <div>
              {isShiftOpen ? (
                <>
                  {hasUnsavedChanges && (
                    <div className="mb-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center text-sm text-yellow-800">
                        <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Dữ liệu đã được tự động lưu. Nhớ nhấn "Chốt ca" để hoàn tất.
                      </div>
                      <button
                        onClick={handleClearDraft}
                        className="text-xs px-3 py-1.5 bg-white border border-yellow-300 rounded hover:bg-yellow-50 text-yellow-700"
                      >
                        Xóa & bắt đầu lại
                      </button>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vòi bơm</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sản phẩm</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số đầu</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số cuối</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số lít</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Đơn giá</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Thành tiền</th>
                        </tr>
                      </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {fuelPumps.map((pump: any) => {
                        const reading = pumpReadings[pump.id];
                        if (!reading) return null;

                        const quantity = calculateQuantity(reading);
                        const unitPrice = productPrices[pump.productId] || 0;
                        const amount = calculateAmount(reading);

                        return (
                          <tr key={pump.id} className="hover:bg-blue-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <span className="text-blue-600 font-bold text-sm">{pump.pumpCode}</span>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{pump.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{pump.product?.name || 'N/A'}</td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={reading.startValue}
                                onChange={(e) => handlePumpReadingChange(pump.id, 'startValue', e.target.value)}
                                onKeyDown={(e) => {
                                  // Chặn ký tự âm
                                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                    e.preventDefault();
                                  }
                                }}
                                disabled={hasPreviousShift}
                                className={`w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-all ${
                                  hasPreviousShift ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''
                                }`}
                                placeholder="0.000"
                                title={hasPreviousShift ? 'Số đầu được tự động lấy từ ca trước và không thể thay đổi' : ''}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={reading.endValue}
                                onChange={(e) => handlePumpReadingChange(pump.id, 'endValue', e.target.value)}
                                onKeyDown={(e) => {
                                  // Chặn ký tự âm
                                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                    e.preventDefault();
                                  }
                                }}
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-blue-500 transition-colors"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-sm font-bold px-3 py-1 rounded-full ${quantity < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {quantity.toFixed(3)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">{formatCurrency(unitPrice)}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{formatCurrency(amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-right font-bold text-gray-800">Tổng cộng:</td>
                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
                            {Object.values(pumpReadings).reduce((sum, r) => sum + calculateQuantity(r), 0).toFixed(3)} lít
                          </span>
                        </td>
                        <td></td>
                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex px-4 py-2 bg-green-600 text-white rounded-lg font-bold">
                            {formatCurrency(Object.values(pumpReadings).reduce((sum, r) => sum + calculateAmount(r), 0))}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                </>
              ) : (
                // Ca đã chốt - Hiển thị pump readings từ report (read-only)
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
                    <p className="text-sm text-blue-800 font-medium">
                      ℹ️ Ca đã chốt - Dữ liệu chỉ xem (Read-only)
                    </p>
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vòi bơm</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sản phẩm</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số đầu</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số cuối</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số lít</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Đơn giá</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {report?.pumpReadings && report.pumpReadings.length > 0 ? (
                        report.pumpReadings.map((reading: any) => {
                          const amount = reading.quantity * reading.unitPrice;
                          return (
                            <tr key={reading.id}>
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <span className="text-blue-600 font-bold text-sm">{reading.pumpCode}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{reading.product?.name || 'N/A'}</td>
                              <td className="px-4 py-3 text-right text-sm text-gray-700">{Number(reading.startValue).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td>
                              <td className="px-4 py-3 text-right text-sm text-gray-700">{Number(reading.endValue).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                                  {Number(reading.quantity).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} L
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">{Number(reading.unitPrice).toLocaleString('vi-VN')} ₫</td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{amount.toLocaleString('vi-VN')} ₫</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                            Không có dữ liệu pump readings
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-right font-bold text-gray-800">Tổng cộng:</td>
                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
                            {(report?.pumpReadings?.reduce((sum: number, r: any) => sum + Number(r.quantity), 0) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} lít
                          </span>
                        </td>
                        <td></td>
                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex px-4 py-2 bg-green-600 text-white rounded-lg font-bold">
                            {formatCurrency(report?.summary?.totalRevenue || 0)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Debt Sales */}
          {activeTab === 'debt' && (
            <div>
              {isShiftOpen && (
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setShowDebtSaleForm(!showDebtSaleForm);
                      if (!showDebtSaleForm) {
                        setDebtSaleFormPrice(0);
                        setSelectedDebtCustomer(null);
                        setSelectedDebtProduct(null);
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Thêm doanh số
                  </button>
                </div>
              )}

              {showDebtSaleForm && (
                <form data-form="debt-sale" onSubmit={handleDebtSaleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng *</label>
                    <SearchableSelect
                      options={customers?.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.name}` })) || []}
                      value={selectedDebtCustomer}
                      onChange={(value) => setSelectedDebtCustomer(value as number)}
                      placeholder="-- Chọn khách hàng --"
                      required
                    />
                    <input type="hidden" name="customerId" value={selectedDebtCustomer || ''} required />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm *</label>
                    <SearchableSelect
                      options={products?.map((p: any) => ({ value: p.id, label: `${p.code} - ${p.name}` })) || []}
                      value={selectedDebtProduct}
                      onChange={(value) => {
                        setSelectedDebtProduct(value as number);
                        if (value && productPrices[value as number]) {
                          setDebtSaleFormPrice(productPrices[value as number]);
                        } else {
                          setDebtSaleFormPrice(0);
                        }
                      }}
                      placeholder="-- Chọn sản phẩm --"
                      required
                    />
                    <input type="hidden" name="productId" value={selectedDebtProduct || ''} required />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng (lít) *</label>
                    <input type="number" name="quantity" step="0.001" min="0" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="VD: 100.5" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá (₫) *</label>
                    <input
                      type="number"
                      name="unitPrice"
                      step="1"
                      min="0"
                      required
                      value={debtSaleFormPrice || ''}
                      onChange={(e) => setDebtSaleFormPrice(parseFloat(e.target.value) || 0)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="VD: 23500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <input type="text" name="notes" className="block w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>

                  <div className="md:col-span-2 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDebtSaleForm(false);
                        setDebtSaleFormPrice(0);
                        setSelectedDebtCustomer(null);
                        setSelectedDebtProduct(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                      Thêm vào danh sách
                    </button>
                  </div>
                </form>
              )}

              <table className="w-full border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                    {isShiftOpen && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isShiftOpen ? (
                    // Hiển thị draft data khi ca đang mở
                    draftDebtSales.length > 0 ? (
                      draftDebtSales.map((sale) => {
                        const customer = customers?.find(c => c.id === sale.customerId);
                        const product = products?.find(p => p.id === sale.productId);
                        return (
                          <tr key={sale.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">{customer?.code} - {customer?.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{product?.name}</td>
                            <td className="px-6 py-4 text-sm text-right">{Number(sale.quantity).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} L</td>
                            <td className="px-6 py-4 text-sm text-right">{Number(sale.unitPrice).toLocaleString('vi-VN')} ₫</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">{(sale.quantity * sale.unitPrice).toLocaleString('vi-VN')} ₫</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleDeleteDebtSale(sale.id)} className="text-red-600 hover:text-red-900" type="button">
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">Chưa có doanh số bán công nợ </td></tr>
                    )
                  ) : (
                    // Hiển thị data từ report khi ca đã chốt
                    report?.debtSales && report.debtSales.length > 0 ? (
                      report.debtSales.map((sale: any) => {
                        const customer = customers?.find(c => c.id === sale.customerId);
                        const product = products?.find(p => p.id === sale.productId);
                        return (
                          <tr key={sale.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">{customer?.code || sale.customer?.code} - {customer?.name || sale.customer?.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{product?.name || sale.product?.name}</td>
                            <td className="px-6 py-4 text-sm text-right">{Number(sale.quantity).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} L</td>
                            <td className="px-6 py-4 text-sm text-right">{Number(sale.unitPrice).toLocaleString('vi-VN')} ₫</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">{Number(sale.amount).toLocaleString('vi-VN')} ₫</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">Không có doanh số bán công nợ</td></tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Cash Management (Thu & Nộp tiền) */}
          {activeTab === 'cash' && (
            <div className="space-y-6">
              {/* Section 1: Phiếu Thu Tiền */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📥 Phiếu Thu Tiền (Thanh toán nợ)</h3>

                {isShiftOpen && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowReceiptForm(!showReceiptForm)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Tạo phiếu thu
                    </button>
                  </div>
                )}

                {showReceiptForm && (
                  <form data-form="receipt" onSubmit={handleReceiptSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng *</label>
                      <SearchableSelect
                        options={customers?.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.name}` })) || []}
                        value={selectedReceiptCustomer}
                        onChange={(value) => setSelectedReceiptCustomer(value as number)}
                        placeholder="-- Chọn khách hàng --"
                        required
                      />
                      <input type="hidden" name="customerId" value={selectedReceiptCustomer || ''} required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thu (₫) *</label>
                      <input type="number" name="amount" step="1" min="0" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="VD: 5000000" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loại thanh toán *</label>
                      <select name="paymentMethod" defaultValue="CASH" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="CASH">💵 Tiền mặt</option>
                        <option value="BANK_TRANSFER">🏦 Chuyển khoản</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                      <input type="text" name="notes" className="block w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="VD: Thu tiền hàng tháng 12" />
                    </div>

                    <div className="md:col-span-2 flex justify-end space-x-3">
                      <button type="button" onClick={() => {
                        setShowReceiptForm(false);
                        setSelectedReceiptCustomer(null);
                      }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
                      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Thêm vào danh sách
                      </button>
                    </div>
                  </form>
                )}

                <table className="w-full border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isShiftOpen ? (
                      // Draft data khi ca đang mở
                      draftReceipts.length > 0 ? (
                        draftReceipts.map((receipt) => {
                          const customerNames = receipt.details.map(d => {
                            const cust = customers?.find(c => c.id === d.customerId);
                            return cust?.name || 'N/A';
                          }).join(', ');
                          return (
                            <tr key={receipt.id}>
                              <td className="px-6 py-4 text-sm text-gray-900">Chưa lưu</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{customerNames}</td>
                              <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{Number(receipt.amount).toLocaleString('vi-VN')} ₫</td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {receipt.notes || '-'}
                                <button onClick={() => handleDeleteReceipt(receipt.id)} className="ml-4 text-red-600 hover:text-red-900" type="button">
                                  <TrashIcon className="h-4 w-4 inline" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">Chưa có phiếu thu tiền </td></tr>
                      )
                    ) : (
                      // Data từ report khi ca đã chốt
                      report?.receipts && report.receipts.length > 0 ? (
                        report.receipts.map((receipt: any) => {
                          const customerNames = receipt.details?.map((d: any) => {
                            const cust = customers?.find(c => c.id === d.customerId);
                            return cust?.name || d.customer?.name || 'N/A';
                          }).join(', ') || '-';
                          return (
                            <tr key={receipt.id}>
                              <td className="px-6 py-4 text-sm text-gray-900">{dayjs(receipt.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{customerNames}</td>
                              <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{Number(receipt.amount).toLocaleString('vi-VN')} ₫</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{receipt.notes || '-'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">Không có phiếu thu tiền</td></tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Section 2: Phiếu Nộp Tiền */}
              <div className="border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 Phiếu Nộp Tiền (Về công ty)</h3>

                {isShiftOpen && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowDepositForm(!showDepositForm)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Tạo phiếu nộp
                    </button>
                  </div>
                )}

                {showDepositForm && (
                  <form data-form="deposit" onSubmit={handleDepositSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (₫) *</label>
                      <input type="number" name="amount" step="1" min="0" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="VD: 50000000" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nộp *</label>
                      <input type="date" name="depositDate" required defaultValue={dayjs().format('YYYY-MM-DD')} className="block w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giờ nộp</label>
                      <input type="time" name="depositTime" className="block w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loại thanh toán *</label>
                      <select name="paymentMethod" defaultValue="CASH" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="CASH">💵 Tiền mặt</option>
                        <option value="BANK_TRANSFER">🏦 Chuyển khoản</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Người nhận</label>
                      <input type="text" name="receiverName" className="block w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Tên người nhận tiền" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                      <input type="text" name="notes" className="block w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>

                    <div className="md:col-span-2 flex justify-end space-x-3">
                      <button type="button" onClick={() => setShowDepositForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Thêm vào danh sách
                      </button>
                    </div>
                  </form>
                )}

                <table className="w-full border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày nộp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giờ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người nhận</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isShiftOpen ? (
                      // Draft data khi ca đang mở
                      draftDeposits.length > 0 ? (
                        draftDeposits.map((deposit) => (
                          <tr key={deposit.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">{dayjs(deposit.depositDate).format('DD/MM/YYYY')}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{deposit.depositTime || '-'}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">{Number(deposit.amount).toLocaleString('vi-VN')} ₫</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{deposit.receiverName || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {deposit.notes || '-'}
                              <button onClick={() => handleDeleteDeposit(deposit.id)} className="ml-4 text-red-600 hover:text-red-900" type="button">
                                <TrashIcon className="h-4 w-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">Chưa có phiếu nộp tiền </td></tr>
                      )
                    ) : (
                      // Data từ report khi ca đã chốt
                      report?.cashDeposits && report.cashDeposits.length > 0 ? (
                        report.cashDeposits.map((deposit: any) => (
                          <tr key={deposit.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">{dayjs(deposit.depositDate).format('DD/MM/YYYY')}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{deposit.depositTime || '-'}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">{Number(deposit.amount).toLocaleString('vi-VN')} ₫</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{deposit.receiverName || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{deposit.notes || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">Không có phiếu nộp tiền</td></tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      {isShiftOpen && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow p-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-sm text-yellow-700">
              <strong>⚠️ Lưu ý:</strong> Các số liệu dưới đây là dữ liệu DRAFT (chưa lưu vào database).
              Bấm "Chốt ca" để lưu toàn bộ dữ liệu.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600">Thu tiền (thanh toán nợ)</p>
              <p className="text-xl font-bold text-blue-600">{totalReceipts.toLocaleString('vi-VN')} ₫</p>
              <p className="text-xs text-gray-500">({draftReceipts.length} phiếu)</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <p className="text-sm text-gray-600">Nộp về công ty</p>
              <p className="text-xl font-bold text-red-600">{totalDeposits.toLocaleString('vi-VN')} ₫</p>
              <p className="text-xs text-gray-500">({draftDeposits.length} phiếu)</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-gray-600">Biến động tiền trong ca (dự tính)</p>
              <p className="text-xl font-bold text-purple-600">
                {(totalRetailSales + totalReceipts - totalDeposits).toLocaleString('vi-VN')} ₫
              </p>
              <p className="text-xs text-gray-500">Bán lẻ + Thu - Nộp</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600">Số dư quỹ hiện tại</p>
              <p className="text-xl font-bold text-green-600">
                {(report?.summary?.actualCashBalance !== undefined
                  ? report.summary.actualCashBalance
                  : report?.summary?.cashBalance || 0
                ).toLocaleString('vi-VN')} ₫
              </p>
              <p className="text-xs text-gray-500 mt-1">(Từ sổ quỹ tiền mặt)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftOperationsPage;
