import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api/reports";
import { storesApi } from "../api/stores";
import { useAuth } from "../contexts/AuthContext";
import {
  ChartBarIcon,
  FunnelIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import {
  createReportWorkbook,
  addReportHeader,
  addReportFooter,
  downloadExcel,
  STYLES,
} from "../utils/report-exporter";

const SalesReportPage: React.FC = () => {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(user?.storeId);
  const [reportType, setReportType] = useState<"pump" | "product">("pump");

  // Fetch stores for admin/accountant/sales
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId, // Only fetch if user is not bound to a store
  });

  // Fetch report data
  const { data: pumpReport, isLoading: loadingPump } = useQuery({
    queryKey: ["sales-report-pump", selectedStoreId, fromDate, toDate],
    queryFn: () =>
      reportsApi.getSalesByPump({
        storeId: selectedStoreId,
        fromDate,
        toDate,
      }),
    enabled: !!selectedStoreId && reportType === "pump",
  });

  const { data: productReport, isLoading: loadingProduct } = useQuery({
    queryKey: ["sales-report-product", selectedStoreId, fromDate, toDate],
    queryFn: () =>
      reportsApi.getSalesByShift({
        storeId: selectedStoreId,
        fromDate,
        toDate,
      }),
    enabled: !!selectedStoreId && reportType === "product",
  });

  console.log("productReport", productReport);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const handleExportExcel = async () => {
    const dataToExport = reportType === "pump" ? pumpReport : productReport;
    if (!dataToExport || dataToExport.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    // @ts-ignore
    const storeName = user?.store?.name || stores?.find((s) => s.id === selectedStoreId)?.name || "Cửa hàng";

    const { workbook, worksheet } = createReportWorkbook("Báo cáo xuất hàng");

    addReportHeader(worksheet, {
      storeName,
      title: "BẢNG KÊ CHI TIẾT BÁN HÀNG",
      fromDate,
      toDate,
    });

    // Columns setup
    worksheet.columns = [
      { key: "stt", width: 5 },
      { key: "shiftNo", width: 10 },
      { key: "date", width: 20 },
      { key: "productName", width: 25 },
      { key: "unit", width: 8 },
      { key: "quantity", width: 12 },
      { key: "price", width: 12 },
      { key: "amount", width: 15 },
      { key: "receiver", width: 15 },
    ];

    // Table Header (Row 7)
    const headerRow = worksheet.getRow(7);
    headerRow.values = [
      "STT",
      "Số CT",
      "Ngày tháng",
      "Tên hàng hóa",
      "Đơn vị",
      "Số lượng",
      "Đơn giá",
      "Thành tiền",
      "Người nhận",
    ];
    headerRow.font = STYLES.headerFont;
    headerRow.alignment = STYLES.centerAlign;
    headerRow.eachCell((cell) => {
      cell.border = STYLES.borderStyle;
    });

    // Data Processing & Grouping
    if (reportType === "product") {
      // Group by Product Name
      const groupedData: Record<string, any[]> = {};
      dataToExport.forEach((item: any) => {
        if (!groupedData[item.productName]) {
          groupedData[item.productName] = [];
        }
        groupedData[item.productName].push(item);
      });

      let totalAllAmount = 0;
      let totalAllQuantity = 0;

      Object.keys(groupedData).forEach((productName) => {
        const items = groupedData[productName];
        const subTotalQuantity = items.reduce((sum, item) => sum + Number(item.totalQuantity), 0);
        const subTotalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount), 0);

        // Product Group Header Row
        const groupRow = worksheet.addRow([
          productName, // STT -> Merged
          "", // ShiftNo
          "", // Date
          "", // Product Name
          "", // Unit
          subTotalQuantity,
          "", // Price
          subTotalAmount,
          "", // Receiver
        ]);

        worksheet.mergeCells(`A${groupRow.number}:D${groupRow.number}`);

        groupRow.font = STYLES.boldFont;
        groupRow.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber === 1) cell.alignment = STYLES.leftAlign;
          if (colNumber === 6 || colNumber === 8) {
            cell.numFmt = colNumber === 6 ? "#,##0.00" : "#,##0";
            cell.alignment = STYLES.rightAlign;
          }
        });

        // Detail Rows
        items.forEach((item: any, idx: number) => {
          const row = worksheet.addRow([
            idx + 1, // STT within group
            item.shiftNo, // Số CT
            dayjs(item.openedAt || item.shiftDate).format("DD/MM/YYYY HH:mm"), // Ngày tháng
            item.productName, // Tên hàng hóa
            "lít", // Đơn vị (defaulting to lít given context)
            Number(item.totalQuantity),
            Number(item.unitPrice),
            Number(item.totalAmount),
            "", // Người nhận
          ]);

          row.font = STYLES.normalFont;
          row.eachCell((cell, colNumber) => {
            cell.border = STYLES.borderStyle;
            if (colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 5) {
              cell.alignment = STYLES.centerAlign;
            } else if (colNumber === 4) {
              cell.alignment = STYLES.leftAlign;
            } else {
              cell.alignment = STYLES.rightAlign;
              if (colNumber === 6) cell.numFmt = "#,##0.00"; // Quantity
              else if (colNumber === 7 || colNumber === 8) cell.numFmt = "#,##0"; // Price, Amount
            }
          });
        });

        totalAllQuantity += subTotalQuantity;
        totalAllAmount += subTotalAmount;
      });

      // Total Row
      const totalRow = worksheet.addRow(["", "", "", "Cộng tổng", "", totalAllQuantity, "", totalAllAmount, ""]);
      totalRow.font = STYLES.boldFont;
      totalRow.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        if (colNumber === 4) cell.alignment = STYLES.centerAlign;
        if (colNumber === 6 || colNumber === 8) {
          cell.alignment = STYLES.rightAlign;
          cell.numFmt = colNumber === 6 ? "#,##0.00" : "#,##0";
        }
      });
      // Merge "Cộng tổng" label
      worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    } else {
      // Minimal fallback for by-pump view to avoid breaking
      let totalQuantity = 0;
      let totalAmount = 0;

      dataToExport.forEach((item: any, index: number) => {
        const row = worksheet.addRow([
          index + 1,
          `${item.pumpCode}`,
          dayjs(fromDate).format("DD/MM/YYYY"),
          item.productName,
          "lít",
          Number(item.totalQuantity),
          Number(item.unitPrice),
          Number(item.totalAmount),
          "",
        ]);

        totalQuantity += Number(item.totalQuantity);
        totalAmount += Number(item.totalAmount);

        row.font = STYLES.normalFont;
        row.eachCell((cell) => (cell.border = STYLES.borderStyle));
      });

      const totalRow = worksheet.addRow(["", "", "", "Tổng cộng", "", totalQuantity, "", totalAmount, ""]);
      totalRow.font = STYLES.boldFont;
      totalRow.eachCell((cell) => (cell.border = STYLES.borderStyle));
      worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    }

    addReportFooter(worksheet);
    await downloadExcel(workbook, "Bao_cao_xuat_hang");
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            Báo cáo xuất hàng
          </h1>
          <p className="mt-2 text-sm text-gray-600">Xem báo cáo xuất hàng theo cột bơm hoặc mặt hàng</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Xuất Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Store Selector (if applicable) */}
          {!user?.storeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cửa hàng</label>
              <div className="relative">
                <select
                  value={selectedStoreId || ""}
                  onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Chọn cửa hàng</option>
                  {stores?.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Report Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại báo cáo</label>
            <div className="flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setReportType("pump")}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                  reportType === "pump"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Theo vòi bơm
              </button>
              <button
                type="button"
                onClick={() => setReportType("product")}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r ${
                  reportType === "product"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Theo mặt hàng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {!selectedStoreId ? (
          <div className="p-12 text-center text-gray-500">
            <FunnelIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Vui lòng chọn cửa hàng để xem báo cáo</p>
          </div>
        ) : (
          <>
            {loadingPump || loadingProduct ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {reportType === "pump" ? (
                        <>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Vòi bơm
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Mặt hàng
                          </th>
                        </>
                      ) : (
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Mặt hàng
                        </th>
                      )}
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Đơn giá
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Số lượng (Lít)
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportType === "pump" &&
                      pumpReport?.map((item, index) => (
                        <tr key={`${item.pumpId}-${item.productName}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.pumpCode} - {item.pumpName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.productName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-mono">
                            {formatCurrency(Number(item.unitPrice))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                            {formatNumber(Number(item.totalQuantity))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold font-mono">
                            {formatCurrency(Number(item.totalAmount))}
                          </td>
                        </tr>
                      ))}

                    {reportType === "product" &&
                      productReport?.map((item, index) => (
                        <tr key={`${item.productId}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.productName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-mono">
                            {formatCurrency(Number(item.unitPrice))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                            {formatNumber(Number(item.totalQuantity))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold font-mono">
                            {formatCurrency(Number(item.totalAmount))}
                          </td>
                        </tr>
                      ))}

                    {/* Summary Row */}
                    <tr className="bg-gray-50 font-bold">
                      <td
                        colSpan={reportType === "pump" ? 3 : 2}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"
                      >
                        Tổng cộng:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                        {formatNumber(
                          (reportType === "pump" ? pumpReport : productReport)?.reduce(
                            (sum, item) => sum + Number(item.totalQuantity),
                            0
                          ) || 0
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-mono">
                        {formatCurrency(
                          (reportType === "pump" ? pumpReport : productReport)?.reduce(
                            (sum, item) => sum + Number(item.totalAmount),
                            0
                          ) || 0
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {((reportType === "pump" && (!pumpReport || pumpReport.length === 0)) ||
                  (reportType === "product" && (!productReport || productReport.length === 0))) && (
                  <div className="p-12 text-center text-gray-500">Không có dữ liệu trong khoảng thời gian này</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesReportPage;
