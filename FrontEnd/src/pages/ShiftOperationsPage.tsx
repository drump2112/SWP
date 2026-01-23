import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { usePageTitle } from '../hooks/usePageTitle';
import {
  shiftsApi,
  type ShiftDebtSaleDto,
  type CashDepositDto,
  type CreateReceiptDto,
  type PumpReadingDto,
  type CloseShiftDto,
} from "../api/shifts";
import { customersApi } from "../api/customers";
import { usersApi } from "../api/users";
import { productsApi } from "../api/products";
import { pumpsApi } from "../api/pumps";
import { storesApi } from "../api/stores";
import { inventoryApi } from "../api/inventory";
import { tanksApi } from "../api/tanks"; // ✅ Import tanksApi
import { useAuth } from "../contexts/AuthContext";
import { showConfirm } from "../utils/sweetalert";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import SearchableSelect from "../components/SearchableSelect";
import TruckInventoryImportForm, {
  type InventoryImportFormData,
} from "../components/TruckInventoryImportForm";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { exportInventoryCheckExcel, type InventoryCheckRow, type InventoryCheckExportData } from "../utils/excel";

// Helper function để xử lý phím Enter - chuyển focus sang input tiếp theo
const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
  if (e.key === "Enter") {
    const target = e.target as HTMLElement;
    // Không xử lý nếu đang ở textarea hoặc button submit
    if (target.tagName === "TEXTAREA" || (target.tagName === "BUTTON" && (target as HTMLButtonElement).type === "submit")) {
      return;
    }

    e.preventDefault();

    const form = e.currentTarget;
    // Lấy tất cả các input, select, textarea có thể focus được
    const focusableElements = Array.from(
      form.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      )
    ).filter((el) => {
      // Loại bỏ các element bị ẩn
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
    });

    const currentIndex = focusableElements.indexOf(target as HTMLElement);

    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
      // Chuyển sang element tiếp theo
      const nextElement = focusableElements[currentIndex + 1];
      nextElement.focus();
      // Nếu là input, select all text
      if (nextElement.tagName === "INPUT") {
        (nextElement as HTMLInputElement).select();
      }
    } else if (currentIndex === focusableElements.length - 1) {
      // Nếu đang ở element cuối cùng, submit form
      const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
      }
    }
  }
};

