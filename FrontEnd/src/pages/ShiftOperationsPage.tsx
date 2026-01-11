import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  shiftsApi,
  type ShiftDebtSaleDto,
  type CashDepositDto,
  type CreateReceiptDto,
  type PumpReadingDto,
  type CloseShiftDto,
} from "../api/shifts";
import { customersApi } from "../api/customers";
import { productsApi } from "../api/products";
import { pumpsApi } from "../api/pumps";
import { storesApi } from "../api/stores";
import { inventoryApi, type CreateInventoryDocumentWithTruckDto } from "../api/inventory";
import { useAuth } from "../contexts/AuthContext";
import { showConfirm } from "../utils/sweetalert";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import SearchableSelect from "../components/SearchableSelect";
import TruckInventoryImportForm, {
  type InventoryImportFormData,
  type CompartmentData,
} from "../components/TruckInventoryImportForm";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ArrowLeftIcon,
  CheckIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";

const ShiftOperationsPage: React.FC = () => {
  const { shiftId } = useParams<{ shiftId: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "pump" | "debt" | "receipt" | "deposit" | "import" | "export" | "inventory"
  >("pump");
  const [showDebtSaleForm, setShowDebtSaleForm] = useState(false);
  const [debtSaleFormQuantity, setDebtSaleFormQuantity] = useState<number>(0);
  const [debtSaleFormAmount, setDebtSaleFormAmount] = useState<number>(0);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showExportForm, setShowExportForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [pumpReadings, setPumpReadings] = useState<Record<number, PumpReadingDto>>({});
  const [productPrices, setProductPrices] = useState<Record<number, number>>({});
  const [debtSaleFormPrice, setDebtSaleFormPrice] = useState<number>(0);
  const [declaredRetailQuantities, setDeclaredRetailQuantities] = useState<Record<number, number>>({});
  const [retailCustomerId, setRetailCustomerId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasPreviousShift, setHasPreviousShift] = useState(false);

  // State cho SearchableSelect
  const [selectedDebtCustomer, setSelectedDebtCustomer] = useState<number | null>(null);
  const [selectedDebtProduct, setSelectedDebtProduct] = useState<number | null>(null);
  const [selectedReceiptCustomer, setSelectedReceiptCustomer] = useState<number | null>(null);

  // Editing state
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);

  // Draft Mode: Store all data until shift close
  const [draftDebtSales, setDraftDebtSales] = useState<Array<ShiftDebtSaleDto & { id: string }>>([]);
  const [draftReceipts, setDraftReceipts] = useState<Array<CreateReceiptDto & { id: string }>>([]);
  const [draftDeposits, setDraftDeposits] = useState<Array<CashDepositDto & { id: string }>>([]);
  // TODO: Define types for Import/Export
  const [draftImports, setDraftImports] = useState<any[]>([]);
  const [draftExports, setDraftExports] = useState<any[]>([]);
  const [draftInventoryChecks, setDraftInventoryChecks] = useState<any[]>([]);

  // Fetch shift report
  const { data: report, isLoading } = useQuery({
    queryKey: ["shift-report", shiftId],
    queryFn: async () => {
      const data = await shiftsApi.getReport(Number(shiftId));
      console.log("📋 Receipts data:", data.receipts);
      console.log("💰 Cash deposits data:", data.cashDeposits);
      console.log("🔧 Pump readings data:", data.pumpReadings);
      return data;
    },
    enabled: !!shiftId,
  });

  // Fetch customers - Lấy tất cả vì khách hàng có thể lấy hàng ở nhiều cửa hàng
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.getAll(),
  });

  // Fetch store-specific customers (for Retail Responsibility)
  const { data: storeCustomers } = useQuery({
    queryKey: ["customers", report?.shift.storeId],
    queryFn: () => customersApi.getAll(report?.shift.storeId),
    enabled: !!report?.shift.storeId,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.getAll,
  });

  // Fetch pumps
  const { data: pumps } = useQuery({
    queryKey: ["pumps", report?.shift.storeId],
    queryFn: async () => {
      if (!report?.shift.storeId) return [];
      return pumpsApi.getByStore(report.shift.storeId);
    },
    enabled: !!report?.shift.storeId,
  });

  // Fetch store for region
  const { data: store } = useQuery({
    queryKey: ["store", report?.shift.storeId],
    queryFn: async () => {
      if (!report?.shift.storeId) return null;
      return storesApi.getById(report.shift.storeId);
    },
    enabled: !!report?.shift.storeId,
  });

  // Cảnh báo khi rời trang có dữ liệu chưa lưu
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isShiftOpen = report?.shift.status === "OPEN";
      if (hasUnsavedChanges && isShiftOpen) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, report?.shift.status]);

  // Theo dõi thay đổi pump readings và auto-save
  useEffect(() => {
    const hasPumpData = Object.values(pumpReadings).some(
      (reading) => reading.startValue !== 0 || reading.endValue !== 0
    );
    const hasDraftData =
      draftDebtSales.length > 0 ||
      draftReceipts.length > 0 ||
      draftDeposits.length > 0 ||
      draftImports.length > 0 ||
      draftExports.length > 0 ||
      draftInventoryChecks.length > 0;
    setHasUnsavedChanges(hasPumpData || hasDraftData);

    // Auto-save to localStorage (debounced)
    if (shiftId) {
      const draftKey = `shift_${shiftId}_draft_data`;
      const draftData = {
        pumpReadings: hasPumpData ? pumpReadings : {},
        debtSales: draftDebtSales,
        receipts: draftReceipts,
        deposits: draftDeposits,
        imports: draftImports,
        exports: draftExports,
        inventoryChecks: draftInventoryChecks,
        declaredRetailQuantities,
        retailCustomerId,
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    }
  }, [
    pumpReadings,
    draftDebtSales,
    draftReceipts,
    draftDeposits,
    draftImports,
    draftExports,
    draftInventoryChecks,
    declaredRetailQuantities,
    retailCustomerId,
    shiftId,
  ]);

  // Reset forms khi chuyển tab
  useEffect(() => {
    setShowDebtSaleForm(false);
    setShowReceiptForm(false);
    setShowImportForm(false);
    setShowExportForm(false);
    setShowInventoryForm(false);
    setDebtSaleFormPrice(0);
    setEditingReceiptId(null);
    setEditingDepositId(null);

    // Auto-open deposit form in Tab B4 if empty or only has auto-generated deposits
    // Nếu chỉ có phiếu nộp từ Receipts (auto-generated), vẫn mở form để gợi ý nộp doanh thu bán lẻ
    if (activeTab === "deposit") {
      const hasManualDeposit = draftDeposits.some((d) => !String(d.id).startsWith("receipt-"));
      if (!hasManualDeposit) {
        setShowDepositForm(true);
      } else {
        setShowDepositForm(false);
      }
    } else {
      setShowDepositForm(false);
    }
  }, [activeTab, draftDeposits]);

  // Calculate suggested deposit amount (Retail Sales = Total Pump Sales - Debt Sales - Existing Manual Deposits)
  const suggestedDepositAmount = React.useMemo(() => {
    let totalPumpSales = 0;
    Object.values(pumpReadings).forEach((reading) => {
      const gross = (reading.endValue || 0) - (reading.startValue || 0);
      const net = gross - (reading.testExport || 0);
      if (net > 0) {
        const price = productPrices[reading.productId] || 0;
        totalPumpSales += net * price;
      }
    });

    const totalDebtSales = draftDebtSales.reduce((sum, ds) => sum + ds.quantity * ds.unitPrice, 0);
    const totalRetail = Math.max(0, totalPumpSales - totalDebtSales);

    // Trừ đi các khoản đã nộp (thủ công) để gợi ý số còn lại.
    // Lưu ý: Các khoản nộp tự động từ phiếu thu (receipt-*) không trừ vì chúng có nguồn tiền riêng (Thu nợ), không phải từ Bán lẻ xăng dầu.
    const existingManualDeposits = draftDeposits
      .filter((d) => !String(d.id).startsWith("receipt-"))
      .reduce((sum, d) => sum + d.amount, 0);

    return Math.max(0, totalRetail - existingManualDeposits);
  }, [pumpReadings, draftDebtSales, productPrices, draftDeposits]);

  // Initialize pump readings
  useEffect(() => {
    if (!pumps || pumps.length === 0) {
      return;
    }

    if (report?.shift.status !== "OPEN") {
      return;
    }

    // Chỉ init nếu chưa có dữ liệu (tránh ghi đè khi user đã nhập)
    const hasExistingData = Object.keys(pumpReadings).length > 0;
    if (hasExistingData) {
      console.log("✅ Already have pump readings data");
      return;
    }

    console.log("🔄 Initializing pump readings...");

    // Load từ localStorage nếu có
    const draftKey = `shift_${shiftId}_draft_data`;
    const savedData = localStorage.getItem(draftKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.pumpReadings && Object.keys(parsed.pumpReadings).length > 0) {
          console.log("📦 Restoring from localStorage:", parsed);
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
          if (parsed.imports && parsed.imports.length > 0) {
            // Lọc bỏ items với productId không hợp lệ
            const validImports = parsed.imports
              .map((imp: any) => ({
                ...imp,
                items: imp.items?.filter((item: any) => item.productId && item.productId > 0) || [],
              }))
              .filter((imp: any) => imp.items.length > 0);
            setDraftImports(validImports);
          }
          if (parsed.exports && parsed.exports.length > 0) {
            // Lọc bỏ items với productId không hợp lệ
            const validExports = parsed.exports
              .map((exp: any) => ({
                ...exp,
                items: exp.items?.filter((item: any) => item.productId && item.productId > 0) || [],
              }))
              .filter((exp: any) => exp.items.length > 0);
            setDraftExports(validExports);
          }
          if (parsed.inventoryChecks && parsed.inventoryChecks.length > 0) {
            setDraftInventoryChecks(parsed.inventoryChecks);
          }
          if (parsed.declaredRetailQuantities) {
            setDeclaredRetailQuantities(parsed.declaredRetailQuantities);
          }
          if (parsed.retailCustomerId) {
            setRetailCustomerId(parsed.retailCustomerId);
          }
          toast.success("Đã khôi phục dữ liệu chưa lưu từ lần trước", { position: "top-right", autoClose: 3000 });
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved draft data", e);
      }
    }

    // Lấy số đọc của ca trước (nếu có)
    const fetchPreviousReadings = async () => {
      try {
        const previousData = await shiftsApi.getPreviousShiftReadings(Number(shiftId));
        console.log("📊 Previous shift readings:", previousData);

        // Set state để biết có ca trước hay không
        setHasPreviousShift(previousData.hasPreviousShift);

        // Init pump readings với số đầu từ ca trước (nếu có)
        const initialReadings: Record<number, PumpReadingDto> = {};
        pumps.forEach((pump: any) => {
          const previousEndValue = previousData.hasPreviousShift ? previousData.readings[pump.pumpCode] || 0 : 0;

          initialReadings[pump.id] = {
            pumpCode: pump.pumpCode,
            productId: pump.productId,
            startValue: previousEndValue,
            endValue: 0, // KHÔNG fill sẵn, để người dùng nhập
          };
        });

        setPumpReadings(initialReadings);

        if (previousData.hasPreviousShift) {
          toast.success(
            `Đã tự động điền số đầu từ ca ${previousData.previousShiftNo} ngày ${previousData.previousShiftDate}`,
            { position: "top-right", autoClose: 3000 }
          );
        }
      } catch (error) {
        console.error("Failed to fetch previous readings:", error);
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

  // Initialize for Edit Mode
  useEffect(() => {
    if (!isEditMode || !report || !pumps || pumps.length === 0) return;

    // Only init if empty to avoid overwriting user edits during re-renders
    // But since we want to load existing data, we should check if we already loaded it.
    // We can use a simple check: if pumpReadings has keys, we assume loaded (or user edited).
    // However, for better UX, we might want to force load ONCE.
    // relying on 'hasData' might prevent reloading if we navigate away and back?
    // But component unmounts so state clears.
    const hasData = Object.keys(pumpReadings).length > 0;
    if (hasData) return;

    // 1. Pump Readings
    const initialReadings: Record<number, PumpReadingDto> = {};
    pumps.forEach((pump: any) => {
      const reportReading = report.pumpReadings.find((r: any) => r.pumpCode === pump.pumpCode);
      initialReadings[pump.id] = {
        pumpCode: pump.pumpCode,
        productId: pump.productId,
        startValue: reportReading ? Number(reportReading.startValue) : 0,
        endValue: reportReading ? Number(reportReading.endValue) : 0,
        testExport: reportReading ? Number(reportReading.testExport) : 0,
      };
    });
    setPumpReadings(initialReadings);

    // 2. Debt Sales
    if (report.debtSales) {
      setDraftDebtSales(
        report.debtSales.map((ds: any) => ({
          id: ds.id, // KEEP REAL ID
          shiftId: ds.shiftId,
          customerId: ds.customerId, // Map from report object structure if needed? Report usually returns objects.
          productId: ds.productId,
          quantity: Number(ds.quantity),
          unitPrice: Number(ds.unitPrice),
          notes: ds.notes,
        }))
      );
    }

    // 3. Receipts
    if (report.receipts) {
      // Report receipts might be complex. receipt->details.
      // Assuming simple one-customer-per-receipt for now based on UI
      setDraftReceipts(
        report.receipts.map((r: any) => {
          const detail = r.receiptDetails?.[0]; // Get first detail
          const customerId = detail?.customerId || r.customerId; // Fallback
          return {
            id: r.id, // KEEP REAL ID
            storeId: r.storeId,
            shiftId: r.shiftId,
            receiptType: r.receiptType,
            amount: Number(r.amount),
            details: [{ customerId: customerId, amount: Number(r.amount) }],
            notes: r.notes,
            paymentMethod: r.paymentMethod || "CASH",
          };
        })
      );
    }

    // 4. Deposits
    if (report.cashDeposits) {
      setDraftDeposits(
        report.cashDeposits.map((d: any) => ({
          id: d.id, // KEEP REAL ID
          storeId: d.storeId,
          shiftId: d.shiftId,
          amount: Number(d.amount),
          depositDate: d.depositDate,
          depositTime: d.depositTime,
          receiverName: d.receiverName,
          notes: d.notes,
          paymentMethod: d.paymentMethod || "CASH",
        }))
      );
    }

    // 5. Initialize Declared Retail Quantities (Step 2 - Auto Calculate)
    // In edit mode, we assume the previous "Declared" was exactly "Pump - Debt"
    const initialDeclared: Record<number, number> = {};
    const productIds = new Set<number>();

    // Sum pump readings by product
    const pumpSums: Record<number, number> = {};
    report.pumpReadings.forEach((r: any) => {
      const qty = Number(r.endValue) - Number(r.startValue) - (Number(r.testExport) || 0);
      pumpSums[r.productId] = (pumpSums[r.productId] || 0) + qty;
      productIds.add(r.productId);
    });

    // Sum debt sales by product from report
    const debtSums: Record<number, number> = {};
    if (report.debtSales) {
      report.debtSales.forEach((ds: any) => {
        debtSums[ds.productId] = (debtSums[ds.productId] || 0) + Number(ds.quantity);
        productIds.add(ds.productId);
      });
    }

    productIds.forEach((pid) => {
      const pQty = pumpSums[pid] || 0;
      const dQty = debtSums[pid] || 0;
      const retail = Math.max(0, pQty - dQty);
      initialDeclared[pid] = Math.round(retail * 1000) / 1000;
    });
    setDeclaredRetailQuantities(initialDeclared);

    // 6. Person In Charge (Step 2)
    // Since we don't save this field specially, we try to match the shift user with internal customers
    // if (storeCustomers && report.shift?.userId) {
    //   // Assuming there is a link between user and customer for "Person in Charge"
    //   // Or usually the one running the shift is the User.
    //   // If the field "retailCustomerId" is strictly for the internal employee customer record:
    //   const employee = storeCustomers.find((c: any) => c.email === user?.email || c.name === user?.fullName);
    //   if (employee) {
    //     setRetailCustomerId(employee.id);
    //   }
    // }

    toast.info("Đang ở chế độ chỉnh sửa ca đã chốt", { position: "top-center", autoClose: 3000 });
  }, [isEditMode, report, pumps, shiftId, storeCustomers, user]);

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
          console.error(`❌ Failed to fetch price for product ${productId}:`, error);
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
      queryClient.invalidateQueries({ queryKey: ["shift-report", shiftId] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
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
      toast.success("Đã chốt ca thành công! Tất cả dữ liệu đã được lưu vào database.", {
        position: "top-right",
        autoClose: 3000,
      });
      navigate("/shifts");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Chốt ca thất bại", {
        position: "top-right",
        autoClose: 3000,
      });
    },
  });

  // Update shift mutation
  const updateShiftMutation = useMutation({
    mutationFn: (data: CloseShiftDto) => shiftsApi.update(Number(shiftId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-report", shiftId] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      // Clear localStorage
      if (shiftId) {
        const draftKey = `shift_${shiftId}_draft_data`;
        localStorage.removeItem(draftKey);
      }
      toast.success("Đã cập nhật ca thành công!", {
        position: "top-right",
        autoClose: 3000,
      });
      navigate("/shifts");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Cập nhật ca thất bại", {
        position: "top-right",
        autoClose: 3000,
      });
    },
  });

  // NOTE: Các mutations dưới đây không còn cần thiết vì đã chuyển sang Draft Mode
  // Tất cả dữ liệu lưu trong state và chỉ gửi API khi chốt ca

  const handlePumpReadingChange = (pumpId: number, field: "startValue" | "endValue" | "testExport", value: string) => {
    setPumpReadings((prev) => {
      const currentReading = prev[pumpId];
      if (!currentReading) return prev;

      // Parse và validate
      let numValue = parseFloat(value);

      // Không cho số âm
      if (numValue < 0) numValue = 0;

      // Nếu input rỗng hoặc không hợp lệ, giữ giá trị hiện tại hoặc set về 0
      if (value === "" || isNaN(numValue)) {
        numValue = 0;
      }

      // Giới hạn 3 chữ số thập phân
      numValue = Math.round(numValue * 1000) / 1000;

      return {
        ...prev,
        [pumpId]: {
          ...currentReading,
          [field]: numValue,
        },
      };
    });
  };

  const calculateQuantity = (reading: PumpReadingDto) => {
    const grossQuantity = reading.endValue - reading.startValue;
    const testExport = reading.testExport || 0;
    return grossQuantity - testExport; // Lượng BÁN thực tế (trừ xuất kiểm thử)
  };

  const calculateAmount = (reading: PumpReadingDto) => {
    const quantity = calculateQuantity(reading); // Đã trừ testExport
    const price = productPrices[reading.productId];

    if (!price || isNaN(price)) {
      console.warn("⚠️ Price not found for productId:", reading.productId, "Available prices:", productPrices);
      return 0;
    }

    const amount = quantity * price;
    return isNaN(amount) ? 0 : amount;
  };

  const handleCloseShift = async () => {
    const readingsArray = Object.values(pumpReadings);

    // Tính toán trước để dùng cho validation
    const totalLiters = readingsArray.reduce((sum, r) => sum + (r.endValue - r.startValue), 0);
    const totalAmount = calculateTotalFromPumps();
    const draftDebtTotal = draftDebtSales.reduce((sum, ds) => sum + ds.quantity * ds.unitPrice, 0);
    const draftReceiptTotal = draftReceipts.reduce((sum, r) => sum + r.amount, 0);
    const draftDepositTotal = draftDeposits.reduce((sum, d) => sum + d.amount, 0);
    const totalRetailCalc = totalAmount - draftDebtTotal;

    // Validation 1: Số cuối >= số đầu
    const hasInvalidReadings = readingsArray.some((r) => r.endValue < r.startValue);
    if (hasInvalidReadings) {
      toast.error("Số cuối phải lớn hơn hoặc bằng số đầu!", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Validation 1.2: Xuất kiểm thử/quay kho không được lớn hơn lượng bơm
    const invalidTestExports = readingsArray.filter((r) => {
      const grossQuantity = r.endValue - r.startValue;
      const testExport = r.testExport || 0;
      return testExport > grossQuantity;
    });
    if (invalidTestExports.length > 0) {
      const errorMsg = invalidTestExports
        .map((r) => {
          const grossQty = r.endValue - r.startValue;
          return `Vòi ${r.pumpCode}: Xuất KT ${r.testExport?.toFixed(3)} > Bơm ${grossQty.toFixed(3)}`;
        })
        .join("; ");
      toast.error(`Xuất kiểm thử/quay kho không được lớn hơn lượng bơm! ${errorMsg}`, {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    // Validation 1.5: Kiểm tra có giá cho tất cả sản phẩm
    const missingPrices = readingsArray.filter((r) => !productPrices[r.productId] || productPrices[r.productId] === 0);
    if (missingPrices.length > 0) {
      toast.error("Có sản phẩm chưa có giá bán. Vui lòng cập nhật bảng giá trước khi chốt ca.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Validation 2: Kiểm tra có vòi nào chưa nhập
    const hasEmptyReadings = readingsArray.some((r) => r.startValue === 0 && r.endValue === 0);
    if (hasEmptyReadings) {
      const confirmed = await showConfirm(
        "Có vòi chưa nhập số liệu. Bạn có chắc muốn chốt ca?",
        "Xác nhận chốt ca",
        "warning"
      );
      if (!confirmed) return;
    }

    // Validation 2.5: Kiểm tra đối chiếu lượng hàng bán (BẮT BUỘC)
    const productIds = Array.from(new Set(readingsArray.map((r) => r.productId)));
    const invalidProducts: string[] = [];

    for (const productId of productIds) {
      const product = products?.find((p) => p.id === productId);

      // 1. Total Pump Quantity
      const pumpQty = readingsArray
        .filter((r) => r.productId === productId)
        .reduce((sum, r) => sum + calculateQuantity(r), 0);

      // 2. Total Debt Quantity
      const debtQty = draftDebtSales.filter((s) => s.productId === productId).reduce((sum, s) => sum + s.quantity, 0);

      // 3. Declared Retail Quantity
      const declaredQty = declaredRetailQuantities[productId];

      if (declaredQty === undefined || declaredQty === null) {
        toast.error(`Vui lòng nhập "Bán lẻ thực tế" cho sản phẩm ${product?.name || productId} ở Tab 2!`, {
          position: "top-right",
          autoClose: 5000,
        });
        setActiveTab("debt");
        return;
      }

      const totalDeclared = debtQty + declaredQty;
      const diff = Math.abs(pumpQty - totalDeclared);

      if (diff > 0.1) {
        // Allow 0.1 liter tolerance
        invalidProducts.push(`${product?.name || productId} (Lệch ${diff.toFixed(3)} lít)`);
      }
    }

    if (invalidProducts.length > 0) {
      toast.error(`Lượng hàng bán không khớp:\n${invalidProducts.join("\n")}\nVui lòng kiểm tra lại!`, {
        position: "top-right",
        autoClose: 7000,
      });
      return; // CHẶN KHÔNG CHO CHỐT
    }

    // ✅ FIX: Không cần chọn retailCustomerId nữa
    // Bán lẻ không ghi nợ cho ai cả, chỉ ghi vào cash_ledger

    // Validation 3: Confirm chốt ca với tất cả thông tin
    const confirmHtml = `
      <div class="text-left">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
          <tbody>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: 600;">Tổng số lít:</td>
              <td style="padding: 8px 0; text-align: right;">${totalLiters.toFixed(3)} lít</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: 600;">Tổng doanh thu (Vòi bơm):</td>
              <td style="padding: 8px 0; text-align: right;">${totalAmount.toLocaleString("vi-VN")} ₫</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: 600;">Bán công nợ (${draftDebtSales.length} phiếu):</td>
              <td style="padding: 8px 0; text-align: right;">${draftDebtTotal.toLocaleString("vi-VN")} ₫</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: 600;">Bán lẻ (Tính toán):</td>
              <td style="padding: 8px 0; text-align: right;">${totalRetailCalc.toLocaleString("vi-VN")} ₫</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb; background-color: #f0fdf4;">
              <td style="padding: 8px 0; font-weight: 600; color: #166534;">Đối chiếu lượng hàng:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #166534;">
                Đã khớp ✅
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: 600;">Thu tiền (${draftReceipts.length} phiếu):</td>
              <td style="padding: 8px 0; text-align: right;">${draftReceiptTotal.toLocaleString("vi-VN")} ₫</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600;">Nộp tiền (${draftDeposits.length} phiếu):</td>
              <td style="padding: 8px 0; text-align: right;">${draftDepositTotal.toLocaleString("vi-VN")} ₫</td>
            </tr>
          </tbody>
        </table>
        <div style="color: #dc2626; font-weight: 600; font-size: 0.875rem;">
          ⚠️ Kiểm tra kỹ số liệu cột bơm và các phiếu trước khi chốt!
        </div>
      </div>
    `;

    const swalTitle = isEditMode ? "Xác nhận cập nhật ca" : "Xác nhận chốt ca";
    const swalConfirmButton = isEditMode ? "Xác nhận cập nhật" : "Xác nhận chốt ca";

    const result = await Swal.fire({
      title: swalTitle,
      html: `
        ${confirmHtml}
        <div class="mt-4 text-left">
          <label class="block text-sm font-medium text-gray-700 mb-1">Thời gian chốt ca</label>
          <input type="datetime-local" id="closedAt" class="swal2-input" style="margin: 0; width: 100%;" value="${dayjs().format(
            "YYYY-MM-DDTHH:mm"
          )}">
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
      confirmButtonText: swalConfirmButton,
      cancelButtonText: "Hủy",
      preConfirm: () => {
        const closedAtInput = document.getElementById("closedAt") as HTMLInputElement;
        if (!closedAtInput.value) {
          Swal.showValidationMessage("Vui lòng chọn thời gian chốt ca");
        }
        return closedAtInput.value;
      },
    });

    if (!result.isConfirmed) return;

    const closedAt = result.value;

    // ✅ FIX: Bán lẻ KHÔNG tạo debt sales
    // Bán lẻ = Thu tiền mặt ngay → Backend đã ghi vào cash_ledger
    // declaredRetailQuantities chỉ dùng để đối chiếu số lượng

    const dto: CloseShiftDto = {
      shiftId: Number(shiftId),
      closedAt: closedAt ? new Date(closedAt).toISOString() : undefined,
      pumpReadings: readingsArray,
      debtSales: draftDebtSales.map((ds) => ({
        id: String(ds.id).startsWith("draft_") ? undefined : ds.id,
        shiftId: Number(shiftId),
        customerId: ds.customerId,
        productId: ds.productId,
        quantity: ds.quantity,
        unitPrice: ds.unitPrice,
        notes: ds.notes,
      })),
      receipts: draftReceipts.map((r) => ({
        id: String(r.id).startsWith("draft_") ? undefined : r.id,
        storeId: r.storeId,
        shiftId: Number(shiftId),
        receiptType: r.receiptType,
        amount: r.amount,
        details: r.details,
        notes: r.notes,
      })),
      deposits: draftDeposits.map((d) => ({
        id: String(d.id).startsWith("draft_") || String(d.id).startsWith("receipt-") ? undefined : d.id,
        storeId: d.storeId,
        shiftId: Number(shiftId),
        amount: d.amount,
        depositDate: d.depositDate,
        depositTime: d.depositTime,
        receiverName: d.receiverName,
        notes: d.notes,
      })),
    };

    if (isEditMode) {
      updateShiftMutation.mutate(dto);
    } else {
      closeShiftMutation.mutate(dto);
    }
  };

  const handleDebtSaleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Lấy dữ liệu TRƯỚC khi async call (tránh event bị cleanup)
    const form = e.currentTarget;
    const formData = new FormData(form);

    const data: ShiftDebtSaleDto & { id: string } = {
      id: `draft_${Date.now()}`, // Temporary ID
      shiftId: Number(shiftId),
      customerId: Number(formData.get("customerId")),
      productId: Number(formData.get("productId")),
      quantity: Number(formData.get("quantity")),
      unitPrice: debtSaleFormPrice,
      notes: (formData.get("notes") as string) || undefined,
    };

    // Lưu vào draft state thay vì API
    setDraftDebtSales((prev) => [...prev, data]);
    setShowDebtSaleForm(false);
    form.reset();
    setDebtSaleFormPrice(0);
    setSelectedDebtCustomer(null);
    setSelectedDebtProduct(null);
    toast.success("Đã thêm vào danh sách công nợ", { position: "top-right", autoClose: 3000 });
  };

  const handleReceiptSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerId = Number(formData.get("customerId"));
    const amount = Number(formData.get("amount"));
    const notes = (formData.get("notes") as string) || undefined;
    const paymentMethod = (formData.get("paymentMethod") as string) || "CASH";

    if (editingReceiptId) {
      setDraftReceipts((prev) =>
        prev.map((item) => {
          if (item.id === editingReceiptId) {
            return {
              ...item,
              amount,
              details: [{ customerId, amount }],
              notes,
              paymentMethod,
            };
          }
          return item;
        })
      );

      // Đồng bộ update deposit nếu có
      if (paymentMethod === "CASH") {
        setDraftDeposits((prev) => {
          const linkedId = `receipt-${editingReceiptId}`;
          let targetId = linkedId;
          let exists = prev.some((d) => d.id === targetId);

          // Nếu không tìm thấy theo ID liên kết và đây là phiếu thu đã có trong DB (không phải draft)
          // -> Cố gắng tìm phiếu nộp tương ứng dựa trên nội dung
          if (!exists && !String(editingReceiptId).startsWith("draft_")) {
            // 1. Tìm theo Note có chứa ID phiếu thu
            const matchByNote = prev.find((d) => d.notes?.includes(`Phiếu thu #${editingReceiptId}`));
            if (matchByNote) {
              targetId = matchByNote.id;
              exists = true;
            } else {
              // 2. Tìm theo số tiền cũ + keyword trong Note
              const oldReceipt = draftReceipts.find((r) => r.id === editingReceiptId);
              if (oldReceipt) {
                const candidates = prev.filter(
                  (d) =>
                    d.amount === oldReceipt.amount &&
                    d.paymentMethod === "CASH" &&
                    (d.notes?.includes("Phiếu thu") || d.notes?.includes("thu từ khách hàng")) &&
                    !String(d.id).startsWith("receipt-") // Không lấy các draft khác
                );

                // Chỉ auto-link nếu tìm thấy chính xác 1 ứng viên để tránh nhầm lẫn
                if (candidates.length === 1) {
                  targetId = candidates[0].id;
                  exists = true;
                }
              }
            }
          }

          if (exists) {
            return prev.map((d) => {
              if (d.id === targetId) {
                return {
                  ...d,
                  amount,
                  // Cập nhật note để lần sau dễ tìm kiếm hơn
                  notes: d.notes?.includes(`#${editingReceiptId}`)
                    ? d.notes
                    : `${d.notes || ""} (Phiếu thu #${editingReceiptId})`,
                };
              }
              return d;
            });
          }
          // Nếu chưa có (vd sửa từ Transfer sang CASH) -> Tạo mới
          return [
            ...prev,
            {
              id: linkedId,
              storeId: user?.storeId || report?.shift.storeId || 0,
              shiftId: Number(shiftId),
              amount,
              depositDate: dayjs().format("YYYY-MM-DD"),
              depositTime: dayjs().format("HH:mm"),
              receiverName: "Công ty SWP",
              notes: `Nộp tiền thu từ khách hàng (Phiếu thu #${editingReceiptId})`,
              paymentMethod: "CASH",
            },
          ];
        });
      }

      setEditingReceiptId(null);
      toast.success("Đã cập nhật phiếu thu và phiếu nộp tương ứng", { position: "top-right", autoClose: 3000 });
    } else {
      const receiptId = `draft_${Date.now()}`;
      const data: CreateReceiptDto & { id: string } = {
        id: receiptId,
        storeId: user?.storeId || report?.shift.storeId || 0,
        shiftId: Number(shiftId),
        receiptType: "DEBT_COLLECTION",
        amount,
        details: [{ customerId, amount }],
        notes,
        paymentMethod,
      };
      // Lưu vào draft state thay vì API
      setDraftReceipts((prev) => [...prev, data]);

      // Tự động tạo phiếu nộp (Deposit) tương ứng nếu là tiền mặt
      if (paymentMethod === "CASH") {
        const depositData: CashDepositDto & { id: string } = {
          id: `receipt-${receiptId}`, // ID liên kết đặc biệt
          storeId: user?.storeId || report?.shift.storeId || 0,
          shiftId: Number(shiftId),
          amount,
          depositDate: dayjs().format("YYYY-MM-DD"),
          depositTime: dayjs().format("HH:mm"),
          receiverName: "Công ty SWP",
          notes: `Nộp tiền thu từ khách hàng (Phiếu thu mới)`,
          paymentMethod: "CASH",
        };
        setDraftDeposits((prev) => [...prev, depositData]);
        toast.success("Đã tạo phiếu thu và phiếu nộp tương ứng", { position: "top-right", autoClose: 3000 });
      } else {
        toast.success("Đã thêm vào danh sách phiếu thu", { position: "top-right", autoClose: 3000 });
      }
    }

    setShowReceiptForm(false);
    setSelectedReceiptCustomer(null);
    e.currentTarget.reset();
  };

  const handleDepositSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const depositDate = formData.get("depositDate") as string;
    const depositTime = (formData.get("depositTime") as string) || undefined;
    const receiverName = (formData.get("receiverName") as string) || undefined;
    const notes = (formData.get("notes") as string) || undefined;
    const paymentMethod = (formData.get("paymentMethod") as string) || "CASH";

    if (editingDepositId) {
      setDraftDeposits((prev) =>
        prev.map((item) => {
          if (item.id === editingDepositId) {
            return {
              ...item,
              amount,
              depositDate,
              depositTime,
              receiverName,
              notes,
              paymentMethod,
            };
          }
          return item;
        })
      );
      setEditingDepositId(null);
      toast.success("Đã cập nhật phiếu nộp", { position: "top-right", autoClose: 3000 });
    } else {
      const data: CashDepositDto & { id: string } = {
        id: `draft_${Date.now()}`, // Temporary ID
        storeId: user?.storeId || report?.shift.storeId || 0,
        shiftId: Number(shiftId),
        amount,
        depositDate,
        depositTime,
        receiverName,
        notes,
        paymentMethod,
      };
      // Lưu vào draft state thay vì API
      setDraftDeposits((prev) => [...prev, data]);
      toast.success("Đã thêm vào danh sách nộp tiền (chưa lưu vào database)", {
        position: "top-right",
        autoClose: 3000,
      });
    }

    setShowDepositForm(false);
    e.currentTarget.reset();
  };

  const handleEditReceipt = (receipt: CreateReceiptDto & { id: string }) => {
    setEditingReceiptId(receipt.id);
    if (receipt.details && receipt.details.length > 0) {
      setSelectedReceiptCustomer(receipt.details[0].customerId);
    }
    setShowReceiptForm(true);
  };

  const handleEditDeposit = (deposit: CashDepositDto & { id: string }) => {
    setEditingDepositId(deposit.id);
    setShowDepositForm(true);
  };

  const handleDeleteDebtSale = async (id: string) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa doanh số này?", "Xác nhận xóa");
    if (confirmed) {
      setDraftDebtSales((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xóa khỏi danh sách", { position: "top-right", autoClose: 3000 });
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa phiếu thu này?", "Xác nhận xóa");
    if (confirmed) {
      setDraftReceipts((prev) => prev.filter((item) => item.id !== id));

      // Xóa luôn phiếu nộp tương ứng nếu có
      setDraftDeposits((prev) => prev.filter((item) => item.id !== `receipt-${id}`));

      toast.success("Đã xóa phiếu thu và phiếu nộp tương ứng", { position: "top-right", autoClose: 3000 });
    }
  };

  const handleDeleteDeposit = async (id: string) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa phiếu nộp này?", "Xác nhận xóa");
    if (confirmed) {
      setDraftDeposits((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xóa khỏi danh sách", { position: "top-right", autoClose: 3000 });
    }
  };

  const handleImportSubmit = async (formData: InventoryImportFormData) => {
    if (!report?.shift.storeId) {
      toast.error("Không tìm thấy thông tin cửa hàng");
      return;
    }

    try {
      const submitData: CreateInventoryDocumentWithTruckDto = {
        storeId: report.shift.storeId,
        docType: "IMPORT",
        docDate: formData.docDate,
        supplierName: formData.supplierName,
        invoiceNumber: formData.invoiceNumber,
        licensePlate: formData.licensePlate,
        driverName: formData.driverName,
        driverPhone: formData.driverPhone,
        compartments:
          formData.compartments?.map((c: CompartmentData) => ({
            compartmentNumber: c.compartmentNumber,
            productId: c.productId!,
            compartmentHeight: c.compartmentHeight,
            truckTemperature: c.truckTemperature,
            truckVolume: c.truckVolume,
            warehouseHeight: c.warehouseHeight,
            actualTemperature: c.actualTemperature,
            receivedVolume: c.receivedVolume,
            heightLossTruck: c.heightLossTruck,
            heightLossWarehouse: c.heightLossWarehouse,
          })) || [],
        notes: formData.notes,
      };

      const response = await inventoryApi.createDocumentWithTruck(submitData);

      // Lưu vào draft để hiển thị
      const newItem = {
        id: `draft_${Date.now()}`,
        documentId: response.document?.id,
        docType: "IMPORT",
        docDate: formData.docDate,
        supplierName: formData.supplierName,
        invoiceNumber: formData.invoiceNumber,
        licensePlate: formData.licensePlate,
        notes: formData.notes,
        compartments: formData.compartments,
        totalVolume:
          formData.compartments?.reduce((sum: number, c: CompartmentData) => sum + (c.receivedVolume || 0), 0) || 0,
        calculation: response.calculation,
      };

      setDraftImports((prev) => [...prev, newItem]);
      toast.success("✅ Đã lưu phiếu nhập kho với xe téc thành công!", { position: "top-right", autoClose: 3000 });
      setShowImportForm(false);
    } catch (error: any) {
      toast.error("❌ Lỗi khi lưu phiếu nhập: " + (error.response?.data?.message || error.message));
    }
  };

  const handleExportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const docDate = formData.get("docDate") as string;
    const receiverName = (formData.get("receiverName") as string) || undefined; // Reusing supplierName field or similar
    const notes = (formData.get("notes") as string) || undefined;

    const productId = formData.get("productId") ? Number(formData.get("productId")) : undefined;
    const quantity = formData.get("quantity") ? Number(formData.get("quantity")) : 0;
    const unitPrice = formData.get("unitPrice") ? Number(formData.get("unitPrice")) : 0;

    if (!productId || productId <= 0) {
      toast.error("Vui lòng chọn sản phẩm", { position: "top-right", autoClose: 3000 });
      return;
    }

    if (quantity <= 0) {
      toast.error("Số lượng phải lớn hơn 0", { position: "top-right", autoClose: 3000 });
      return;
    }

    const amount = quantity * unitPrice;

    const newItem = {
      id: `draft_${Date.now()}`,
      docType: "EXPORT",
      docDate,
      supplierName: receiverName,
      notes,
      items: [{ productId, quantity, unitPrice, amount }],
      totalAmount: amount,
    };

    setDraftExports((prev) => [...prev, newItem]);
    toast.success("Đã thêm phiếu xuất hàng", { position: "top-right", autoClose: 3000 });
    setShowExportForm(false);
    e.currentTarget.reset();
  };

  const handleDeleteImport = async (id: string) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa phiếu nhập này?", "Xác nhận xóa");
    if (confirmed) {
      setDraftImports((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xóa khỏi danh sách", { position: "top-right", autoClose: 3000 });
    }
  };

  const handleDeleteExport = async (id: string) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa phiếu xuất này?", "Xác nhận xóa");
    if (confirmed) {
      setDraftExports((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xóa khỏi danh sách", { position: "top-right", autoClose: 3000 });
    }
  };

  const handleInventorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productId = Number(formData.get("productId"));
    const systemQuantity = Number(formData.get("systemQuantity"));
    const actualQuantity = Number(formData.get("actualQuantity"));
    const notes = (formData.get("notes") as string) || undefined;

    if (actualQuantity <= 0) {
      toast.error("Số lượng thực tế phải lớn hơn 0", { position: "top-right", autoClose: 3000 });
      return;
    }

    const difference = actualQuantity - systemQuantity;

    const newItem = {
      id: `draft_${Date.now()}`,
      productId,
      systemQuantity,
      actualQuantity,
      difference,
      notes,
      checkDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    };

    setDraftInventoryChecks((prev) => [...prev, newItem]);
    toast.success("Đã thêm phiếu kiểm kê", { position: "top-right", autoClose: 3000 });
    setShowInventoryForm(false);
    e.currentTarget.reset();
  };

  const handleDeleteInventory = async (id: string) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa phiếu kiểm kê này?", "Xác nhận xóa");
    if (confirmed) {
      setDraftInventoryChecks((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xóa khỏi danh sách", { position: "top-right", autoClose: 3000 });
    }
  };

  const handleClearDraft = async () => {
    const confirmed = await showConfirm(
      "Xóa toàn bộ dữ liệu đã nhập (vòi bơm, công nợ, phiếu thu, nộp tiền) và bắt đầu lại?",
      "Xác nhận xóa",
      "warning"
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
      toast.success("Đã xóa toàn bộ dữ liệu chưa lưu", { position: "top-right", autoClose: 3000 });
    }
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return "0 ₫";
    }
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
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
  const totalDebtSales = draftDebtSales.reduce((sum, sale) => sum + sale.quantity * sale.unitPrice, 0);
  const totalReceipts = draftReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalDeposits = draftDeposits.reduce((sum, d) => sum + d.amount, 0);

  // Tính toán real-time
  const totalFromPumps = calculateTotalFromPumps();
  const totalRetailSales = totalFromPumps - totalDebtSales;
  const totalRevenue = totalFromPumps + totalReceipts;

  const activePumps = pumps?.filter((p: any) => p.isActive) || [];
  const fuelPumps = activePumps.filter((p: any) => p.product?.isFuel);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isShiftOpen = report?.shift.status === "OPEN";
  const canEdit = isShiftOpen || isEditMode;

  console.log("🔍 Debug info:", {
    pumpsCount: pumps?.length,
    activePumpsCount: activePumps.length,
    fuelPumpsCount: fuelPumps.length,
    pumpReadingsCount: Object.keys(pumpReadings).length,
    pumpReadingsData: pumpReadings,
    productPrices,
    isShiftOpen,
    activeTab,
    shiftStatus: report?.shift.status,
    receiptsCount: isShiftOpen ? draftReceipts.length : report?.receipts?.length || 0,
    depositsCount: isShiftOpen ? draftDeposits.length : report?.cashDeposits?.length || 0,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/shifts")} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Ca #{report?.shift.shiftNo}</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-blue-100">Ngày: {dayjs(report?.shift.shiftDate).format("DD/MM/YYYY")}</p>
                <span className="text-blue-200">•</span>
                {isEditMode ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white shadow-sm">
                    <PencilIcon className="w-3 h-3 mr-1.5" />
                    Đang sửa
                  </span>
                ) : isShiftOpen ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-sm">
                    <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse"></span>
                    Đang mở
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-500 text-white shadow-sm">
                    <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Đã chốt
                  </span>
                )}
              </div>
            </div>
          </div>
          {canEdit && (
            <button
              onClick={handleCloseShift}
              disabled={closeShiftMutation.isPending || updateShiftMutation.isPending}
              className="inline-flex items-center px-6 py-3 text-white rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
            >
              {closeShiftMutation.isPending || updateShiftMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {isEditMode ? "Đang cập nhật..." : "Đang chốt..."}
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5 mr-2" />
                  {isEditMode ? "Cập nhật ca" : "Chốt ca"}
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
              <p className="text-2xl font-bold text-green-600">{totalRetailSales.toLocaleString("vi-VN")} ₫</p>
            </div>
            <BanknotesIcon className="h-12 w-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bán công nợ</p>
              <p className="text-2xl font-bold text-orange-600">{totalDebtSales.toLocaleString("vi-VN")} ₫</p>
            </div>
            <CreditCardIcon className="h-12 w-12 text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng doanh thu</p>
              <p className="text-2xl font-bold text-blue-600">{totalRevenue.toLocaleString("vi-VN")} ₫</p>
            </div>
            <BuildingLibraryIcon className="h-12 w-12 text-blue-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            <button
              onClick={async () => {
                if (activeTab !== "pump" || !hasUnsavedChanges) {
                  setActiveTab("pump");
                  return;
                }
                const confirmed = await showConfirm(
                  "Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.",
                  "Xác nhận chuyển tab",
                  "warning"
                );
                if (confirmed) setActiveTab("pump");
              }}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "pump"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              B1 - Vòi bơm
            </button>
            <button
              onClick={async () => {
                if (activeTab !== "debt" || !hasUnsavedChanges) {
                  setActiveTab("debt");
                  return;
                }
                const confirmed = await showConfirm(
                  "Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.",
                  "Xác nhận chuyển tab",
                  "warning"
                );
                if (confirmed) setActiveTab("debt");
              }}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "debt"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              B2 - Bán hàng
            </button>
            <button
              onClick={async () => {
                if (activeTab !== "receipt" || !hasUnsavedChanges) {
                  setActiveTab("receipt");
                  return;
                }
                const confirmed = await showConfirm(
                  "Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.",
                  "Xác nhận chuyển tab",
                  "warning"
                );
                if (confirmed) setActiveTab("receipt");
              }}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "receipt"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              B3 - Thu tiền
            </button>
            <button
              onClick={async () => {
                if (activeTab !== "deposit" || !hasUnsavedChanges) {
                  setActiveTab("deposit");
                  return;
                }
                const confirmed = await showConfirm(
                  "Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.",
                  "Xác nhận chuyển tab",
                  "warning"
                );
                if (confirmed) setActiveTab("deposit");
              }}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "deposit"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              B4 - Nộp tiền
            </button>
            <button
              onClick={async () => {
                if (activeTab !== "import" || !hasUnsavedChanges) {
                  setActiveTab("import");
                  return;
                }
                const confirmed = await showConfirm(
                  "Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.",
                  "Xác nhận chuyển tab",
                  "warning"
                );
                if (confirmed) setActiveTab("import");
              }}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "import"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              B5 - Nhập kho
            </button>
            <button
              onClick={async () => {
                if (activeTab !== "export" || !hasUnsavedChanges) {
                  setActiveTab("export");
                  return;
                }
                const confirmed = await showConfirm(
                  "Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.",
                  "Xác nhận chuyển tab",
                  "warning"
                );
                if (confirmed) setActiveTab("export");
              }}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "export"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              B6 - Xuất kho
            </button>
            <button
              onClick={async () => {
                if (activeTab !== "inventory" || !hasUnsavedChanges) {
                  setActiveTab("inventory");
                  return;
                }
                const confirmed = await showConfirm(
                  "Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.",
                  "Xác nhận chuyển tab",
                  "warning"
                );
                if (confirmed) setActiveTab("inventory");
              }}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "inventory"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              B7 - Kiểm kê
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Tab 1: Pump Readings */}
          {activeTab === "pump" && (
            <div>
              {canEdit ? (
                <>
                  {hasUnsavedChanges && (
                    <div className="mb-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center text-sm text-yellow-800">
                        <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
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
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Sản phẩm
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số đầu</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                            Số cuối
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                            Xuất KT/Quay kho
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số lít</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                            Đơn giá
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                            Thành tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {fuelPumps.map((pump: any) => {
                          const reading = pumpReadings[pump.id];
                          if (!reading) return null;

                          const quantity = calculateQuantity(reading);
                          const unitPrice = productPrices[pump.productId];
                          const amount = calculateAmount(reading);
                          const isPriceLoaded = unitPrice && unitPrice > 0 && !isNaN(unitPrice);

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
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {pump.product?.name || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  value={reading.startValue}
                                  onChange={(e) => handlePumpReadingChange(pump.id, "startValue", e.target.value)}
                                  onKeyDown={(e) => {
                                    // Chặn ký tự âm
                                    if (e.key === "-" || e.key === "e" || e.key === "E") {
                                      e.preventDefault();
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  disabled={hasPreviousShift}
                                  className={`w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-all ${
                                    hasPreviousShift ? "bg-gray-100 cursor-not-allowed text-gray-600" : ""
                                  }`}
                                  placeholder="0.000"
                                  title={
                                    hasPreviousShift ? "Số đầu được tự động lấy từ ca trước và không thể thay đổi" : ""
                                  }
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={reading.endValue}
                                  onChange={(e) => handlePumpReadingChange(pump.id, "endValue", e.target.value)}
                                  onBlur={() => {
                                    if (reading.endValue < reading.startValue && reading.endValue > 0) {
                                      toast.error(
                                        `Số cuối (${reading.endValue}) không được nhỏ hơn số đầu (${reading.startValue})!`,
                                        {
                                          position: "top-right",
                                          autoClose: 3000,
                                        }
                                      );
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    // Chặn ký tự âm
                                    if (e.key === "-" || e.key === "e" || e.key === "E") {
                                      e.preventDefault();
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-blue-500 transition-colors"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  max={reading.endValue - reading.startValue}
                                  value={reading.testExport || 0}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    const grossQuantity = reading.endValue - reading.startValue;
                                    if (value > grossQuantity) {
                                      toast.error(
                                        `Xuất kiểm thử/quay kho (${value.toFixed(
                                          3
                                        )}) không được lớn hơn lượng bơm (${grossQuantity.toFixed(3)})!`,
                                        {
                                          position: "top-right",
                                          autoClose: 3000,
                                        }
                                      );
                                      return;
                                    }
                                    handlePumpReadingChange(pump.id, "testExport", e.target.value);
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => {
                                    if (e.key === "-" || e.key === "e" || e.key === "E") {
                                      e.preventDefault();
                                    }
                                  }}
                                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 transition-colors bg-purple-50"
                                  placeholder="0.000"
                                  title="Lượng xuất kiểm thử hoặc quay kho (lít)"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`text-sm font-bold px-3 py-1 rounded-full ${
                                    quantity < 0 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {quantity.toFixed(3)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium">
                                {isPriceLoaded ? (
                                  <span className="text-gray-700">{formatCurrency(unitPrice)}</span>
                                ) : (
                                  <span className="text-yellow-600 text-xs">Đang tải...</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-bold">
                                {isPriceLoaded ? (
                                  <span className="text-green-600">{formatCurrency(amount)}</span>
                                ) : (
                                  <span className="text-yellow-600 text-xs">Đang tải...</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-right font-bold text-gray-800">
                            Tổng cộng:
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="inline-flex px-3 py-2 bg-purple-600 text-white rounded-lg font-bold text-xs">
                              {Object.values(pumpReadings)
                                .reduce((sum, r) => sum + (Number(r.testExport) || 0), 0)
                                .toFixed(3)}{" "}
                              lít
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
                              {Object.values(pumpReadings)
                                .reduce((sum, r) => sum + calculateQuantity(r), 0)
                                .toFixed(3)}{" "}
                              lít
                            </span>
                          </td>
                          <td></td>
                          <td className="px-4 py-4 text-right">
                            <span className="inline-flex px-4 py-2 bg-green-600 text-white rounded-lg font-bold">
                              {formatCurrency(
                                Object.values(pumpReadings).reduce((sum, r) => sum + calculateAmount(r), 0)
                              )}
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
                    <p className="text-sm text-blue-800 font-medium">ℹ️ Ca đã chốt - Dữ liệu chỉ xem (Read-only)</p>
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vòi bơm</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sản phẩm</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số đầu</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số cuối</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                          Xuất KT/Quay kho
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Số lít</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Đơn giá</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {report?.pumpReadings && report.pumpReadings.length > 0 ? (
                        report.pumpReadings.map((reading: any) => {
                          // Ưu tiên lấy unitPrice đã lưu trong pump_readings (giá tại thời điểm chốt ca)
                          // Nếu không có (dữ liệu cũ), fallback sang productPrices (giá hiện tại - có thể sai)
                          const unitPrice = reading.unitPrice || productPrices[reading.productId] || 0;
                          const quantity = Number(reading.quantity) || 0;
                          const amount = quantity * unitPrice;

                          console.log("💵 Closed shift reading:", {
                            pumpCode: reading.pumpCode,
                            productId: reading.productId,
                            quantity,
                            unitPriceFromDB: reading.unitPrice,
                            unitPriceFromCurrent: productPrices[reading.productId],
                            unitPriceUsed: unitPrice,
                            amount,
                          });

                          return (
                            <tr key={reading.id}>
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <span className="text-blue-600 font-bold text-sm">{reading.pumpCode}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {reading.product?.name || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-700">
                                {Number(reading.startValue).toLocaleString("vi-VN", { maximumFractionDigits: 3 })}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-700">
                                {Number(reading.endValue).toLocaleString("vi-VN", { maximumFractionDigits: 3 })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-700">
                                  {(Number(reading.testExport) || 0).toLocaleString("vi-VN", {
                                    maximumFractionDigits: 3,
                                  })}{" "}
                                  L
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                                  {quantity.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} L
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                                {unitPrice > 0 ? `${unitPrice.toLocaleString("vi-VN")} ₫` : "-"}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                                {amount > 0 ? `${amount.toLocaleString("vi-VN")} ₫` : "-"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                            Không có dữ liệu pump readings
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-right font-bold text-gray-800">
                          Tổng cộng:
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex px-3 py-2 bg-purple-600 text-white rounded-lg font-bold text-xs">
                            {(
                              report?.pumpReadings?.reduce(
                                (sum: number, r: any) => sum + (Number(r.testExport) || 0),
                                0
                              ) || 0
                            ).toLocaleString("vi-VN", { maximumFractionDigits: 3 })}{" "}
                            lít
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
                            {(
                              report?.pumpReadings?.reduce((sum: number, r: any) => sum + Number(r.quantity), 0) || 0
                            ).toLocaleString("vi-VN", { maximumFractionDigits: 3 })}{" "}
                            lít
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
          {activeTab === "debt" && (
            <div className="space-y-6">
              {/* Retail Responsibility Section */}
              {canEdit ? (
                <div className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm mb-4">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-2">👤 Người phụ trách ca</h3>
                  <div className="max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">CTH/PT Cửa Hàng</label>
                    <SearchableSelect
                      options={
                        storeCustomers
                          ?.filter((c: any) => c.type === "INTERNAL")
                          .map((customer: any) => ({
                            value: customer.id,
                            label: `${customer.code} - ${customer.name}`,
                          })) || []
                      }
                      value={retailCustomerId}
                      onChange={(value) => setRetailCustomerId(value as number)}
                      placeholder="-- Chọn nhân viên (chỉ để theo dõi) --"
                      className="w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm mb-4">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-2">👤 Người phụ trách ca</h3>
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium mr-2">Người chốt ca:</span>
                    <span>{user?.fullName || "Chi tiết trong lịch sử"}</span>
                  </div>
                </div>
              )}

              {/* Retail Quantity Verification Section */}
              {canEdit ? (
                <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">⛽ Đối chiếu lượng hàng bán</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                          <th className="px-4 py-2 text-left">Sản phẩm</th>
                          <th className="px-4 py-2 text-right">Tổng vòi bơm (1)</th>
                          <th className="px-4 py-2 text-right">Bán nợ (2)</th>
                          <th className="px-4 py-2 text-right w-48">Bán lẻ thực tế (3) *</th>
                          <th className="px-4 py-2 text-right">Tổng bán (2+3)</th>
                          <th className="px-4 py-2 text-right">Chênh lệch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(() => {
                          // Get unique products from pumps
                          const productIds = Array.from(new Set(Object.values(pumpReadings).map((r) => r.productId)));

                          return productIds.map((productId) => {
                            const product = products?.find((p) => p.id === productId);

                            // 1. Total Pump Quantity
                            const pumpQty = Object.values(pumpReadings)
                              .filter((r) => r.productId === productId)
                              .reduce((sum, r) => sum + calculateQuantity(r), 0);

                            // 2. Total Debt Quantity
                            const debtQty = draftDebtSales
                              .filter((s) => s.productId === productId)
                              .reduce((sum, s) => sum + s.quantity, 0);

                            // 3. Declared Retail Quantity
                            const declaredQty = declaredRetailQuantities[productId] ?? 0;

                            // Total Declared
                            const totalDeclared = debtQty + declaredQty;

                            // Difference
                            const diff = pumpQty - totalDeclared;
                            const isMatch = Math.abs(diff) < 0.1; // Allow small tolerance

                            return (
                              <tr key={productId} className={!isMatch ? "bg-red-50" : ""}>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {product?.name || `ID: ${productId}`}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">{pumpQty.toFixed(3)}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{debtQty.toFixed(3)}</td>
                                <td className="px-4 py-3 text-right">
                                  <input
                                    type="number"
                                    step="0.001"
                                    value={declaredRetailQuantities[productId] ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                      setDeclaredRetailQuantities((prev) => ({
                                        ...prev,
                                        [productId]: val,
                                      }));
                                    }}
                                    className={`w-full px-2 py-1 text-right border rounded focus:ring-2 focus:ring-blue-500 ${
                                      !isMatch ? "border-red-300 bg-white" : "border-gray-300"
                                    }`}
                                    placeholder="0.000"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right font-medium">{totalDeclared.toFixed(3)}</td>
                                <td
                                  className={`px-4 py-3 text-right font-bold ${
                                    isMatch ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {diff.toFixed(3)}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    * Nhập số lượng bán lẻ thực tế (lít) để đối chiếu với tổng lượng bơm.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                  <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 mb-4 rounded-t-lg">
                    <p className="text-sm text-blue-800 font-medium">ℹ️ Ca đã chốt - Dữ liệu đối chiếu (Read-only)</p>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2">⛽ Đối chiếu lượng hàng bán</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                          <th className="px-4 py-2 text-left">Sản phẩm</th>
                          <th className="px-4 py-2 text-right">Tổng vòi bơm (1)</th>
                          <th className="px-4 py-2 text-right">Bán nợ (2)</th>
                          <th className="px-4 py-2 text-right w-48">Bán lẻ thực tế (Tính toán) (3)</th>
                          <th className="px-4 py-2 text-right">Tổng bán (2+3)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(() => {
                          const productIds = Array.from(
                            new Set(report?.pumpReadings?.map((r: any) => r.productId) || [])
                          );

                          if (productIds.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="text-center py-4 text-gray-500">
                                  Không có dữ liệu
                                </td>
                              </tr>
                            );
                          }

                          return productIds.map((productId) => {
                            const product = products?.find((p) => p.id === productId);

                            // 1. Pump Qty from report
                            const pumpQty =
                              report?.pumpReadings
                                ?.filter((r: any) => r.productId === productId)
                                .reduce((sum: number, r: any) => sum + (Number(r.quantity) || 0), 0) || 0;

                            // 2. Debt Qty from report
                            const debtQty =
                              report?.debtSales
                                ?.filter((s: any) => s.productId === productId)
                                .reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0) || 0;

                            // 3. Retail Qty (Calculated)
                            const retailQty = pumpQty - debtQty;

                            return (
                              <tr key={productId as number}>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {product?.name || `ID: ${productId}`}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">{pumpQty.toFixed(3)}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{debtQty.toFixed(3)}</td>
                                <td className="px-4 py-3 text-right text-gray-800 font-medium">
                                  {retailQty.toFixed(3)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium">{(debtQty + retailQty).toFixed(3)}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Danh sách bán nợ</h3>
                {canEdit && (
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        setShowDebtSaleForm(!showDebtSaleForm);
                        if (!showDebtSaleForm) {
                          setDebtSaleFormPrice(0);
                          setDebtSaleFormQuantity(0);
                          setDebtSaleFormAmount(0);
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

                {canEdit && showDebtSaleForm && (
                  <form
                    data-form="debt-sale"
                    onSubmit={handleDebtSaleSubmit}
                    className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng *</label>
                      <SearchableSelect
                        options={customers?.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.name}` })) || []}
                        value={selectedDebtCustomer}
                        onChange={(value) => setSelectedDebtCustomer(value as number)}
                        placeholder="-- Chọn khách hàng --"
                        required
                      />
                      <input type="hidden" name="customerId" value={selectedDebtCustomer || ""} required />
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
                            // Tính lại thành tiền khi đổi sản phẩm
                            setDebtSaleFormAmount(debtSaleFormQuantity * productPrices[value as number]);
                          } else {
                            setDebtSaleFormPrice(0);
                            setDebtSaleFormAmount(0);
                          }
                        }}
                        placeholder="-- Chọn sản phẩm --"
                        required
                      />
                      <input type="hidden" name="productId" value={selectedDebtProduct || ""} required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng (lít) *</label>
                      <input
                        type="number"
                        name="quantity"
                        step="0.001"
                        min="0.001"
                        value={debtSaleFormQuantity || ""}
                        onChange={(e) => {
                          const qty = parseFloat(e.target.value) || 0;
                          setDebtSaleFormQuantity(qty);
                          setDebtSaleFormAmount(qty * debtSaleFormPrice);
                        }}
                        onBlur={(e) => {
                          const qty = parseFloat(e.target.value) || 0;
                          if (qty <= 0) {
                            toast.error("Số lượng phải lớn hơn 0!", { position: "top-right", autoClose: 2000 });
                            return;
                          }
                          // Kiểm tra không vượt quá tồn kho bán
                          if (selectedDebtProduct) {
                            const totalPumpedForProduct = Object.values(pumpReadings)
                              .filter((r) => r.productId === selectedDebtProduct)
                              .reduce((sum, r) => sum + calculateQuantity(r), 0);

                            const existingDebtForProduct = draftDebtSales
                              .filter((ds) => ds.productId === selectedDebtProduct)
                              .reduce((sum, ds) => sum + ds.quantity, 0);

                            const availableQty = totalPumpedForProduct - existingDebtForProduct;

                            if (qty > availableQty) {
                              toast.error(
                                `Số lượng bán nợ (${qty.toFixed(3)}) vượt quá số lượng còn lại (${availableQty.toFixed(
                                  3
                                )} lít)!`,
                                { position: "top-right", autoClose: 4000 }
                              );
                              setDebtSaleFormQuantity(0);
                              setDebtSaleFormAmount(0);
                            }
                          }
                        }}
                        required
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="VD: 100.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá (₫) *</label>
                      <input
                        type="number"
                        name="unitPrice"
                        step="1"
                        min="0"
                        required
                        readOnly
                        value={debtSaleFormPrice || ""}
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                        placeholder="Tự động theo sản phẩm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Thành tiền (₫)</label>
                      <input
                        type="number"
                        step="1"
                        value={debtSaleFormAmount || ""}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          setDebtSaleFormAmount(amount);
                          if (debtSaleFormPrice > 0) {
                            setDebtSaleFormQuantity(amount / debtSaleFormPrice);
                          }
                        }}
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg bg-blue-50"
                        placeholder="Tự động tính"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diễn giải</label>
                      <input
                        type="text"
                        name="notes"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDebtSaleForm(false);
                          setDebtSaleFormPrice(0);
                          setDebtSaleFormQuantity(0);
                          setDebtSaleFormAmount(0);
                          setSelectedDebtCustomer(null);
                          setSelectedDebtProduct(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
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
                      {canEdit && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {canEdit ? (
                      // Hiển thị draft data khi ca đang mở
                      draftDebtSales.length > 0 ? (
                        draftDebtSales.map((sale) => {
                          const customer = customers?.find((c) => c.id === sale.customerId);
                          const product = products?.find((p) => p.id === sale.productId);
                          return (
                            <tr key={sale.id}>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {customer?.code} - {customer?.name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">{product?.name}</td>
                              <td className="px-6 py-4 text-sm text-right">
                                {Number(sale.quantity).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} L
                              </td>
                              <td className="px-6 py-4 text-sm text-right">
                                {Number(sale.unitPrice).toLocaleString("vi-VN")} ₫
                              </td>
                              <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">
                                {(sale.quantity * sale.unitPrice).toLocaleString("vi-VN")} ₫
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleDeleteDebtSale(sale.id)}
                                  className="text-red-600 hover:text-red-900"
                                  type="button"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                            Chưa có doanh số bán công nợ{" "}
                          </td>
                        </tr>
                      )
                    ) : // Hiển thị data từ report khi ca đã chốt
                    report?.debtSales && report.debtSales.length > 0 ? (
                      report.debtSales.map((sale: any) => {
                        const customer = customers?.find((c) => c.id === sale.customerId);
                        const product = products?.find((p) => p.id === sale.productId);
                        return (
                          <tr key={sale.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {customer?.code || sale.customer?.code} - {customer?.name || sale.customer?.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{product?.name || sale.product?.name}</td>
                            <td className="px-6 py-4 text-sm text-right">
                              {Number(sale.quantity).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} L
                            </td>
                            <td className="px-6 py-4 text-sm text-right">
                              {Number(sale.unitPrice).toLocaleString("vi-VN")} ₫
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">
                              {Number(sale.amount).toLocaleString("vi-VN")} ₫
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                          Không có doanh số bán công nợ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Receipts (Phiếu Thu) */}
          {activeTab === "receipt" && (
            <div className="space-y-6">
              {/* Section 1: Phiếu Thu Tiền */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📥 Phiếu Thu Tiền (Thanh toán nợ)</h3>

                {canEdit && (
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

                {canEdit && showReceiptForm && (
                  <form
                    key={editingReceiptId || "new"}
                    data-form="receipt"
                    onSubmit={handleReceiptSubmit}
                    className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng *</label>
                      <SearchableSelect
                        options={customers?.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.name}` })) || []}
                        value={selectedReceiptCustomer}
                        onChange={(value) => setSelectedReceiptCustomer(value as number)}
                        placeholder="-- Chọn khách hàng --"
                        required
                      />
                      <input type="hidden" name="customerId" value={selectedReceiptCustomer || ""} required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thu (₫) *</label>
                      <input
                        type="number"
                        name="amount"
                        step="1"
                        min="0"
                        required
                        defaultValue={
                          editingReceiptId ? draftReceipts.find((r) => r.id === editingReceiptId)?.amount : ""
                        }
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="VD: 5000000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loại thanh toán *</label>
                      <select
                        name="paymentMethod"
                        defaultValue={
                          editingReceiptId
                            ? draftReceipts.find((r) => r.id === editingReceiptId)?.paymentMethod
                            : "CASH"
                        }
                        required
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="CASH">💵 Tiền mặt</option>
                        <option value="BANK_TRANSFER">🏦 Chuyển khoản</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diễn giải</label>
                      <input
                        type="text"
                        name="notes"
                        defaultValue={
                          editingReceiptId ? draftReceipts.find((r) => r.id === editingReceiptId)?.notes : ""
                        }
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="VD: Thu tiền hàng tháng 12"
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowReceiptForm(false);
                          setSelectedReceiptCustomer(null);
                          setEditingReceiptId(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        {editingReceiptId ? "Cập nhật" : "Thêm vào danh sách"}
                      </button>
                    </div>
                  </form>
                )}

                <table className="w-full border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diễn giải</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {canEdit ? (
                      // Draft data khi ca đang mở (hoặc đang sửa)
                      draftReceipts.length > 0 ? (
                        draftReceipts.map((receipt) => {
                          console.log("receipt", receipt);
                          const customerNames = receipt.details
                            .map((d) => {
                              const cust = customers?.find((c) => c.id === d.customerId);
                              console.log("cust", cust);
                              return cust?.name || "N/A";
                            })
                            .join(", ");
                          return (
                            <tr key={receipt.id}>
                              <td className="px-6 py-4 text-sm text-gray-900">Chưa lưu</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{customerNames}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{receipt.notes || "-"}</td>
                              <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                                {Number(receipt.amount).toLocaleString("vi-VN")} ₫
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-medium">
                                <button
                                  onClick={() => handleEditReceipt(receipt)}
                                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                                  type="button"
                                >
                                  <PencilIcon className="h-5 w-5 inline" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReceipt(receipt.id)}
                                  className="text-red-600 hover:text-red-900"
                                  type="button"
                                >
                                  <TrashIcon className="h-5 w-5 inline" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                            Chưa có phiếu thu tiền{" "}
                          </td>
                        </tr>
                      )
                    ) : // Data từ report khi ca đã chốt
                    report?.receipts && report.receipts.length > 0 ? (
                      report.receipts.map((receipt: any) => {
                        const customerNames =
                          receipt.receiptDetails
                            ?.map((d: any) => {
                              const cust = customers?.find((c) => c.id === d.customerId);
                              return cust?.name || d.customer?.name || "N/A";
                            })
                            .join(", ") ||
                          receipt.details
                            ?.map((d: any) => {
                              const cust = customers?.find((c) => c.id === d.customerId);
                              return cust?.name || d.customer?.name || "N/A";
                            })
                            .join(", ") ||
                          "-";
                        return (
                          <tr key={receipt.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {dayjs(receipt.createdAt).format("DD/MM/YYYY HH:mm")}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{customerNames}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{receipt.notes || "-"}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                              {Number(receipt.amount).toLocaleString("vi-VN")} ₫
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500"></td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                          Không có phiếu thu tiền
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Deposits (Phiếu Nộp) */}
          {activeTab === "deposit" && (
            <div className="space-y-6">
              {/* Section 2: Phiếu Nộp Tiền */}
              <div className="border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 Phiếu Nộp Tiền (Về công ty)</h3>

                {canEdit && (
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

                {canEdit && showDepositForm && (
                  <form
                    key={editingDepositId || "new"}
                    data-form="deposit"
                    onSubmit={handleDepositSubmit}
                    className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (₫) *</label>
                      <input
                        type="number"
                        name="amount"
                        step="1"
                        min="0"
                        required
                        defaultValue={
                          editingDepositId
                            ? draftDeposits.find((d) => d.id === editingDepositId)?.amount
                            : suggestedDepositAmount > 0
                            ? suggestedDepositAmount
                            : ""
                        }
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="VD: 50000000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nộp *</label>
                      <input
                        type="date"
                        name="depositDate"
                        required
                        defaultValue={
                          editingDepositId
                            ? draftDeposits.find((d) => d.id === editingDepositId)?.depositDate
                            : dayjs().format("YYYY-MM-DD")
                        }
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giờ nộp</label>
                      <input
                        type="time"
                        name="depositTime"
                        defaultValue={
                          editingDepositId ? draftDeposits.find((d) => d.id === editingDepositId)?.depositTime : ""
                        }
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loại thanh toán *</label>
                      <select
                        name="paymentMethod"
                        defaultValue={
                          editingDepositId
                            ? draftDeposits.find((d) => d.id === editingDepositId)?.paymentMethod
                            : "CASH"
                        }
                        required
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="CASH">💵 Tiền mặt</option>
                        <option value="BANK_TRANSFER">🏦 Chuyển khoản</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Người nhận</label>
                      <input
                        type="text"
                        name="receiverName"
                        defaultValue={
                          editingDepositId
                            ? draftDeposits.find((d) => d.id === editingDepositId)?.receiverName
                            : "Công ty SWP"
                        }
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Tên người nhận tiền"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diễn giải</label>
                      <input
                        type="text"
                        name="notes"
                        defaultValue={
                          editingDepositId
                            ? draftDeposits.find((d) => d.id === editingDepositId)?.notes
                            : `Nộp tiền Ca #${report?.shift.shiftNo || ""}`
                        }
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDepositForm(false);
                          setEditingDepositId(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        {editingDepositId ? "Cập nhật" : "Thêm vào danh sách"}
                      </button>
                    </div>
                  </form>
                )}

                <table className="w-full border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày nộp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giờ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người nhận</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diễn giải</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {canEdit ? (
                      // Draft data khi ca đang mở
                      draftDeposits.length > 0 ? (
                        draftDeposits.map((deposit) => (
                          <tr key={deposit.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {dayjs(deposit.depositDate).format("DD/MM/YYYY")}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{deposit.depositTime || "-"}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{deposit.receiverName || "-"}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{deposit.notes || "-"}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">
                              {Number(deposit.amount).toLocaleString("vi-VN")} ₫
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditDeposit(deposit)}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                type="button"
                              >
                                <PencilIcon className="h-5 w-5 inline" />
                              </button>
                              <button
                                onClick={() => handleDeleteDeposit(deposit.id)}
                                className="text-red-600 hover:text-red-900"
                                type="button"
                              >
                                <TrashIcon className="h-5 w-5 inline" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                            Chưa có phiếu nộp tiền{" "}
                          </td>
                        </tr>
                      )
                    ) : // Data từ report khi ca đã chốt
                    report?.cashDeposits && report.cashDeposits.length > 0 ? (
                      report.cashDeposits.map((deposit: any) => (
                        <tr key={deposit.id}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {dayjs(deposit.depositDate).format("DD/MM/YYYY")}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{deposit.depositTime || "-"}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{deposit.receiverName || "-"}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{deposit.notes || "-"}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">
                            {Number(deposit.amount).toLocaleString("vi-VN")} ₫
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500"></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                          Không có phiếu nộp tiền
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Imports (Phiếu Nhập Hàng) */}
          {activeTab === "import" && (
            <div className="space-y-6">
              <div className="border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📥 Phiếu Nhập Kho Xăng Dầu (Xe Téc)</h3>

                {isShiftOpen && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowImportForm(!showImportForm)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      {showImportForm ? "Đóng form" : "Tạo phiếu nhập"}
                    </button>
                  </div>
                )}

                {showImportForm && (
                  <TruckInventoryImportForm onSubmit={handleImportSubmit} onCancel={() => setShowImportForm(false)} />
                )}

                <table className="w-full border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biển số xe</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NCC</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số HĐ</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Số ngăn</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng lít</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {draftImports.length > 0 ? (
                      draftImports.map((item) => {
                        const status = item.calculation?.status || "NORMAL";
                        const statusColor =
                          status === "EXCESS"
                            ? "text-green-600"
                            : status === "SHORTAGE"
                            ? "text-red-600"
                            : "text-gray-600";
                        const statusText =
                          status === "EXCESS" ? "✅ Thừa" : status === "SHORTAGE" ? "⚠️ Thiếu" : "✔️ Bình thường";

                        return (
                          <tr key={item.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {dayjs(item.docDate).format("DD/MM/YYYY")}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.licensePlate || "-"}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.supplierName || "-"}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.invoiceNumber || "-"}</td>
                            <td className="px-6 py-4 text-sm text-center text-gray-700">
                              {item.compartments?.length || 0} ngăn
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                              {Number(item.totalVolume || 0).toLocaleString("vi-VN")} lít
                            </td>
                            <td className="px-6 py-4 text-sm text-center">
                              <span className={`font-medium ${statusColor}`}>{statusText}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                              {item.documentId && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const blob = await inventoryApi.exportDocumentToExcel(item.documentId);
                                      const url = window.URL.createObjectURL(blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = `Bien_ban_giao_nhan_${item.invoiceNumber || item.documentId}.xlsx`;
                                      a.click();
                                      window.URL.revokeObjectURL(url);
                                      toast.success("Đã tải file Excel thành công");
                                    } catch (error: any) {
                                      toast.error("Lỗi khi xuất Excel: " + error.message);
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center"
                                  type="button"
                                  title="Xuất Excel"
                                >
                                  <DocumentArrowDownIcon className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteImport(item.id)}
                                className="text-red-600 hover:text-red-900"
                                type="button"
                              >
                                <TrashIcon className="h-5 w-5 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                          Chưa có phiếu nhập hàng
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 6: Exports (Phiếu Xuất Hàng) */}
          {activeTab === "export" && (
            <div className="space-y-6">
              <div className="border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 Phiếu Xuất Hàng</h3>

                {isShiftOpen && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowExportForm(!showExportForm)}
                      className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Tạo phiếu xuất
                    </button>
                  </div>
                )}

                {showExportForm && (
                  <form
                    data-form="export"
                    onSubmit={handleExportSubmit}
                    className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày xuất *</label>
                      <input
                        type="date"
                        name="docDate"
                        required
                        defaultValue={dayjs().format("YYYY-MM-DD")}
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Người nhận / Đơn vị</label>
                      <input
                        type="text"
                        name="receiverName"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Tên người nhận"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diễn giải</label>
                      <input
                        type="text"
                        name="notes"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Lý do xuất..."
                      />
                    </div>

                    {/* Simple Item Entry for now */}
                    <div className="md:col-span-2 border-t pt-4 mt-2">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Chi tiết hàng hóa (Xuất nhanh)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Sản phẩm</label>
                          <select
                            name="productId"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {products?.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Số lượng</label>
                          <input
                            type="number"
                            name="quantity"
                            step="0.01"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Đơn giá (nếu có)</label>
                          <input
                            type="number"
                            name="unitPrice"
                            step="1"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowExportForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        Thêm phiếu xuất
                      </button>
                    </div>
                  </form>
                )}

                <table className="w-full border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người nhận</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diễn giải</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {draftExports.length > 0 ? (
                      draftExports.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {dayjs(item.docDate).format("DD/MM/YYYY")}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.supplierName || "-"}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.notes || "-"}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">
                            {Number(item.totalAmount || 0).toLocaleString("vi-VN")} ₫
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteExport(item.id)}
                              className="text-red-600 hover:text-red-900"
                              type="button"
                            >
                              <TrashIcon className="h-5 w-5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                          Chưa có phiếu xuất hàng
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 7: Inventory (Kiểm kê) */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Phiếu Kiểm Kê</h3>

                {isShiftOpen && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowInventoryForm(!showInventoryForm)}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Tạo phiếu kiểm kê
                    </button>
                  </div>
                )}

                {showInventoryForm && (
                  <form
                    data-form="inventory"
                    onSubmit={handleInventorySubmit}
                    className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm *</label>
                      <select
                        name="productId"
                        required
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho hệ thống</label>
                      <input
                        type="number"
                        name="systemQuantity"
                        step="0.01"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho thực tế *</label>
                      <input
                        type="number"
                        name="actualQuantity"
                        step="0.01"
                        required
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diễn giải</label>
                      <input
                        type="text"
                        name="notes"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Diễn giải thêm..."
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowInventoryForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Lưu phiếu kiểm kê
                      </button>
                    </div>
                  </form>
                )}

                <table className="w-full border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tồn hệ thống</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thực tế</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chênh lệch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diễn giải</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {draftInventoryChecks.length > 0 ? (
                      draftInventoryChecks.map((item) => {
                        const product = products?.find((p) => p.id === item.productId);
                        return (
                          <tr key={item.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">{product?.name || "N/A"}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900">
                              {Number(item.systemQuantity || 0).toLocaleString("vi-VN")}
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900">
                              {Number(item.actualQuantity || 0).toLocaleString("vi-VN")}
                            </td>
                            <td
                              className={`px-6 py-4 text-sm text-right font-semibold ${
                                item.difference < 0 ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {Number(item.difference || 0).toLocaleString("vi-VN")}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{item.notes || "-"}</td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteInventory(item.id)}
                                className="text-red-600 hover:text-red-900"
                                type="button"
                              >
                                <TrashIcon className="h-5 w-5 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                          Chưa có phiếu kiểm kê
                        </td>
                      </tr>
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
              <strong>⚠️ Lưu ý:</strong> Kiểm tra lại số cột bơm và thông tin các phiếu truớc khi chốt ca. Bấm "Chốt ca"
              để lưu toàn bộ dữ liệu.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600">Thu tiền (thanh toán nợ)</p>
              <p className="text-xl font-bold text-blue-600">{totalReceipts.toLocaleString("vi-VN")} ₫</p>
              <p className="text-xs text-gray-500">({draftReceipts.length} phiếu)</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <p className="text-sm text-gray-600">Nộp về công ty</p>
              <p className="text-xl font-bold text-red-600">{totalDeposits.toLocaleString("vi-VN")} ₫</p>
              <p className="text-xs text-gray-500">({draftDeposits.length} phiếu)</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-gray-600">Biến động tiền trong ca (dự tính)</p>
              <p className="text-xl font-bold text-purple-600">
                {(totalRetailSales + totalReceipts - totalDeposits).toLocaleString("vi-VN")} ₫
              </p>
              <p className="text-xs text-gray-500">Bán lẻ + Thu - Nộp</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600">Số dư quỹ hiện tại</p>
              <p className="text-xl font-bold text-green-600">
                {(report?.summary?.actualCashBalance !== undefined
                  ? report.summary.actualCashBalance
                  : report?.summary?.cashBalance || 0
                ).toLocaleString("vi-VN")}{" "}
                ₫
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
