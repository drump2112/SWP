import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi, type CashReportParams } from "../api/reports";
import { storesApi } from "../api/stores";
import { useAuth } from "../contexts/AuthContext";
import {
  BanknotesIcon,
  FunnelIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PrinterIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  EyeIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import SearchableSelect from "../components/SearchableSelect";
import DateRangePicker from "../components/DateRangePicker";
import {
  createReportWorkbook,
  addReportHeader,
  addReportFooter,
  downloadExcel,
  STYLES,
} from "../utils/report-exporter";
import {
  printReport,
  formatCurrency,
  formatDateTime,
} from "../utils/report-printer";

const CashReportPage: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<CashReportParams>({
    storeId: user?.storeId,
    fromDate: dayjs().startOf("month").format("YYYY-MM-DD"),
    toDate: dayjs().endOf("month").format("YYYY-MM-DD"),
  });
  const [isAllStores, setIsAllStores] = useState(false);
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const [collapsedStores, setCollapsedStores] = useState<Set<number>>(
    new Set(),
  );

  // Fetch stores (cho kế toán)
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId, // Chỉ load nếu là kế toán (không có storeId)
  });

  // Fetch cash report for single store
  const { data: report, isLoading } = useQuery({
    queryKey: ["cash-report", filters],
    queryFn: () => reportsApi.getCashReport(filters),
    enabled: !isAllStores,
  });

  // Fetch cash reports for all stores
  const { data: allStoresReport, isLoading: isLoadingAllStores } = useQuery({
    queryKey: ["cash-report-all-stores", filters],
    queryFn: async () => {
      if (!stores || stores.length === 0) return [];
      const reports = await Promise.all(
        stores.map(async (store: any) => {
          try {
            const storeReport = await reportsApi.getCashReport({
              storeId: store.id,
              fromDate: filters.fromDate,
              toDate: filters.toDate,
              refType: filters.refType,
            });
            return {
              storeId: store.id,
              storeName: store.name,
              storeCode: store.code,
              data: storeReport,
            };
          } catch (error) {
            console.error(
              `Error fetching report for store ${store.id}:`,
              error,
            );
            return {
              storeId: store.id,
              storeName: store.name,
              storeCode: store.code,
              data: null,
            };
          }
        }),
      );
      return reports;
    },
    enabled: isAllStores && !!stores,
  });

  // Auto-collapse all stores when data is loaded
  useEffect(() => {
    if (allStoresReport && allStoresReport.length > 0) {
      const allStoreIds = new Set(allStoresReport.map((s) => s.storeId));
      setCollapsedStores(allStoreIds);
    }
  }, [allStoresReport]);

  const handleExportExcel = async () => {
    if (isAllStores) {
      if (
        !allStoresReport ||
        allStoresReport.length === 0 ||
        !allStoresReport.some((s) => s.data?.ledgers?.length > 0)
      ) {
        alert("Không có dữ liệu để xuất");
        return;
      }

      const { workbook, worksheet } = createReportWorkbook(
        "Sổ quỹ tiền mặt - Tất cả cửa hàng",
      );

      addReportHeader(worksheet, {
        storeName: "Tất cả cửa hàng",
        title: "SỔ QUỸ TIỀN MẶT",
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      });

      worksheet.columns = [
        { key: "storeName", width: 30 },
        { key: "openingBalance", width: 18 },
        { key: "cashIn", width: 18 },
        { key: "cashOut", width: 18 },
        { key: "closingBalance", width: 18 },
      ];

      // Header row
      const headerRow = worksheet.getRow(7);
      headerRow.values = [
        "Cửa hàng",
        "Số dư đầu kỳ",
        "Số phát sinh",
        "Số nộp về",
        "Số dư cuối kỳ",
      ];
      headerRow.font = STYLES.boldFont;
      headerRow.eachCell((cell) => {
        cell.border = STYLES.borderStyle;
        cell.alignment = STYLES.centerAlign;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFC6EFCE" },
        };
      });

      let rowIndex = 8;

      allStoresReport.forEach((storeData: any) => {
        if (
          !storeData.data ||
          !storeData.data.ledgers ||
          storeData.data.ledgers.length === 0
        )
          return;

        const summary = calculateStoreSummary(storeData.data.ledgers);

        const row = worksheet.getRow(rowIndex++);
        row.values = [
          `${storeData.storeCode} - ${storeData.storeName}`,
          Number(storeData.data.openingBalance),
          Number(summary.totalCashIn),
          Number(summary.totalCashOut),
          Number(storeData.data.closingBalance),
        ];

        row.font = STYLES.normalFont;
        row.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber === 1) {
            cell.alignment = STYLES.leftAlign;
          } else {
            cell.alignment = STYLES.rightAlign;
            cell.numFmt = "#,##0";
          }
        });
      });

      addReportFooter(worksheet, {
        signatures: {
          left: "Kế toán",
          center: "Cửa hàng trưởng",
          right: "Thủ quỹ",
        },
      });

      await downloadExcel(workbook, "So_quy_tien_mat_tat_ca_cua_hang");
    } else {
      if (!report?.ledgers) {
        alert("Không có dữ liệu để xuất");
        return;
      }

      const storeName =
        user?.store?.name ||
        stores?.find((s) => s.id === filters.storeId)?.name ||
        "Cửa hàng";

      const { workbook, worksheet } = createReportWorkbook("Sổ quỹ tiền mặt");

      addReportHeader(worksheet, {
        storeName,
        title: "SỔ QUỸ TIỀN MẶT",
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      });

      worksheet.columns = [
        { key: "stt", width: 6 },
        { key: "date", width: 18 },
        { key: "description", width: 35 },
        { key: "cashIn", width: 18 },
        { key: "cashOut", width: 18 },
        { key: "balance", width: 20 },
      ];

      const openingRow = worksheet.getRow(7);
      openingRow.values = [
        "",
        "",
        "Số dư đầu kỳ",
        "",
        "",
        report.openingBalance,
      ];
      openingRow.font = STYLES.boldFont;
      openingRow.getCell(3).alignment = STYLES.leftAlign;
      openingRow.getCell(6).alignment = STYLES.rightAlign;
      openingRow.getCell(6).numFmt = "#,##0";
      openingRow.eachCell((cell) => {
        cell.border = STYLES.borderStyle;
      });
      worksheet.mergeCells(`A7:B7`);
      worksheet.mergeCells(`C7:E7`);

      const headerRow = worksheet.getRow(8);
      headerRow.values = [
        "STT",
        "Ngày giờ",
        "Diễn giải",
        "Số phát sinh (₫)",
        "Số đã nộp (₫)",
        "Tồn quỹ tiền mặt (₫)",
      ];
      headerRow.font = STYLES.headerFont;
      headerRow.alignment = STYLES.centerAlign;
      headerRow.eachCell((cell) => {
        cell.border = STYLES.borderStyle;
      });

      let totalCashIn = 0;
      let totalCashOut = 0;

      report.ledgers.forEach((ledger: any, index: number) => {
        const description =
          ledger.details?.notes ||
          ledger.notes ||
          getRefTypeLabel(ledger.refType);

        const row = worksheet.addRow([
          index + 1,
          dayjs(ledger.date).format("DD/MM/YYYY HH:mm"),
          description,
          Number(ledger.cashIn),
          Number(ledger.cashOut),
          Number(ledger.balance),
        ]);

        totalCashIn += Number(ledger.cashIn);
        totalCashOut += Number(ledger.cashOut);

        row.font = STYLES.normalFont;
        row.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber === 1 || colNumber === 2) {
            cell.alignment = STYLES.centerAlign;
          } else if (colNumber === 3) {
            cell.alignment = STYLES.leftAlign;
          } else {
            cell.alignment = STYLES.rightAlign;
            cell.numFmt = "#,##0";
          }
        });
      });

      const totalRow = worksheet.addRow([
        "",
        "",
        "Tổng phát sinh",
        totalCashIn,
        totalCashOut,
        "",
      ]);
      totalRow.font = STYLES.boldFont;
      totalRow.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        if (colNumber === 3) {
          cell.alignment = STYLES.leftAlign;
        } else if (colNumber === 4 || colNumber === 5) {
          cell.alignment = STYLES.rightAlign;
          cell.numFmt = "#,##0";
        }
      });
      worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);

      const closingRow = worksheet.addRow([
        "",
        "",
        "Số dư cuối kỳ",
        "",
        "",
        report.closingBalance,
      ]);
      closingRow.font = STYLES.boldFont;
      closingRow.getCell(3).alignment = STYLES.leftAlign;
      closingRow.getCell(6).alignment = STYLES.rightAlign;
      closingRow.getCell(6).numFmt = "#,##0";
      closingRow.eachCell((cell) => {
        cell.border = STYLES.borderStyle;
      });
      worksheet.mergeCells(`A${closingRow.number}:B${closingRow.number}`);
      worksheet.mergeCells(`C${closingRow.number}:E${closingRow.number}`);

      addReportFooter(worksheet, {
        signatures: {
          left: "Kế toán",
          center: "Cửa hàng trưởng",
          right: "Thủ quỹ",
        },
      });

      await downloadExcel(workbook, "So_quy_tien_mat");
    }
  };

  const handlePrint = () => {
    if (isAllStores) {
      if (
        !allStoresReport ||
        allStoresReport.length === 0 ||
        !allStoresReport.some((s) => s.data?.ledgers?.length > 0)
      ) {
        alert("Không có dữ liệu để in");
        return;
      }

      let tableRows = "";
      allStoresReport.forEach((storeData: any) => {
        if (
          !storeData.data ||
          !storeData.data.ledgers ||
          storeData.data.ledgers.length === 0
        )
          return;

        const summary = calculateStoreSummary(storeData.data.ledgers);
        tableRows += `
          <tr>
            <td class="text-left">${storeData.storeCode} - ${storeData.storeName}</td>
            <td class="text-right">${formatCurrency(storeData.data.openingBalance)}</td>
            <td class="text-right">${formatCurrency(summary.totalCashIn)}</td>
            <td class="text-right">${formatCurrency(summary.totalCashOut)}</td>
            <td class="text-right font-bold">${formatCurrency(storeData.data.closingBalance)}</td>
          </tr>
        `;
      });

      const tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Cửa hàng</th>
              <th>Số dư đầu kỳ (₫)</th>
              <th>Số phát sinh (₫)</th>
              <th>Số nộp về (₫)</th>
              <th>Số dư cuối kỳ (₫)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;

      printReport(tableHTML, {
        storeName: "Tất cả cửa hàng",
        title: "SỔ QUỸ TIỀN MẶT",
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        signatures: {
          left: "Kế toán",
          center: "Cửa hàng trưởng",
          right: "Thủ quỹ",
        },
      });
    } else {
      if (!report?.ledgers) {
        alert("Không có dữ liệu để in");
        return;
      }

      const storeName =
        user?.store?.name ||
        stores?.find((s) => s.id === filters.storeId)?.name ||
        "Cửa hàng";

      let totalCashIn = 0;
      let totalCashOut = 0;

      const tableRows = report.ledgers
        .map((ledger: any, index: number) => {
          const description =
            ledger.details?.notes ||
            ledger.notes ||
            getRefTypeLabel(ledger.refType);
          totalCashIn += Number(ledger.cashIn);
          totalCashOut += Number(ledger.cashOut);

          return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td class="text-center">${formatDateTime(ledger.date)}</td>
            <td class="text-left">${description}</td>
            <td class="text-right">${ledger.cashIn > 0 ? formatCurrency(ledger.cashIn) : "-"}</td>
            <td class="text-right">${ledger.cashOut > 0 ? formatCurrency(ledger.cashOut) : "-"}</td>
            <td class="text-right font-bold">${formatCurrency(ledger.balance)}</td>
          </tr>
        `;
        })
        .join("");

      const tableHTML = `
        <table>
          <tr style="background-color: #dbeafe;">
            <td colspan="3" class="text-left font-bold">Số dư đầu kỳ</td>
            <td colspan="3" class="text-right font-bold">${formatCurrency(report.openingBalance)}</td>
          </tr>
          <thead>
            <tr>
              <th>STT</th>
              <th>Ngày giờ</th>
              <th>Diễn giải</th>
              <th>Số phát sinh (₫)</th>
              <th>Số đã nộp (₫)</th>
              <th>Tồn quỹ tiền mặt (₫)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="3" class="text-left">Tổng phát sinh</td>
              <td class="text-right">${formatCurrency(totalCashIn)}</td>
              <td class="text-right">${formatCurrency(totalCashOut)}</td>
              <td></td>
            </tr>
            <tr style="background-color: #f3e8ff;">
              <td colspan="3" class="text-left font-bold">Số dư cuối kỳ</td>
              <td colspan="3" class="text-right font-bold">${formatCurrency(report.closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      `;

      printReport(tableHTML, {
        storeName,
        title: "SỔ QUỸ TIỀN MẶT",
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        signatures: {
          left: "Kế toán",
          center: "Cửa hàng trưởng",
          right: "Thủ quỹ",
        },
      });
    }
  };

  const getRefTypeLabel = (refType: string) => {
    switch (refType) {
      case "RECEIPT":
        return "Phiếu thu";
      case "DEPOSIT":
        return "Phiếu nộp";
      case "EXPENSE":
        return "Chi phí";
      case "ADJUST":
        return "Điều chỉnh";
      case "SHIFT_CLOSE":
        return "Chốt ca";
      case "SHIFT_CLOSE_DEPOSIT":
        return "Chốt ca & Nộp tiền";
      case "SHIFT_OPEN":
        return "Mở ca";
      case "SALE":
        return "Bán hàng";
      case "PAYMENT":
        return "Thu tiền";
      default:
        return "Khác";
    }
  };

  const calculateStoreSummary = (ledgers: any[]) => {
    return {
      totalCashIn: ledgers.reduce(
        (sum, ledger) => sum + (ledger.cashIn || 0),
        0,
      ),
      totalCashOut: ledgers.reduce(
        (sum, ledger) => sum + (ledger.cashOut || 0),
        0,
      ),
      entryCount: ledgers.length,
    };
  };

  const toggleStoreCollapse = (storeId: number) => {
    const newCollapsed = new Set(collapsedStores);
    if (newCollapsed.has(storeId)) {
      newCollapsed.delete(storeId);
    } else {
      newCollapsed.add(storeId);
    }
    setCollapsedStores(newCollapsed);
  };

  const isLoading_Final = isAllStores ? isLoadingAllStores : isLoading;

  if (isLoading_Final) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BanknotesIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Báo Cáo Sổ Quỹ Tiền Mặt
              </h1>
              <p className="text-sm text-gray-600">
                Theo dõi thu chi tiền mặt qua phiếu thu và phiếu nộp
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={
                isAllStores
                  ? !allStoresReport?.some((s) => s.data?.ledgers?.length > 0)
                  : !report?.ledgers?.length
              }
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Xuất Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={
                isAllStores
                  ? !allStoresReport?.some((s) => s.data?.ledgers?.length > 0)
                  : !report?.ledgers?.length
              }
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              <PrinterIcon className="h-4 w-4 mr-1" />
              In
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-4 w-4 text-gray-600" />
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!user?.storeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BuildingStorefrontIcon className="h-4 w-4 inline mr-1" />
                Cửa hàng
              </label>
              <SearchableSelect
                options={[
                  { value: "all", label: "📊 Tất cả cửa hàng" },
                  ...(stores?.map((store) => ({
                    value: store.id.toString(),
                    label: `${store.code} - ${store.name}`,
                  })) || []),
                ]}
                value={isAllStores ? "all" : filters.storeId?.toString() || ""}
                onChange={(value) => {
                  if (value === "all") {
                    setIsAllStores(true);
                    setFilters({ ...filters, storeId: undefined });
                  } else {
                    setIsAllStores(false);
                    setFilters({
                      ...filters,
                      storeId: value && value !== "" ? +value : undefined,
                    });
                  }
                }}
                placeholder="Chọn cửa hàng"
                isClearable
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              Khoảng thời gian
            </label>
            <DateRangePicker
              fromDate={filters.fromDate || ""}
              toDate={filters.toDate || ""}
              onFromDateChange={(date) =>
                setFilters((prev) => ({ ...prev, fromDate: date }))
              }
              onToDateChange={(date) =>
                setFilters((prev) => ({ ...prev, toDate: date }))
              }
              label=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DocumentTextIcon className="h-4 w-4 inline mr-1" />
              Loại chứng từ
            </label>
            <SearchableSelect
              options={[
                { value: "", label: "Tất cả" },
                { value: "RECEIPT", label: "Phiếu thu" },
                { value: "DEPOSIT", label: "Phiếu nộp" },
                { value: "EXPENSE", label: "Chi phí" },
                { value: "ADJUST", label: "Điều chỉnh" },
                { value: "SHIFT_CLOSE", label: "Chốt ca" },
                { value: "SHIFT_CLOSE_DEPOSIT", label: "Chốt ca & Nộp tiền" },
                { value: "SHIFT_OPEN", label: "Mở ca" },
                { value: "SALE", label: "Bán hàng" },
                { value: "PAYMENT", label: "Thu tiền" },
              ]}
              value={filters.refType || ""}
              onChange={(value) =>
                setFilters({ ...filters, refType: String(value) || undefined })
              }
              placeholder="Chọn loại chứng từ"
              isClearable
            />
          </div>
        </div>
      </div>

      {/* Summary Cards - Only show for single store */}
      {!isAllStores && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-4">
            <div className="text-sm text-blue-600 font-medium">
              Số dư đầu kỳ
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-1 tabular-nums">
              {report?.openingBalance.toLocaleString("vi-VN")}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-4">
            <div className="text-sm text-green-600 font-medium flex items-center gap-1">
              <ArrowDownIcon className="h-4 w-4" />
              Tổng thu
            </div>
            <div className="text-2xl font-bold text-green-700 mt-1 tabular-nums">
              {report?.totalCashIn.toLocaleString("vi-VN")}
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow p-4">
            <div className="text-sm text-red-600 font-medium flex items-center gap-1">
              <ArrowUpIcon className="h-4 w-4" />
              Tổng chi
            </div>
            <div className="text-2xl font-bold text-red-700 mt-1 tabular-nums">
              {report?.totalCashOut.toLocaleString("vi-VN")}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-4">
            <div className="text-sm text-purple-600 font-medium">
              Số dư cuối kỳ
            </div>
            <div className="text-2xl font-bold text-purple-700 mt-1 tabular-nums">
              {report?.closingBalance.toLocaleString("vi-VN")}
            </div>
          </div>
        </div>
      )}

      {/* Report Table */}
      {isAllStores ? (
        // 🔥 Layout for All Stores - Similar to InventoryReportPage
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300 border-r">
                    Ngày giờ
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300 border-r">
                    Hình thức
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300 border-r">
                    Số phát sinh
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300 border-r">
                    Số Đã nộp
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300 border-r">
                    Tồn Quỹ Tiền mặt
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {allStoresReport && allStoresReport.length > 0 ? (
                  allStoresReport.map((storeData: any, storeIndex: number) => {
                    const isStoreCollapsed = collapsedStores.has(
                      storeData.storeId,
                    );
                    const storeSummary = calculateStoreSummary(
                      storeData.data?.ledgers || [],
                    );
                    return (
                      <React.Fragment key={storeIndex}>
                        {/* Store Header - Clickable to collapse/expand */}
                        <tr
                          onClick={() => toggleStoreCollapse(storeData.storeId)}
                          className="bg-gray-100 border-l-4 border-blue-500 hover:bg-gray-200 cursor-pointer transition-colors"
                        >
                          <td
                            colSpan={6}
                            className="px-6 py-3 text-left font-bold text-gray-800 border-y"
                          >
                            <span className="inline-block mr-2 text-sm font-semibold">
                              {isStoreCollapsed ? "▶" : "▼"}
                            </span>
                            <BuildingStorefrontIcon className="h-4 w-4 inline mr-2" />
                            {storeData.storeCode} - {storeData.storeName}
                            {isStoreCollapsed && (
                              <span className="ml-4 text-xs font-normal text-gray-600">
                                ({storeSummary.entryCount} giao dịch)
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Collapsed Summary Rows */}
                        {isStoreCollapsed &&
                          storeData.data?.ledgers &&
                          storeData.data.ledgers.length > 0 && (
                            <>
                              {/* Opening Balance Row */}
                              <tr className="bg-blue-50 border-b border-blue-200">
                                <td className="px-6 py-3 text-sm font-semibold text-gray-700">
                                  Số dư đầu kỳ
                                </td>
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3 text-right">
                                  <div className="text-sm font-bold text-blue-600 tabular-nums">
                                    {storeData.data?.openingBalance?.toLocaleString(
                                      "vi-VN",
                                    ) || "0"}
                                  </div>
                                </td>
                                <td className="px-6 py-3"></td>
                              </tr>

                              {/* Summary Row */}
                              <tr className="bg-amber-50 border-b border-amber-200 hover:bg-amber-100">
                                <td className="px-6 py-3 text-sm font-semibold text-gray-700">
                                  Tóm tắt
                                </td>
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3 text-right">
                                  <div className="text-xs text-gray-600">
                                    Phát sinh
                                  </div>
                                  <div className="text-sm font-bold text-green-600 tabular-nums">
                                    +
                                    {storeSummary.totalCashIn.toLocaleString(
                                      "vi-VN",
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="text-xs text-gray-600">
                                    Nộp về
                                  </div>
                                  <div className="text-sm font-bold text-red-600 tabular-nums">
                                    -
                                    {storeSummary.totalCashOut.toLocaleString(
                                      "vi-VN",
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="text-xs text-gray-600">
                                    Lệch
                                  </div>
                                  <div
                                    className={`text-sm font-bold tabular-nums ${
                                      storeSummary.totalCashIn -
                                        storeSummary.totalCashOut >=
                                      0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {(
                                      storeSummary.totalCashIn -
                                      storeSummary.totalCashOut
                                    ).toLocaleString("vi-VN")}
                                  </div>
                                </td>
                                <td className="px-6 py-3"></td>
                              </tr>

                              {/* Closing Balance Row */}
                              <tr className="bg-purple-50 border-b border-purple-200">
                                <td className="px-6 py-3 text-sm font-semibold text-gray-700">
                                  Số dư cuối kỳ
                                </td>
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3 text-right">
                                  <div className="text-sm font-bold text-purple-600 tabular-nums">
                                    {storeData.data?.closingBalance?.toLocaleString(
                                      "vi-VN",
                                    ) || "0"}
                                  </div>
                                </td>
                                <td className="px-6 py-3"></td>
                              </tr>
                            </>
                          )}

                        {!isStoreCollapsed &&
                          (storeData.data?.ledgers &&
                          storeData.data.ledgers.length > 0 ? (
                            <>
                              {/* Opening Balance for this store */}
                              <tr className="bg-blue-50 border-y border-blue-200">
                                <td
                                  colSpan={4}
                                  className="px-6 py-3 text-left text-sm font-semibold text-gray-700"
                                >
                                  Số dư đầu kỳ
                                </td>
                                <td className="px-6 py-3 text-right text-base border-l border-blue-200">
                                  <span className="font-bold text-blue-600 tabular-nums">
                                    {storeData.data?.openingBalance?.toLocaleString(
                                      "vi-VN",
                                    ) || "0"}
                                  </span>
                                </td>
                                <td></td>
                              </tr>

                              {/* Ledger entries for this store */}
                              {storeData.data.ledgers.map((ledger: any) => (
                                <React.Fragment key={ledger.id}>
                                  <tr className="hover:bg-gray-50 border-b border-gray-200">
                                    <td className="px-6 py-4 text-center text-sm text-gray-900 whitespace-nowrap border-r border-gray-300">
                                      {dayjs(ledger.date).format(
                                        "DD/MM/YYYY HH:mm",
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm border-r border-gray-300">
                                      {ledger.details?.paymentMethod ===
                                      "BANK_TRANSFER" ? (
                                        <span className="text-xs font-medium text-blue-600">
                                          🏦 CK
                                        </span>
                                      ) : (
                                        <span className="text-xs font-medium text-green-600">
                                          💵 TM
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm border-r border-gray-300">
                                      {ledger.cashIn > 0 ? (
                                        <span className="text-green-600 font-semibold tabular-nums">
                                          {ledger.cashIn.toLocaleString(
                                            "vi-VN",
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm border-r border-gray-300">
                                      {ledger.cashOut > 0 ? (
                                        <span className="text-red-600 font-semibold tabular-nums">
                                          {ledger.cashOut.toLocaleString(
                                            "vi-VN",
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm border-r border-gray-300">
                                      <span
                                        className={`font-bold tabular-nums ${
                                          ledger.balance >= 0
                                            ? "text-purple-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        {ledger.balance.toLocaleString("vi-VN")}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm">
                                      {ledger.details && (
                                        <button
                                          onClick={() =>
                                            setShowDetails(
                                              showDetails === ledger.id
                                                ? null
                                                : ledger.id,
                                            )
                                          }
                                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                        >
                                          {showDetails === ledger.id
                                            ? "▼"
                                            : "▶"}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                  {/* Detail Row */}
                                  {showDetails === ledger.id &&
                                    ledger.details && (
                                      <tr className="bg-gray-50 border-b border-gray-200">
                                        <td colSpan={6} className="px-6 py-3">
                                          <div className="text-sm font-semibold text-gray-700 mb-2">
                                            Chi tiết:
                                          </div>
                                          {ledger.details.type ===
                                            "RECEIPT" && (
                                            <div className="text-xs text-gray-700">
                                              <div>
                                                Loại:{" "}
                                                {ledger.details.receiptType ===
                                                "CASH_SALES"
                                                  ? "Bán lẻ"
                                                  : "Thu nợ"}
                                              </div>
                                              <div>
                                                Tổng tiền:{" "}
                                                {ledger.details.totalAmount?.toLocaleString(
                                                  "vi-VN",
                                                )}
                                                ₫
                                              </div>
                                              {ledger.details.notes && (
                                                <div>
                                                  Ghi chú:{" "}
                                                  {ledger.details.notes}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {ledger.details.type ===
                                            "DEPOSIT" && (
                                            <div className="text-xs text-gray-700">
                                              <div>
                                                Ngày nộp:{" "}
                                                {dayjs(
                                                  ledger.details.depositAt,
                                                ).format("DD/MM/YYYY HH:mm")}
                                              </div>
                                              <div>
                                                Người nhận:{" "}
                                                {ledger.details.receiverName ||
                                                  "-"}
                                              </div>
                                              <div>
                                                Số tiền:{" "}
                                                {ledger.details.amount?.toLocaleString(
                                                  "vi-VN",
                                                )}
                                                ₫
                                              </div>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                </React.Fragment>
                              ))}

                              {/* Closing Balance for this store */}
                              <tr className="bg-purple-50 border-y-2 border-purple-500">
                                <td
                                  colSpan={4}
                                  className="px-6 py-3 text-left text-sm font-semibold text-gray-700"
                                >
                                  Số dư cuối kỳ
                                </td>
                                <td className="px-6 py-3 text-right text-base border-l border-purple-300">
                                  <span className="font-bold text-purple-600 tabular-nums">
                                    {storeData.data?.closingBalance?.toLocaleString(
                                      "vi-VN",
                                    ) || "0"}
                                  </span>
                                </td>
                                <td></td>
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-6 py-4 text-center text-sm text-gray-500"
                              >
                                Không có giao dịch trong kỳ này
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // 🔥 Layout for Single Store
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-50 border-l-4 border-blue-500">
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                    colSpan={4}
                  >
                    Số dư đầu kỳ
                  </th>
                  <th className="px-6 py-4 text-right text-base" colSpan={2}>
                    <span className="font-bold text-blue-600 text-lg tabular-nums">
                      {report?.openingBalance.toLocaleString("vi-VN")}
                    </span>
                  </th>
                </tr>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">
                    Ngày giờ
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">
                    Hình thức
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">
                    Số phát sinh
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">
                    Số Đã nộp
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">
                    Tồn Quỹ TIền mặt
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report?.ledgers && report.ledgers.length > 0 ? (
                  report.ledgers.map((ledger: any) => (
                    <React.Fragment key={ledger.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-center text-sm text-gray-900 whitespace-nowrap">
                          {dayjs(ledger.date).format("DD/MM/YYYY HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {ledger.details?.paymentMethod === "BANK_TRANSFER" ? (
                            <span className="text-xs font-medium text-blue-600">
                              🏦 CK
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-green-600">
                              💵 TM
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {ledger.cashIn > 0 ? (
                            <span className="text-green-600 font-semibold tabular-nums">
                              {ledger.cashIn.toLocaleString("vi-VN")}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {ledger.cashOut > 0 ? (
                            <span className="text-red-600 font-semibold tabular-nums">
                              {ledger.cashOut.toLocaleString("vi-VN")}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          <span
                            className={`font-bold tabular-nums ${
                              ledger.balance >= 0
                                ? "text-purple-600"
                                : "text-red-600"
                            }`}
                          >
                            {ledger.balance.toLocaleString("vi-VN")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {ledger.details && (
                            <button
                              onClick={() =>
                                setShowDetails(
                                  showDetails === ledger.id ? null : ledger.id,
                                )
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 border shadow-sm hover:shadow ${
                                showDetails === ledger.id
                                  ? "text-gray-600 bg-gray-100 hover:bg-gray-200 border-gray-300"
                                  : "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300"
                              }`}
                            >
                              {showDetails === ledger.id ? (
                                <>
                                  <ChevronUpIcon className="h-4 w-4" />
                                  Ẩn
                                </>
                              ) : (
                                <>
                                  <EyeIcon className="h-4 w-4" />
                                  Chi tiết
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      {showDetails === ledger.id && ledger.details && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="text-sm font-semibold text-gray-700 mb-2">
                              Chi tiết {getRefTypeLabel(ledger.refType)}:
                            </div>
                            {ledger.details.type === "RECEIPT" && (
                              <div className="bg-white rounded-lg p-4 border border-green-200 text-xs space-y-2">
                                <div>
                                  <span className="text-gray-600">
                                    Loại phiếu thu:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {ledger.details.receiptType === "CASH_SALES"
                                      ? "Bán lẻ"
                                      : "Thu nợ"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Tổng tiền:
                                  </span>{" "}
                                  <span className="font-bold text-green-600">
                                    {ledger.details.totalAmount?.toLocaleString(
                                      "vi-VN",
                                    )}
                                  </span>
                                  ₫
                                </div>
                                {ledger.details.receiptAt && (
                                  <div>
                                    <span className="text-gray-600">
                                      Thời gian thu:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {dayjs(ledger.details.receiptAt).format(
                                        "DD/MM/YYYY HH:mm",
                                      )}
                                    </span>
                                  </div>
                                )}
                                {ledger.details.notes && (
                                  <div>
                                    <span className="text-gray-600">
                                      Ghi chú:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {ledger.details.notes}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {ledger.details.type === "DEPOSIT" && (
                              <div className="bg-white rounded-lg p-4 border border-red-200 text-xs space-y-2">
                                <div>
                                  <span className="text-gray-600">
                                    Ngày nộp:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {dayjs(ledger.details.depositAt).format(
                                      "DD/MM/YYYY HH:mm",
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Người nhận:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {ledger.details.receiverName || "-"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Số tiền:
                                  </span>{" "}
                                  <span className="font-bold text-red-600">
                                    {ledger.details.amount?.toLocaleString(
                                      "vi-VN",
                                    )}
                                  </span>
                                  ₫
                                </div>
                                {ledger.details.notes && (
                                  <div>
                                    <span className="text-gray-600">
                                      Ghi chú:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {ledger.details.notes}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      Không có giao dịch trong kỳ này
                    </td>
                  </tr>
                )}
                {report?.ledgers && report.ledgers.length > 0 && (
                  <tr className="bg-purple-50 border-l-4 border-purple-500">
                    <th
                      className="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                      colSpan={4}
                    >
                      Số dư cuối kỳ
                    </th>
                    <th className="px-6 py-4 text-right text-base" colSpan={2}>
                      <span className="font-bold text-purple-600 text-lg tabular-nums">
                        {report?.closingBalance.toLocaleString("vi-VN")}
                      </span>
                    </th>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashReportPage;