const ShiftOperationsPage: React.FC = () => {
  usePageTitle('Thao tác ca');
  const { shiftId } = useParams<{ shiftId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditModeFromUrl = searchParams.get("mode") === "edit";
  const [isEditingComplete, setIsEditingComplete] = useState(false);
  // isEditMode = true chỉ khi có mode=edit VÀ chưa hoàn thành cập nhật
  const isEditMode = isEditModeFromUrl && !isEditingComplete;
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "pump" | "debt" | "receipt" | "deposit" | "import" | "export" | "inventory"
  >("pump");
  const [showDebtSaleForm, setShowDebtSaleForm] = useState(false);
  const [debtSaleFormQuantity, setDebtSaleFormQuantity] = useState<number>(0);
  const [debtSaleFormAmount, setDebtSaleFormAmount] = useState<number>(0);
  const [isAmountManuallyEntered, setIsAmountManuallyEntered] = useState(false); // Flag để biết người dùng đã nhập thành tiền thủ công
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showExportForm, setShowExportForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [pumpReadings, setPumpReadings] = useState<Record<number, PumpReadingDto>>({});
  const [productPrices, setProductPrices] = useState<Record<number, number>>({});
  const [debtSaleFormPrice, setDebtSaleFormPrice] = useState<number>(0);
  const [declaredRetailQuantities, setDeclaredRetailQuantities] = useState<Record<number, number>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasPreviousShift, setHasPreviousShift] = useState(false);

  // State cho SearchableSelect
  const [selectedDebtCustomer, setSelectedDebtCustomer] = useState<number | null>(null);
  const [selectedDebtProduct, setSelectedDebtProduct] = useState<number | null>(null);
  const [selectedReceiptCustomer, setSelectedReceiptCustomer] = useState<number | null>(null);

  // State cho Người Giao và Người Nhận
  const [handoverUserId, setHandoverUserId] = useState<number | null>(null);
  const [receiverUserId, setReceiverUserId] = useState<number | null>(null);

  // Editing state
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editingImportId, setEditingImportId] = useState<string | null>(null);
  const [editingDebtSaleId, setEditingDebtSaleId] = useState<string | null>(null);
  const [hasLoadedReportData, setHasLoadedReportData] = useState(false); // Flag để track đã load data từ report chưa

  // Draft Mode: Store all data until shift close
  const [draftDebtSales, setDraftDebtSales] = useState<Array<ShiftDebtSaleDto & { id: string }>>([]);
  const [draftReceipts, setDraftReceipts] = useState<Array<CreateReceiptDto & { id: string }>>([]);
  const [draftDeposits, setDraftDeposits] = useState<Array<CashDepositDto & { id: string }>>([]);
  // TODO: Define types for Import/Export
  const [draftImports, setDraftImports] = useState<any[]>([]);
  const [draftExports, setDraftExports] = useState<any[]>([]);
  const [draftInventoryChecks, setDraftInventoryChecks] = useState<any[]>([]);

  // State cho kiểm kê tồn kho - form mới theo mẫu Excel
  const [inventoryCheckData, setInventoryCheckData] = useState<Record<number, {
    heightTotal: number;        // Chiều cao chung (mm)
    heightWater: number;        // Chiều cao nước (mm)
    actualStock: number;        // Tồn thực tế (lít)
    bookStock?: number;         // Tồn sổ sách (có thể sửa)
  }>>({}); // tankId -> data bể
  const [pumpMeterReadings, setPumpMeterReadings] = useState<Record<number, number>>({}); // pumpId -> số máy điện tử
  const [inventoryReason, setInventoryReason] = useState("");      // Nguyên nhân
  const [inventoryConclusion, setInventoryConclusion] = useState(""); // Kiến nghị/kết luận
  const [inventoryMember1, setInventoryMember1] = useState("");    // Thành viên 1
  const [inventoryMember2, setInventoryMember2] = useState("");    // Thành viên 2

  // Legacy state (giữ lại để tương thích)
  const [checkpointReadings, setCheckpointReadings] = useState<Record<number, number>>({}); // pumpId -> meterValue
  const [checkpointStocks, setCheckpointStocks] = useState<Record<number, number>>({}); // tankId -> actualQuantity
  const [checkpointNotes, setCheckpointNotes] = useState("");

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

  // Kết hợp khách hàng: EXTERNAL (tất cả) + INTERNAL (chỉ của cửa hàng)
  const debtCustomers = React.useMemo(() => {
    if (!customers) return [];

    const externalCustomers = customers.filter((c: any) => c.type === 'EXTERNAL' || !c.type);
    const internalCustomers = storeCustomers?.filter((c: any) => c.type === 'INTERNAL') || [];

    return [...externalCustomers, ...internalCustomers];
  }, [customers, storeCustomers]);

  // Tìm khách hàng INTERNAL (cửa hàng trưởng) để gán bán lẻ thực tế
  const retailCustomer = React.useMemo(() => {
    return storeCustomers?.find((c: any) => c.type === 'INTERNAL') || null;
  }, [storeCustomers]);

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

  // ✅ Fetch tanks để hiển thị tên bể trong bảng nhập hàng
  const { data: tanks } = useQuery({
    queryKey: ["tanks", report?.shift.storeId],
    queryFn: async () => {
      if (!report?.shift.storeId) return [];
      return tanksApi.getByStore(report.shift.storeId);
    },
    enabled: !!report?.shift.storeId,
  });

  // ✅ Fetch checkpoints (kiểm kê giữa ca)
  const { data: checkpoints, refetch: refetchCheckpoints } = useQuery({
    queryKey: ["checkpoints", shiftId],
    queryFn: async () => {
      if (!shiftId) return [];
      return shiftsApi.getCheckpoints(Number(shiftId));
    },
    enabled: !!shiftId,
  });

  // Fetch users cho select Người Giao/Nhận
  const { data: storeUsers, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ["users", report?.shift.storeId],
    queryFn: async () => {
      if (!report?.shift.storeId) return [];
      return usersApi.getByStore(report.shift.storeId);
    },
    enabled: !!report?.shift.storeId,
  });

  // Debug users loading
  React.useEffect(() => {
    if (usersError) {
      console.error("❌ Error loading users:", usersError);
    }
    if (storeUsers) {
      console.log("✅ Loaded store users:", storeUsers.length, storeUsers);
    }
  }, [storeUsers, usersError]);

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
        // Làm tròn từng vòi bơm để tránh sai số tích lũy
        totalPumpSales += Math.round(net * price);
      }
    });

    const totalDebtSales = draftDebtSales.reduce(
      (sum, ds) => sum + (ds.amount ?? Math.round(ds.quantity * ds.unitPrice)),
      0
    );
    const totalRetail = Math.max(0, totalPumpSales - totalDebtSales);

    // Trừ đi các khoản đã nộp (thủ công) để gợi ý số còn lại.
    // Lưu ý: Các khoản nộp tự động từ phiếu thu (receipt-*) không trừ vì chúng có nguồn tiền riêng (Thu nợ), không phải từ Bán lẻ xăng dầu.
    const existingManualDeposits = draftDeposits
      .filter((d) => !String(d.id).startsWith("receipt-"))
      .reduce((sum, d) => sum + d.amount, 0);

    // Lấy phần nguyên (không lấy số lẻ)
    return Math.floor(Math.max(0, totalRetail - existingManualDeposits));
  }, [pumpReadings, draftDebtSales, productPrices, draftDeposits]);

  // Initialize pump readings
  useEffect(() => {
    if (!pumps || pumps.length === 0) {
      return;
    }

    // ✅ QUAN TRỌNG: Check Edit Mode TRƯỚC - không fetch previous readings khi sửa ca
    // Vì Edit Mode sẽ load dữ liệu từ report, không cần fetch số từ ca trước
    if (isEditMode) {
      console.log("⏭️ Skip fetching previous readings - Edit Mode");
      return;
    }

    // Chỉ chạy cho ca đang OPEN (chưa chốt)
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
            pumpId: pump.id, // ✅ Thêm pumpId để query tankId
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
            pumpId: pump.id, // ✅ Thêm pumpId để query tankId
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
  }, [pumps, report?.shift.status, shiftId, isEditMode]);

  // Initialize handoverName và receiverName từ report
  useEffect(() => {
    if (report?.shift) {
      // Tìm user tương ứng để set value cho select
      const handoverUser = storeUsers?.find((u) => u.fullName === report.shift.handoverName);
      const receiverUser = storeUsers?.find((u) => u.fullName === report.shift.receiverName);
      setHandoverUserId(handoverUser?.id || null);
      setReceiverUserId(receiverUser?.id || null);
    }
  }, [report, storeUsers]);

  // Initialize data for both CLOSED (view mode) and Edit Mode
  useEffect(() => {
    console.log("🔍 useEffect [Load Report Data] triggered:", {
      hasReport: !!report,
      hasPumps: !!pumps && pumps.length > 0,
      isEditMode,
      hasLoadedReportData,
      shiftStatus: report?.shift?.status,
      closedAt: report?.shift?.closedAt,
    });

    if (!report || !pumps || pumps.length === 0) return;

    // Xác định đây có phải là ca đã từng chốt không
    const wasClosedBefore = !!report.shift.closedAt;

    // Skip if shift is OPEN and NEVER been closed (fresh shift with no data)
    if (report.shift.status === "OPEN" && !wasClosedBefore) {
      console.log("⏭️ Skip loading - fresh OPEN shift (never closed)");
      return;
    }

    // Nếu đã load data từ report rồi, không load lại (tránh overwrite user edits)
    if (hasLoadedReportData) {
      console.log("⏭️ Skip loading - already loaded report data");
      return;
    }

    console.log("📦 Loading data from report for edit/view mode...", {
      cashDeposits: report.cashDeposits?.length || 0,
      receipts: report.receipts?.length || 0
    });

    // 1. Pump Readings
    const initialReadings: Record<number, PumpReadingDto> = {};
    pumps.forEach((pump: any) => {
      const reportReading = report.pumpReadings.find((r: any) => r.pumpCode === pump.pumpCode);
      initialReadings[pump.id] = {
        pumpId: pump.id, // ✅ Thêm pumpId để query tankId
        pumpCode: pump.pumpCode,
        productId: pump.productId,
        startValue: reportReading ? Number(reportReading.startValue) : 0,
        endValue: reportReading ? Number(reportReading.endValue) : 0,
        testExport: reportReading ? Number(reportReading.testExport) : 0,
        unitPrice: reportReading ? Number(reportReading.unitPrice) : undefined, // Lưu giá đã chốt
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
          amount: ds.amount ? Number(ds.amount) : Math.round(Number(ds.quantity) * Number(ds.unitPrice)), // Lấy amount đã lưu hoặc tính lại
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
          depositAt: d.depositAt || d.depositDate, // Support both new and old format
          receiverName: d.receiverName,
          notes: d.notes,
          paymentMethod: d.paymentMethod || "CASH",
        }))
      );
    }

    // 5. Initialize Declared Retail Quantities (Step 2 - Auto Calculate)
    // In edit mode, we assume the previous "Declared" was exactly "Pump - Debt"
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

    // Initialize declaredRetailQuantities from calculation
    const initialDeclared: Record<number, number> = {};
    productIds.forEach((pid) => {
      const pQty = pumpSums[pid] || 0;
      const dQty = debtSums[pid] || 0;
      const retail = Math.max(0, pQty - dQty);
      initialDeclared[pid] = Math.round(retail * 1000) / 1000;
    });
    setDeclaredRetailQuantities(initialDeclared);

    // Đánh dấu đã load data từ report
    setHasLoadedReportData(true);

    if (isEditMode) {
      toast.info("Đang ở chế độ chỉnh sửa ca đã chốt", { position: "top-center", autoClose: 3000 });
    }
  }, [isEditMode, report, pumps, shiftId, hasLoadedReportData]);

  // Fetch prices - Sử dụng thời điểm mở ca để lấy đúng kỳ giá
  useEffect(() => {
    if (!store?.regionId || !pumps || pumps.length === 0) return;

    const fetchPrices = async () => {
      const prices: Record<number, number> = {};
      const uniqueProductIds = [...new Set(pumps.map((p: any) => p.productId))];

      // ✅ QUAN TRỌNG: Sử dụng thời điểm mở ca (openedAt) để lấy giá đúng kỳ giá
      // Nếu ca mở lúc 10h và giá đổi lúc 15h, vẫn lấy giá của kỳ 10h
      const priceReferenceTime = report?.shift?.openedAt
        ? new Date(report.shift.openedAt)
        : undefined;

      console.log(`📊 Lấy giá tại thời điểm: ${priceReferenceTime?.toISOString() || 'hiện tại'}`);

      for (const productId of uniqueProductIds) {
        try {
          const priceData = await productsApi.getCurrentPrice(productId, store.regionId, priceReferenceTime);
          prices[productId] = Number(priceData.price);
        } catch (error) {
          console.error(`❌ Failed to fetch price for product ${productId}:`, error);
          prices[productId] = 0;
        }
      }

      setProductPrices(prices);
    };

    fetchPrices();
  }, [store, pumps, report?.shift?.openedAt]);

  // Load phiếu nhập kho của ca (nếu có) - load khi xem chi tiết, edit mode
  // Chỉ KHÔNG load khi ca thực sự đang OPEN (chưa từng chốt)
  useEffect(() => {
    if (!shiftId || !report) return;

    // Nếu đang ở edit mode (mode=edit trong URL) thì luôn load
    // Nếu không phải edit mode và ca đang OPEN thì không load (chưa có gì trong DB)
    const shouldLoad = isEditModeFromUrl || report.shift.status !== "OPEN";
    if (!shouldLoad) {
      console.log("📦 Skip loading imports - shift is OPEN and not in edit mode");
      return;
    }

    const loadImportDocuments = async () => {
      try {
        const documents = await inventoryApi.getDocumentsByShift(Number(shiftId));
        console.log("📦 API returned documents:", documents);
        if (documents && documents.length > 0) {
          // Map từ format DB sang format đơn giản
          const mappedImports = documents.map((doc: any) => {
            // Ưu tiên lấy từ items, fallback sang compartments
            const firstItem = doc.items?.[0];
            const firstCompartment = doc.compartments?.[0];
            return {
              id: doc.id,
              docAt: doc.docAt || doc.docDate,
              supplierName: doc.supplierName,
              licensePlate: doc.licensePlate,
              driverName: doc.driverName,
              productId: firstItem?.productId || firstCompartment?.productId || doc.productId,
              quantity: firstItem?.quantity || doc.totalVolume || firstCompartment?.receivedVolume || 0,
              notes: doc.notes,
            };
          });
          setDraftImports(mappedImports);
          console.log(`✅ Loaded ${mappedImports.length} import document(s) for shift ${shiftId}`, mappedImports);
        } else {
          console.log("📦 No import documents found for shift", shiftId);
          setDraftImports([]);
        }
      } catch (error) {
        console.error("❌ Failed to load import documents:", error);
      }
    };

    loadImportDocuments();
  }, [shiftId, report?.shift.status, isEditModeFromUrl]);

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
      toast.success("Đã chốt ca thành công!", {
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
    onSuccess: async () => {
      // Reset flag để cho phép load lại data từ report mới
      setHasLoadedReportData(false);
      // Refetch ngay lập tức để cập nhật UI
      await queryClient.refetchQueries({ queryKey: ["shift-report", shiftId] });
      await queryClient.invalidateQueries({ queryKey: ["shifts"] });
      // Clear localStorage
      if (shiftId) {
        const draftKey = `shift_${shiftId}_draft_data`;
        localStorage.removeItem(draftKey);
      }
      // Đánh dấu đã hoàn thành cập nhật - tắt chế độ sửa
      setIsEditingComplete(true);
      // Xóa mode=edit khỏi URL
      setSearchParams({});
      toast.success(" Đã cập nhật ca thành công! Ca đã được chốt lại.", {
        position: "top-right",
        autoClose: 5000,
      });
      // Không navigate đi, ở lại trang để xem kết quả
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

    // Làm tròn để tránh sai số thập phân
    const amount = Math.round(quantity * price);
    return isNaN(amount) ? 0 : amount;
  };

  const handleCloseShift = async () => {
    const readingsArray = Object.values(pumpReadings);

    // Tính toán trước để dùng cho validation
    const totalLiters = readingsArray.reduce((sum, r) => sum + (r.endValue - r.startValue), 0);
    const totalAmount = calculateTotalFromPumps();
    const draftDebtTotal = draftDebtSales.reduce(
      (sum, ds) => sum + (ds.amount ?? Math.round(ds.quantity * ds.unitPrice)),
      0
    );
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

    // Validation 1.5: Kiểm tra có giá cho tất cả mặt hàng
    const missingPrices = readingsArray.filter((r) => !productPrices[r.productId] || productPrices[r.productId] === 0);
    if (missingPrices.length > 0) {
      toast.error("Có mặt hàng chưa có giá bán. Vui lòng cập nhật bảng giá trước khi chốt ca.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Validation 1.6: Kiểm tra bắt buộc chọn Người Giao và Người Nhận
    if (!handoverUserId) {
      toast.error("Vui lòng chọn Người Giao trước khi chốt ca!", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!receiverUserId) {
      toast.error("Vui lòng chọn Người Nhận trước khi chốt ca!", {
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
        toast.error(`Vui lòng nhập "Bán lẻ thực tế" cho mặt hàng ${product?.name || productId} ở Tab 2!`, {
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

    // Tạo retailSales từ declaredRetailQuantities cho khách hàng nội bộ
    const retailSalesData = retailCustomer
      ? Object.entries(declaredRetailQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([productIdStr, quantity]) => ({
            customerId: retailCustomer.id,
            productId: Number(productIdStr),
            quantity: quantity,
            unitPrice: productPrices[Number(productIdStr)] || 0,
          }))
      : [];

    const dto: CloseShiftDto = {
      shiftId: Number(shiftId),
      closedAt: closedAt ? new Date(closedAt).toISOString() : undefined,
      pumpReadings: readingsArray.map(({ unitPrice, ...rest }) => rest),
      debtSales: draftDebtSales.map((ds) => ({
        id: String(ds.id).startsWith("draft_") ? undefined : ds.id,
        shiftId: Number(shiftId),
        customerId: ds.customerId,
        productId: ds.productId,
        quantity: ds.quantity,
        unitPrice: ds.unitPrice,
        amount: ds.amount ?? Math.round(ds.quantity * ds.unitPrice), // Gửi amount đã lưu hoặc tính lại
        notes: ds.notes,
      })),
      retailSales: retailSalesData, // Bán lẻ cho khách hàng nội bộ
      receipts: draftReceipts.map((r) => ({
        id: String(r.id).startsWith("draft_") ? undefined : r.id,
        storeId: r.storeId || report?.shift.storeId || user?.storeId || 0,
        shiftId: Number(shiftId),
        receiptType: r.receiptType,
        amount: r.amount,
        details: r.details,
        notes: r.notes,
        paymentMethod: r.paymentMethod || "CASH",
      })),
      deposits: draftDeposits.map((d) => ({
        id: String(d.id).startsWith("draft_") || String(d.id).startsWith("receipt-") ? undefined : d.id,
        storeId: d.storeId || report?.shift.storeId || user?.storeId || 0,
        shiftId: Number(shiftId),
        amount: d.amount,
        depositAt: d.depositAt,
        receiverName: d.receiverName,
        notes: d.notes,
        paymentMethod: d.paymentMethod || "CASH",
        sourceType: d.sourceType, // RETAIL hoặc RECEIPT để phân biệt nguồn gốc
      })),
      inventoryImports: draftImports.map((imp) => {
        // Xử lý id: draft_ = undefined, doc_123 = 123, number = number
        let importId: number | undefined = undefined;
        const idStr = String(imp.id);
        if (idStr.startsWith("draft_")) {
          importId = undefined;
        } else if (idStr.startsWith("doc_")) {
          importId = Number(idStr.replace("doc_", ""));
        } else if (!isNaN(Number(imp.id))) {
          importId = Number(imp.id);
        }
        return {
          id: importId,
          docAt: imp.docAt,
          supplierName: imp.supplierName,
          licensePlate: imp.licensePlate,
          driverName: imp.driverName,
          productId: imp.productId,
          tankId: imp.tankId, // ✅ Thêm tankId
          quantity: imp.quantity,
          notes: imp.notes,
        };
      }),
      handoverName: handoverUserId ? storeUsers?.find((u) => u.id === handoverUserId)?.fullName : undefined,
      receiverName: receiverUserId ? storeUsers?.find((u) => u.id === receiverUserId)?.fullName : undefined,
    };

    console.log("🚀 Submitting shift data:", {
      isEditMode,
      depositsCount: dto.deposits?.length,
      receiptsCount: dto.receipts?.length,
      draftDepositsState: draftDeposits,
      dto,
    });

    if (isEditMode) {
      console.log("📝 Calling updateShiftMutation...");
      updateShiftMutation.mutate(dto);
    } else {
      console.log("📝 Calling closeShiftMutation...");
      closeShiftMutation.mutate(dto);
    }
  };

  const handleDebtSaleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Lấy dữ liệu TRƯỚC khi async call (tránh event bị cleanup)
    const form = e.currentTarget;
    const formData = new FormData(form);
    const quantity = Number(formData.get("quantity"));

    // Làm tròn amount để tránh số lẻ thập phân
    // Nếu người dùng đã nhập thành tiền thủ công, dùng giá trị đó
    // Nếu không, tính từ quantity * price
    const amount = Math.round(debtSaleFormAmount) || Math.round(quantity * debtSaleFormPrice);

    console.log("💰 Debt Sale Submit:", {
      quantity,
      unitPrice: debtSaleFormPrice,
      debtSaleFormAmount,
      calculatedAmount: amount,
      isAmountManuallyEntered,
      isEditing: !!editingDebtSaleId,
    });

    const data: ShiftDebtSaleDto & { id: string } = {
      id: editingDebtSaleId || `draft_${Date.now()}`, // Use existing ID if editing
      shiftId: Number(shiftId),
      customerId: Number(formData.get("customerId")),
      productId: Number(formData.get("productId")),
      quantity,
      unitPrice: debtSaleFormPrice,
      amount, // Gửi số tiền gốc (tránh sai số làm tròn)
      notes: (formData.get("notes") as string) || undefined,
    };

    // Lưu vào draft state - update nếu đang sửa, thêm mới nếu không
    if (editingDebtSaleId) {
      setDraftDebtSales((prev) => prev.map((item) => (item.id === editingDebtSaleId ? data : item)));
      toast.success("Đã cập nhật doanh số", { position: "top-right", autoClose: 3000 });
    } else {
      setDraftDebtSales((prev) => [...prev, data]);
      toast.success("Đã thêm vào danh sách công nợ", { position: "top-right", autoClose: 3000 });
    }
    
    setShowDebtSaleForm(false);
    form.reset();
    setDebtSaleFormPrice(0);
    setDebtSaleFormQuantity(0);
    setDebtSaleFormAmount(0);
    setIsAmountManuallyEntered(false);
    setSelectedDebtCustomer(null);
    setSelectedDebtProduct(null);
    setEditingDebtSaleId(null);
  };

  const handleReceiptSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerId = Number(formData.get("customerId"));
    const amount = Number(formData.get("amount"));
    const notes = (formData.get("notes") as string) || undefined;
    const paymentMethod = (formData.get("paymentMethod") as string) || "CASH";
    const receiptAt = formData.get("receiptAt") as string;

    // Validate thời gian
    if (!receiptAt) {
      toast.error("Vui lòng nhập thời gian thu tiền!", { position: "top-right", autoClose: 3000 });
      return;
    }

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
              receiptAt,
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
                // Sử dụng receiptAt cho depositAt
                const depositAt = receiptAt || dayjs().format("YYYY-MM-DDTHH:mm");
                return {
                  ...d,
                  amount,
                  depositAt,
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
          const depositAt = receiptAt || dayjs().format("YYYY-MM-DDTHH:mm");
          return [
            ...prev,
            {
              id: linkedId,
              storeId: user?.storeId || report?.shift.storeId || 0,
              shiftId: Number(shiftId),
              amount,
              depositAt,
              receiverName: "Công ty SWP",
              notes: `Nộp tiền thu từ khách hàng (Phiếu thu #${editingReceiptId})`,
              paymentMethod: "CASH",
              sourceType: 'RECEIPT', // Từ phiếu thu - KHÔNG ghi CREDIT cho khách nội bộ
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
        receiptAt,
      };
      // Lưu vào draft state thay vì API
      setDraftReceipts((prev) => [...prev, data]);

      // Tự động tạo phiếu nộp (Deposit) tương ứng nếu là tiền mặt
      if (paymentMethod === "CASH") {
        const depositAt = receiptAt || dayjs().format("YYYY-MM-DDTHH:mm");
        const depositData: CashDepositDto & { id: string } = {
          id: `receipt-${receiptId}`, // ID liên kết đặc biệt
          storeId: user?.storeId || report?.shift.storeId || 0,
          shiftId: Number(shiftId),
          amount,
          depositAt,
          receiverName: "Công ty SWP",
          notes: `Nộp tiền thu từ khách hàng (Phiếu thu mới)`,
          paymentMethod: "CASH",
          sourceType: 'RECEIPT', // Từ phiếu thu - KHÔNG ghi CREDIT cho khách nội bộ
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
    console.log("📝 handleDepositSubmit called");
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const depositAt = formData.get("depositAt") as string;
    const receiverName = (formData.get("receiverName") as string) || undefined;
    const notes = (formData.get("notes") as string) || undefined;
    const paymentMethod = (formData.get("paymentMethod") as string) || "CASH";

    console.log("📝 Deposit data:", { amount, depositAt, receiverName, notes, paymentMethod, editingDepositId });

    // Validate ngày giờ
    if (!depositAt) {
      toast.error("Vui lòng nhập ngày giờ nộp tiền!", { position: "top-right", autoClose: 3000 });
      return;
    }

    if (editingDepositId) {
      setDraftDeposits((prev) =>
        prev.map((item) => {
          if (item.id === editingDepositId) {
            return {
              ...item,
              amount,
              depositAt,
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
        depositAt,
        receiverName,
        notes,
        paymentMethod,
        sourceType: 'RETAIL', // Phiếu nộp thủ công = từ tiền bán lẻ → ghi CREDIT cho khách nội bộ
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

  const handleEditImport = (importItem: any) => {
    setEditingImportId(importItem.id);
    setShowImportForm(true);
  };

  const handleDeleteDebtSale = async (id: string) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa doanh số này?", "Xác nhận xóa");
    if (confirmed) {
      setDraftDebtSales((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xóa khỏi danh sách", { position: "top-right", autoClose: 3000 });
    }
  };

  const handleEditDebtSale = (sale: ShiftDebtSaleDto & { id: string }) => {
    // Set form values from the sale being edited
    setSelectedDebtCustomer(sale.customerId);
    setSelectedDebtProduct(sale.productId);
    setDebtSaleFormQuantity(sale.quantity);
    setDebtSaleFormPrice(sale.unitPrice);
    setDebtSaleFormAmount(sale.amount ?? Math.round(sale.quantity * sale.unitPrice));
    setEditingDebtSaleId(sale.id);
    setShowDebtSaleForm(true);
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

  // ✅ Xử lý phiếu nhập hàng - CHỈ lưu vào draft state (giống các phiếu khác)
  const handleImportSubmit = (formData: InventoryImportFormData) => {
    if (!formData.productId || formData.productId <= 0) {
      toast.error("Vui lòng chọn sản phẩm");
      return;
    }

    // ✅ Validate tankId
    if (!formData.tankId || formData.tankId <= 0) {
      toast.error("Vui lòng chọn bể để nhập hàng");
      return;
    }

    if (!formData.quantity || formData.quantity <= 0) {
      toast.error("Vui lòng nhập số lượng hợp lệ");
      return;
    }

    // Nếu đang edit, cập nhật item
    if (editingImportId) {
      setDraftImports((prev) =>
        prev.map((item) => {
          if (item.id === editingImportId) {
            return {
              ...item,
              docAt: formData.docAt,
              supplierName: formData.supplierName,
              licensePlate: formData.licensePlate,
              driverName: formData.driverName,
              productId: formData.productId,
              tankId: formData.tankId, // ✅ Thêm tankId
              quantity: formData.quantity,
              notes: formData.notes,
            };
          }
          return item;
        })
      );
      toast.success("Đã cập nhật phiếu nhập", { position: "top-right", autoClose: 3000 });
    } else {
      // Thêm mới vào draft
      const newItem = {
        id: `draft_${Date.now()}`,
        docAt: formData.docAt,
        supplierName: formData.supplierName,
        licensePlate: formData.licensePlate,
        driverName: formData.driverName,
        productId: formData.productId,
        tankId: formData.tankId, // ✅ Thêm tankId
        quantity: formData.quantity,
        notes: formData.notes,
      };
      setDraftImports((prev) => [...prev, newItem]);
      toast.success("Đã thêm vào danh sách nhập hàng (chưa lưu vào database)", {
        position: "top-right",
        autoClose: 3000,
      });
    }

    setShowImportForm(false);
    setEditingImportId(null);
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
      toast.error("Vui lòng chọn mặt hàng", { position: "top-right", autoClose: 3000 });
      return;
    }

    if (quantity <= 0) {
      toast.error("Số lượng phải lớn hơn 0", { position: "top-right", autoClose: 3000 });
      return;
    }

    const amount = Math.round(quantity * unitPrice); // Làm tròn để tránh số lẻ thập phân

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
      toast.success("Đã xóa phiếu nhập", { position: "top-right", autoClose: 3000 });
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
      // Ưu tiên dùng giá đã lưu (unitPrice) khi xem ca đã chốt, fallback sang giá hiện tại khi đang nhập liệu
      const price = reading.unitPrice ?? productPrices[reading.productId] ?? 0;
      // Làm tròn từng vòi bơm để tránh sai số tích lũy
      total += Math.round(quantity * price);
    });
    return total;
  };

  // Tính toán từ draft data (không dùng report API data nữa)
  // const totalDebtSales = draftDebtSales.reduce((sum, sale) => sum + sale.quantity * sale.unitPrice, 0); // Moved down
  const totalReceipts = draftReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalDeposits = draftDeposits.reduce((sum, d) => sum + d.amount, 0);

  // Tính toán real-time
  const totalFromPumps = calculateTotalFromPumps();
  // Sử dụng amount đã lưu (tránh sai số làm tròn), fallback nếu chưa có
  const totalDebtSales = draftDebtSales.reduce(
    (sum, sale) => sum + (sale.amount ?? Math.round(sale.quantity * sale.unitPrice)),
    0
  );
  const totalRetailSales = Math.floor(totalFromPumps) - totalDebtSales;
  const totalRevenue = Math.floor(totalFromPumps); // Tổng doanh thu = Tổng từ vòi bơm (bao gồm cả bán lẻ và bán công nợ)

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
    isEditMode,
    isEditModeFromUrl,
    isEditingComplete,
    canEdit,
    hasLoadedReportData,
    activeTab,
    shiftStatus: report?.shift.status,
    receiptsCount: isShiftOpen ? draftReceipts.length : report?.receipts?.length || 0,
    depositsCount: isShiftOpen ? draftDeposits.length : report?.cashDeposits?.length || 0,
  });

  // Tab navigation helpers
  const tabs = ["pump", "debt", "receipt", "deposit", "import", "export", "inventory"] as const;
  const currentTabIndex = tabs.indexOf(activeTab);
  const hasPreviousTab = currentTabIndex > 0;
  const hasNextTab = currentTabIndex < tabs.length - 1;

  const goToPreviousTab = async () => {
    if (!hasPreviousTab) return;
    const previousTab = tabs[currentTabIndex - 1];

    if (hasUnsavedChanges) {
      const confirmed = await showConfirm(
        "Bạn có dữ liệu chưa lưu ở tab hiện tại. Chuyển tab sẽ không mất dữ liệu nhưng hãy nhớ lưu trước khi chốt ca.",
        "Xác nhận chuyển tab",
        "warning"
      );
      if (confirmed) setActiveTab(previousTab);
    } else {
      setActiveTab(previousTab);
    }
  };

  const goToNextTab = async () => {
    if (!hasNextTab) return;
    const nextTab = tabs[currentTabIndex + 1];

    // Validation: Nếu đang ở tab "pump", kiểm tra số lít tính toán không được âm
    if (activeTab === "pump") {
      const readingsArray = Object.values(pumpReadings);
      const invalidReadings = readingsArray.filter((reading) => {
        const quantity = calculateQuantity(reading);
        return quantity < 0;
      });

      if (invalidReadings.length > 0) {
        const errorMessages = invalidReadings.map((r) => {
          const pump = pumps?.find((p: any) => p.code === r.pumpCode);
          const product = products?.find((p) => p.id === r.productId);
          const quantity = calculateQuantity(r);
          return `- Vòi ${r.pumpCode} (${product?.name || "N/A"}): ${quantity.toFixed(3)} lít`;
        });

        toast.error(
          <div>
            <div className="font-bold mb-2">⚠️ Số lít tính toán không hợp lệ!</div>
            <div className="text-sm">Các vòi bơm sau có số lít âm:</div>
            <div className="text-sm mt-1 space-y-1">
              {errorMessages.map((msg, idx) => (
                <div key={idx}>{msg}</div>
              ))}
            </div>
            <div className="text-sm mt-2 font-medium">
              Vui lòng kiểm tra lại: Số cuối, Số đầu, và Xuất kiểm thử/Quay kho
            </div>
          </div>,
          {
            position: "top-center",
            autoClose: 8000,
          }
        );
        return;
      }
    }

    // Validation pass → chuyển tab trực tiếp
    setActiveTab(nextTab);
  };

  const tabLabels: Record<typeof tabs[number], string> = {
    pump: "B1 - Số máy cột bơm",
    debt: "B2 - Bán hàng",
    receipt: "B3 - Thu tiền",
    deposit: "B4 - Nộp tiền",
    import: "B5 - Nhập hàng",
    export: "B6 - Xuất hàng",
    inventory: "B7 - Kiểm kê",
  };

  // Tab Navigation Component
  const TabNavigation = () => (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
      <button
        onClick={goToPreviousTab}
        disabled={!hasPreviousTab}
        className={`inline-flex items-center px-4 py-2.5 rounded-lg font-medium transition-all ${
          hasPreviousTab
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
            : "bg-gray-50 text-gray-400 cursor-not-allowed"
        }`}
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        {hasPreviousTab && <span className="text-sm">{tabLabels[tabs[currentTabIndex - 1]]}</span>}
        {!hasPreviousTab && <span className="text-sm">Quay lại</span>}
      </button>

      <div className="text-sm text-gray-500 font-medium">
        Bước {currentTabIndex + 1} / {tabs.length}
      </div>

      <button
        onClick={goToNextTab}
        disabled={!hasNextTab}
        className={`inline-flex items-center px-4 py-2.5 rounded-lg font-medium transition-all ${
          hasNextTab
            ? "bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md"
            : "bg-gray-50 text-gray-400 cursor-not-allowed"
        }`}
      >
        {hasNextTab && <span className="text-sm">{tabLabels[tabs[currentTabIndex + 1]]}</span>}
        {!hasNextTab && <span className="text-sm">Tiếp theo</span>}
        <ArrowRightIcon className="h-5 w-5 ml-2" />
      </button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/shifts")} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Ca #{report?.shift.shiftNo}</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-gray-600">Ngày: {dayjs(report?.shift.shiftDate).format("DD/MM/YYYY")}</p>
                <span className="text-gray-400">•</span>
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

          {/* Người Giao và Người Nhận */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2 min-w-[200px]">
              <label className="text-sm text-gray-700 font-medium">Người Giao</label>
              <SearchableSelect
                options={storeUsers?.map((u) => ({ value: u.id, label: u.fullName })) || []}
                value={handoverUserId}
                onChange={(value) => setHandoverUserId(value as number | null)}
                placeholder="-- Chọn người giao --"
                isClearable
                isDisabled={!canEdit}
              />
            </div>

            <div className="flex flex-col gap-2 min-w-[200px]">
              <label className="text-sm text-gray-700 font-medium">Người Nhận</label>
              <SearchableSelect
                options={storeUsers?.map((u) => ({ value: u.id, label: u.fullName })) || []}
                value={receiverUserId}
                onChange={(value) => setReceiverUserId(value as number | null)}
                placeholder="-- Chọn người nhận --"
                isClearable
                isDisabled={!canEdit}
              />
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
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap relative ${activeTab === "pump"
                  ? "border-blue-500 text-blue-700 bg-blue-50/50 shadow-sm"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                }`}
            >
              B1 - Số máy cột bơm
            </button>
            <button
              onClick={async () => {
                // Validation: Kiểm tra số lít tính toán không được âm trước khi chuyển sang B2
                if (activeTab !== "debt") {
                  const readingsArray = Object.values(pumpReadings);
                  const invalidReadings = readingsArray.filter((reading) => {
                    const quantity = calculateQuantity(reading);
                    return quantity < 0;
                  });

                  if (invalidReadings.length > 0) {
                    const errorMessages = invalidReadings.map((r) => {
                      const pump = pumps?.find((p: any) => p.code === r.pumpCode);
                      const product = products?.find((p) => p.id === r.productId);
                      const quantity = calculateQuantity(r);
                      return `- Vòi ${r.pumpCode} (${product?.name || "N/A"}): ${quantity.toFixed(3)} lít`;
                    });

                    toast.error(
                      <div>
                        <div className="font-bold mb-2">⚠️ Số lít tính toán không hợp lệ!</div>
                        <div className="text-sm">Các vòi bơm sau có số lít âm:</div>
                        <div className="text-sm mt-1 space-y-1">
                          {errorMessages.map((msg, idx) => (
                            <div key={idx}>{msg}</div>
                          ))}
                        </div>
                        <div className="text-sm mt-2 font-medium">
                          Vui lòng quay lại B1 để kiểm tra: Số cuối, Số đầu, và Xuất kiểm thử/Quay kho
                        </div>
                      </div>,
                      {
                        position: "top-center",
                        autoClose: 8000,
                      }
                    );
                    return;
                  }
                }

                // Validation pass → chuyển tab trực tiếp
                setActiveTab("debt");
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap relative ${activeTab === "debt"
                  ? "border-blue-500 text-blue-700 bg-blue-50/50 shadow-sm"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
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
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap relative ${activeTab === "receipt"
                  ? "border-blue-500 text-blue-700 bg-blue-50/50 shadow-sm"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
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
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap relative ${activeTab === "deposit"
                  ? "border-blue-500 text-blue-700 bg-blue-50/50 shadow-sm"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
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
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap relative ${activeTab === "import"
                  ? "border-blue-500 text-blue-700 bg-blue-50/50 shadow-sm"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                }`}
            >
              B5 - Nhập hàng
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
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap relative ${activeTab === "export"
                  ? "border-blue-500 text-blue-700 bg-blue-50/50 shadow-sm"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                }`}
            >
              B6 - Xuất hàng
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
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap relative ${activeTab === "inventory"
                  ? "border-blue-500 text-blue-700 bg-blue-50/50 shadow-sm"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
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
                            Mặt hàng
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
                                    // Nhấn Enter để chuyển sang ô tiếp theo
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const currentInput = e.currentTarget;
                                      const currentRow = currentInput.closest("tr");
                                      const allInputs = Array.from(currentRow?.querySelectorAll('input[type="number"]:not([disabled])') || []) as HTMLInputElement[];
                                      const currentIndex = allInputs.indexOf(currentInput);
                                      const nextInput = allInputs[currentIndex + 1];
                                      if (nextInput) {
                                        nextInput.focus();
                                        nextInput.select();
                                      } else {
                                        // Nếu hết input trong hàng, chuyển sang hàng tiếp theo
                                        const nextRow = currentRow?.nextElementSibling;
                                        const firstInput = nextRow?.querySelector('input[type="number"]:not([disabled])') as HTMLInputElement;
                                        if (firstInput) {
                                          firstInput.focus();
                                          firstInput.select();
                                        }
                                      }
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  disabled={hasPreviousShift}
                                  className={`w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-all ${hasPreviousShift ? "bg-gray-100 cursor-not-allowed text-gray-600" : ""
                                    }`}
                                  placeholder="0.000"
                                  title={
                                    hasPreviousShift ? "Số đầu được tự động lấy từ ca trước và không thể thay đổi" : ""
                                  }
                                  data-field="startValue"
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
                                    // Nhấn Enter để chuyển sang ô tiếp theo
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const currentInput = e.currentTarget;
                                      const currentRow = currentInput.closest("tr");
                                      const allInputs = Array.from(currentRow?.querySelectorAll('input[type="number"]:not([disabled])') || []) as HTMLInputElement[];
                                      const currentIndex = allInputs.indexOf(currentInput);
                                      const nextInput = allInputs[currentIndex + 1];
                                      if (nextInput) {
                                        nextInput.focus();
                                        nextInput.select();
                                      } else {
                                        // Nếu hết input trong hàng, chuyển sang hàng tiếp theo
                                        const nextRow = currentRow?.nextElementSibling;
                                        const firstInput = nextRow?.querySelector('input[type="number"]:not([disabled])') as HTMLInputElement;
                                        if (firstInput) {
                                          firstInput.focus();
                                          firstInput.select();
                                        }
                                      }
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-blue-500 transition-colors"
                                  placeholder="0"
                                  data-field="endValue"
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
                                    // Nhấn Enter để chuyển sang hàng tiếp theo
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const currentInput = e.currentTarget;
                                      const currentRow = currentInput.closest("tr");
                                      const nextRow = currentRow?.nextElementSibling;
                                      const firstInput = nextRow?.querySelector('input[type="number"]:not([disabled])') as HTMLInputElement;
                                      if (firstInput) {
                                        firstInput.focus();
                                        firstInput.select();
                                      }
                                    }
                                  }}
                                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 transition-colors bg-purple-50"
                                  placeholder="0.000"
                                  title="Lượng xuất kiểm thử hoặc quay kho (lít)"
                                  data-field="testExport"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`text-sm font-bold px-3 py-1 rounded-full ${quantity < 0 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
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
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">mặt hàng</th>
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
                          const amount = Math.round(quantity * unitPrice); // Làm tròn để tránh số lẻ thập phân

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
                            {formatCurrency(
                              report?.pumpReadings?.reduce((sum: number, r: any) => {
                                const amount = Number(r.amount || 0) || Math.round(Number(r.quantity || 0) * Number(r.unitPrice || r.price || 0));
                                return sum + amount;
                              }, 0) || 0
                            )}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <TabNavigation />
            </div>
          )}

          {/* Tab 2: Debt Sales */}
          {activeTab === "debt" && (
            <div className="space-y-6 overflow-visible">
              {/* Retail Quantity Verification Section */}
              {canEdit ? (
                <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm overflow-visible">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">⛽ Đối chiếu lượng hàng bán</h3>
                    {retailCustomer ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-sm text-gray-600">Khách nội bộ:</span>
                        <span className="text-sm font-medium text-green-700">{retailCustomer.code} - {retailCustomer.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <span className="text-sm text-yellow-700">⚠️ Chưa có khách hàng nội bộ cho cửa hàng này</span>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                          <th className="px-4 py-2 text-left">mặt hàng</th>
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
                                    step="1"
                                    min="0"
                                    value={declaredRetailQuantities[productId] ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                      if (val < 0) return;
                                      setDeclaredRetailQuantities((prev) => ({
                                        ...prev,
                                        [productId]: val,
                                      }));
                                    }}
                                    className={`w-full px-2 py-1 text-right border rounded focus:ring-2 focus:ring-blue-500 ${!isMatch ? "border-red-300 bg-white" : "border-gray-300"
                                      }`}
                                    placeholder="0.000"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right font-medium">{totalDeclared.toFixed(3)}</td>
                                <td
                                  className={`px-4 py-3 text-right font-bold ${isMatch ? "text-green-600" : "text-red-600"
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
                    * Nhập số lượng bán lẻ thực tế (lít) để đối chiếu. Khi chốt ca, lượng này sẽ được ghi nhận cho khách hàng nội bộ để kiểm soát tiền.
                  </p>
                </div>
              ) : null}

              <div className="border-t pt-6 overflow-visible">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Danh sách bán nợ  </h3>
                {canEdit && (
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        setShowDebtSaleForm(!showDebtSaleForm);
                        if (!showDebtSaleForm) {
                          setDebtSaleFormPrice(0);
                          setDebtSaleFormQuantity(0);
                          setDebtSaleFormAmount(0);
                          setIsAmountManuallyEntered(false);
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
                    onKeyDown={handleFormKeyDown}
                    className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng *</label>
                      <SearchableSelect
                        options={debtCustomers?.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.name}${c.type === 'INTERNAL' ? ' 🏠' : ''}` })) || []}
                        value={selectedDebtCustomer}
                        onChange={(value) => setSelectedDebtCustomer(value as number)}
                        placeholder="-- Chọn khách hàng --"
                        required
                      />
                      <input type="hidden" name="customerId" value={selectedDebtCustomer || ""} required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mặt hàng *</label>
                      <SearchableSelect
                        options={products?.map((p: any) => ({ value: p.id, label: `${p.code} - ${p.name}` })) || []}
                        value={selectedDebtProduct}
                        onChange={(value) => {
                          setSelectedDebtProduct(value as number);
                          if (value && productPrices[value as number]) {
                            setDebtSaleFormPrice(productPrices[value as number]);
                            // Tính lại thành tiền khi đổi mặt hàng - làm tròn
                            setDebtSaleFormAmount(Math.round(debtSaleFormQuantity * productPrices[value as number]));
                          } else {
                            setDebtSaleFormPrice(0);
                            setDebtSaleFormAmount(0);
                          }
                        }}
                        placeholder="-- Chọn mặt hàng --"
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
                          // Chỉ tính lại amount nếu người dùng ĐANG nhập số lượng (không phải từ nhập thành tiền)
                          // Reset flag vì người dùng đang nhập số lượng trực tiếp
                          setIsAmountManuallyEntered(false);
                          setDebtSaleFormAmount(Math.round(qty * debtSaleFormPrice));
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
                        placeholder="Tự động theo mặt hàng"
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
                          // Làm tròn số tiền ngay khi nhập
                          setDebtSaleFormAmount(Math.round(amount));
                          // Đánh dấu người dùng đã nhập thành tiền thủ công
                          setIsAmountManuallyEntered(true);
                          if (debtSaleFormPrice > 0) {
                            const rawQty = amount / debtSaleFormPrice;
                            // Lấy 3 số sau dấu phẩy và không làm tròn (truncate)
                            setDebtSaleFormQuantity(Math.floor(rawQty * 1000) / 1000);
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
                          setIsAmountManuallyEntered(false);
                          setSelectedDebtCustomer(null);
                          setSelectedDebtProduct(null);
                          setEditingDebtSaleId(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        {editingDebtSaleId ? "Cập nhật" : "Thêm vào danh sách"}
                      </button>
                    </div>
                  </form>
                )}
                <table className="w-full border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mặt hàng</th>
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
                          const customer = debtCustomers?.find((c) => c.id === sale.customerId);
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
                                {(sale.amount ?? Math.round(sale.quantity * sale.unitPrice)).toLocaleString("vi-VN")} ₫
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleEditDebtSale(sale)}
                                  className="text-blue-600 hover:text-blue-900 mr-2"
                                  type="button"
                                  title="Sửa"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDebtSale(sale.id)}
                                  className="text-red-600 hover:text-red-900"
                                  type="button"
                                  title="Xóa"
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
                  {/* Dòng tổng cộng */}
                  {((canEdit && draftDebtSales.length > 0) || (!canEdit && report?.debtSales && report.debtSales.length > 0)) && (
                    <tfoot className="bg-orange-50 border-t-2 border-orange-200">
                      <tr>
                        <td colSpan={2} className="px-6 py-3 text-sm font-bold text-gray-900 uppercase">
                          Tổng cộng
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                          {(canEdit
                            ? draftDebtSales.reduce((sum, sale) => sum + Number(sale.quantity), 0)
                            : (report?.debtSales || []).reduce((sum: number, sale: any) => sum + Number(sale.quantity), 0)
                          ).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} L
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-gray-500">
                          —
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-orange-600">
                          {(canEdit
                            ? draftDebtSales.reduce((sum, sale) => sum + (sale.amount ?? Math.round(sale.quantity * sale.unitPrice)), 0)
                            : (report?.debtSales || []).reduce((sum: number, sale: any) => sum + Number(sale.amount), 0)
                          ).toLocaleString("vi-VN")} ₫
                        </td>
                        {canEdit && (
                          <td className="px-6 py-3"></td>
                        )}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <TabNavigation />
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
                    onKeyDown={handleFormKeyDown}
                    className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng *</label>
                      <SearchableSelect
                        options={debtCustomers?.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.name}${c.type === 'INTERNAL' ? ' 🏠' : ''}` })) || []}
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian thu *</label>
                      <input
                        type="datetime-local"
                        name="receiptAt"
                        required
                        defaultValue={
                          editingReceiptId
                            ? draftReceipts.find((r) => r.id === editingReceiptId)?.receiptAt?.slice(0, 16)
                            : dayjs().format("YYYY-MM-DDTHH:mm")
                        }
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
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
                              const cust = debtCustomers?.find((c) => c.id === d.customerId);
                              console.log("cust", cust);
                              return cust?.name || "N/A";
                            })
                            .join(", ");
                          return (
                            <tr key={receipt.id}>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {receipt.receiptAt
                                  ? dayjs(receipt.receiptAt).format("DD/MM/YYYY HH:mm")
                                  : "Chưa lưu"}
                              </td>
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
                                {receipt.receiptAt
                                  ? dayjs(receipt.receiptAt).format("DD/MM/YYYY HH:mm")
                                  : dayjs(receipt.createdAt).format("DD/MM/YYYY HH:mm")}
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

              <TabNavigation />
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
                    onKeyDown={handleFormKeyDown}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giờ nộp *</label>
                      <input
                        type="datetime-local"
                        name="depositAt"
                        required
                        defaultValue={
                          editingDepositId
                            ? draftDeposits.find((d) => d.id === editingDepositId)?.depositAt
                            : dayjs().format("YYYY-MM-DDTHH:mm")
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày giờ nộp</th>
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
                              {dayjs(deposit.depositAt).format("DD/MM/YYYY HH:mm")}
                            </td>
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
                          <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                            Chưa có phiếu nộp tiền{" "}
                          </td>
                        </tr>
                      )
                    ) : // Data từ report khi ca đã chốt
                      report?.cashDeposits && report.cashDeposits.length > 0 ? (
                        report.cashDeposits.map((deposit: any) => (
                          <tr key={deposit.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {deposit.depositAt ? dayjs(deposit.depositAt).format("DD/MM/YYYY HH:mm") : dayjs(deposit.depositDate).format("DD/MM/YYYY")}
                            </td>
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
                          <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                            Không có phiếu nộp tiền
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>

              <TabNavigation />
            </div>
          )}

          {/* Tab 5: Imports (Phiếu Nhập Hàng) */}
          {activeTab === "import" && (
            <div className="space-y-6">
              <div className="border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📥 Phiếu Nhập Hàng Xăng Dầu</h3>

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
                  <TruckInventoryImportForm
                    key={editingImportId || 'new'}
                    onSubmit={handleImportSubmit}
                    onCancel={() => {
                      setShowImportForm(false);
                      setEditingImportId(null);
                    }}
                    storeId={report?.shift.storeId}
                    initialData={editingImportId ? draftImports.find((i) => i.id === editingImportId) : undefined}
                  />
                )}

                <table className="w-full border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày giờ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biển số xe</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NCC</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mặt hàng</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bể</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {draftImports.length > 0 ? (
                      draftImports.map((item) => {
                        // Lấy tên mặt hàng từ productId
                        const product = products?.find((p) => p.id === item.productId);
                        const productName = product?.name || `SP#${item.productId}`;
                        // ✅ Lấy tên bể từ tankId
                        const tank = tanks?.find((t) => t.id === item.tankId);
                        const tankName = tank ? `${tank.tankCode} - ${tank.name}` : (item.tankId ? `Bể#${item.tankId}` : "-");

                        return (
                          <tr key={item.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {dayjs(item.docAt).format("DD/MM/YYYY HH:mm")}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.licensePlate || "-"}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.supplierName || "-"}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{productName}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{tankName}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                              {Number(item.quantity || 0).toLocaleString("vi-VN")} lít
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <div className="inline-flex items-center space-x-2">
                                {(isShiftOpen || isEditMode) && (
                                  <>
                                    <button
                                      onClick={() => handleEditImport(item)}
                                      className="text-indigo-600 hover:text-indigo-900"
                                      type="button"
                                      title="Sửa phiếu nhập"
                                    >
                                      <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteImport(item.id)}
                                      className="text-red-600 hover:text-red-900"
                                      type="button"
                                      title="Xóa phiếu nhập"
                                    >
                                      <TrashIcon className="h-5 w-5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                          Chưa có phiếu nhập hàng
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <TabNavigation />
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
                    onKeyDown={handleFormKeyDown}
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
                          <label className="block text-xs font-medium text-gray-500 mb-1">mặt hàng</label>
                          <select
                            name="productId"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">-- Chọn mặt hàng --</option>
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

              <TabNavigation />
            </div>
          )}

          {/* Tab 7: Inventory (Kiểm kê) - Xuất Excel theo mẫu */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Biên Bản Kiểm Kê Tồn Kho Xăng Dầu</h3>

                {/* Thông tin tổ kiểm kê */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">Thành phần Tổ kiểm kê</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Thành viên 1</label>
                      <input
                        type="text"
                        value={inventoryMember1}
                        onChange={(e) => setInventoryMember1(e.target.value)}
                        placeholder="Họ tên người kiểm kê"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Thành viên 2</label>
                      <input
                        type="text"
                        value={inventoryMember2}
                        onChange={(e) => setInventoryMember2(e.target.value)}
                        placeholder="Họ tên người kiểm kê"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Bảng nhập liệu theo Mặt hàng -> Bể -> Vòi */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3">📊 Số liệu kiểm kê</h4>

                  {/* Group by Product */}
                  {products?.filter(p => p.isFuel).map((product, productIdx) => {
                    const productTanks = tanks?.filter((t: any) => t.productId === product.id) || [];
                    if (productTanks.length === 0) return null;

                    return (
                      <div key={product.id} className="mb-6 border rounded-lg overflow-hidden">
                        {/* Product Header */}
                        <div className="bg-blue-50 px-4 py-2 border-b">
                          <h5 className="font-semibold text-blue-800">{productIdx + 1}. {product.name}</h5>
                        </div>

                        {/* Tanks table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-700">Bể chứa</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-700">Chiều cao chung (mm)</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-700">Chiều cao nước (mm)</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-700">Tồn thực tế (Lít)</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-700">Tồn sổ sách (Lít)</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-700">Chênh lệch</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-700">Số máy các vòi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {productTanks.map((tank: any) => {
                                const tankPumps = pumps?.filter((p: any) => p.tankId === tank.id) || [];
                                const tankData = inventoryCheckData[tank.id] || { heightTotal: 0, heightWater: 0, actualStock: 0, bookStock: undefined };
                                const defaultBookStock = Number(tank.currentStock) || 0;
                                const bookStock = tankData.bookStock !== undefined ? tankData.bookStock : defaultBookStock;
                                const diff = (tankData.actualStock || 0) - bookStock;

                                return (
                                  <tr key={tank.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium text-gray-900">
                                      {tank.tankCode || tank.name}
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={tankData.heightTotal || ""}
                                        onChange={(e) => setInventoryCheckData(prev => ({
                                          ...prev,
                                          [tank.id]: { ...prev[tank.id], heightTotal: Number(e.target.value) }
                                        }))}
                                        placeholder="0"
                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={tankData.heightWater || ""}
                                        onChange={(e) => setInventoryCheckData(prev => ({
                                          ...prev,
                                          [tank.id]: { ...prev[tank.id], heightWater: Number(e.target.value) }
                                        }))}
                                        placeholder="0"
                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={tankData.actualStock || ""}
                                        onChange={(e) => setInventoryCheckData(prev => ({
                                          ...prev,
                                          [tank.id]: { ...prev[tank.id], actualStock: Number(e.target.value) }
                                        }))}
                                        placeholder="0"
                                        className="w-28 px-2 py-1 border border-gray-300 rounded text-right"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={tankData.bookStock !== undefined ? tankData.bookStock : defaultBookStock || ""}
                                        onChange={(e) => setInventoryCheckData(prev => ({
                                          ...prev,
                                          [tank.id]: { ...prev[tank.id], bookStock: e.target.value ? Number(e.target.value) : undefined }
                                        }))}
                                        placeholder={defaultBookStock.toLocaleString("vi-VN")}
                                        className="w-28 px-2 py-1 border border-gray-300 rounded text-right bg-gray-50"
                                      />
                                    </td>
                                    <td className={`px-3 py-2 text-right font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                      {tankData.actualStock ? (diff > 0 ? '+' : '') + diff.toLocaleString("vi-VN") : '-'}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-2">
                                        {tankPumps.map((pump: any) => (
                                          <div key={pump.id} className="flex items-center gap-1">
                                            <span className="text-xs text-gray-500">{pump.pumpCode}:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={pumpMeterReadings[pump.id] || ""}
                                              onChange={(e) => setPumpMeterReadings(prev => ({
                                                ...prev,
                                                [pump.id]: Number(e.target.value)
                                              }))}
                                              placeholder="0"
                                              className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                                            />
                                          </div>
                                        ))}
                                        {tankPumps.length === 0 && (
                                          <span className="text-xs text-gray-400">Không có vòi</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}

                  {(!products?.filter(p => p.isFuel).length || !tanks?.length) && (
                    <div className="text-center py-8 text-gray-500">
                      Chưa có cấu hình bể/mặt hàng cho cửa hàng này
                    </div>
                  )}
                </div>

                {/* Nguyên nhân & Kiến nghị */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nguyên nhân (nếu có chênh lệch)</label>
                    <textarea
                      value={inventoryReason}
                      onChange={(e) => setInventoryReason(e.target.value)}
                      placeholder="Nhập nguyên nhân chênh lệch..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kiến nghị / Kết luận</label>
                    <textarea
                      value={inventoryConclusion}
                      onChange={(e) => setInventoryConclusion(e.target.value)}
                      placeholder="Nhập kiến nghị hoặc kết luận..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setInventoryCheckData({});
                      setPumpMeterReadings({});
                      setInventoryReason("");
                      setInventoryConclusion("");
                      setInventoryMember1("");
                      setInventoryMember2("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Xóa dữ liệu
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      // Validate
                      const filledTanks = Object.entries(inventoryCheckData).filter(([_, data]) =>
                        data.actualStock > 0 || data.heightTotal > 0 || data.heightWater > 0
                      );

                      if (filledTanks.length === 0) {
                        toast.error("Vui lòng nhập ít nhất số liệu cho 1 bể");
                        return;
                      }

                      // Build export data
                      const rows: InventoryCheckRow[] = [];
                      let stt = 0;

                      products?.filter(p => p.isFuel).forEach(product => {
                        const productTanks = tanks?.filter((t: any) => t.productId === product.id) || [];
                        if (productTanks.length === 0) return;

                        stt++;
                        let isFirstProductRow = true;

                        productTanks.forEach((tank: any) => {
                          const tankData = inventoryCheckData[tank.id] || { heightTotal: 0, heightWater: 0, actualStock: 0, bookStock: undefined };
                          const defaultBookStock = Number(tank.currentStock) || 0;
                          const bookStock = tankData.bookStock !== undefined ? tankData.bookStock : defaultBookStock;
                          const diff = (tankData.actualStock || 0) - bookStock;

                          // Get pumps for this tank
                          const tankPumps = pumps?.filter((p: any) => p.tankId === tank.id) || [];

                          if (tankPumps.length === 0) {
                            // Bể không có vòi - vẫn xuất 1 dòng
                            rows.push({
                              stt: isFirstProductRow ? stt : '',
                              productName: isFirstProductRow ? product.name : '',
                              tankName: tank.tankCode || tank.name,
                              heightTotal: tankData.heightTotal || '',
                              heightWater: tankData.heightWater || '',
                              actualStock: tankData.actualStock || '',
                              bookStock: bookStock || '',
                              difference: tankData.actualStock ? diff : '',
                              pumpElectronic: '',
                              pumpMechanical: ''
                            });
                            isFirstProductRow = false;
                          } else {
                            // Mỗi vòi 1 dòng
                            let isFirstTankRow = true;
                            tankPumps.forEach((pump: any) => {
                              rows.push({
                                stt: isFirstProductRow ? stt : '',
                                productName: isFirstProductRow ? product.name : '',
                                tankName: isFirstTankRow ? (tank.tankCode || tank.name) : '',
                                heightTotal: isFirstTankRow ? (tankData.heightTotal || '') : '',
                                heightWater: isFirstTankRow ? (tankData.heightWater || '') : '',
                                actualStock: isFirstTankRow ? (tankData.actualStock || '') : '',
                                bookStock: isFirstTankRow ? (bookStock || '') : '',
                                difference: isFirstTankRow && tankData.actualStock ? diff : '',
                                pumpElectronic: `${pump.pumpCode}: ${(pumpMeterReadings[pump.id] || 0).toLocaleString("vi-VN")}`,
                                pumpMechanical: ''
                              });
                              isFirstProductRow = false;
                              isFirstTankRow = false;
                            });
                          }
                        });
                      });

                      const exportData: InventoryCheckExportData = {
                        companyName: "CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P - CN ĐỐNG ĐA",
                        branchName: store?.name || "CỬA HÀNG XĂNG DẦU",
                        storeName: store?.name || "",
                        checkTime: dayjs().format("HH:mm [ngày] DD [tháng] MM [năm] YYYY"),
                        members: [
                          { name: inventoryMember1 || "", department: store?.name || "" },
                          { name: inventoryMember2 || "", department: "" }
                        ].filter(m => m.name),
                        rows,
                        reason: inventoryReason,
                        conclusion: inventoryConclusion
                      };

                      const fileName = `Kiem_ke_${store?.code || 'store'}_${dayjs().format("YYYYMMDD_HHmm")}`;
                      await exportInventoryCheckExcel(exportData, fileName);
                      toast.success("Đã xuất file Excel kiểm kê!");
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    📥 Xuất Excel
                  </button>
                </div>
              </div>

              <TabNavigation />
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
