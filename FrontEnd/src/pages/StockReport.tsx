import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { storesApi } from "../api/stores";
import { inventoryApi } from "../api/inventory";
import {
  createReportWorkbook,
  addReportHeader,
  addReportFooter,
  downloadExcel,
  STYLES,
} from "../utils/report-exporter";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";

const StockReport: React.FC = () => {
  const { user } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(user?.storeId || null);

  const isStoreUser = user?.roleCode === "STORE";

  // Fetch Stores
  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: storesApi.getAll,
  });

  // Fetch Report
  const {
    data: report,
    isLoading: loading,
    error: reportError,
  } = useQuery({
    queryKey: ["stock-report", selectedStoreId],
    queryFn: () => inventoryApi.getStockReport(selectedStoreId!),
    enabled: !!selectedStoreId,
  });

  // Auto-select store for store users if not already set
  useEffect(() => {
    if (isStoreUser && user?.storeId && selectedStoreId !== user.storeId) {
      setSelectedStoreId(user.storeId);
    }
  }, [isStoreUser, user, selectedStoreId]);

  const handleStoreChange = (storeId: number) => {
    setSelectedStoreId(storeId);
  };

  const calculateTotalStock = () => {
    if (!report || !report.products) return 0;
    return report.products.reduce((sum: number, p: any) => sum + p.totalStock, 0);
  };

  const handleExportExcel = async () => {
    if (!report || !report.products || report.products.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    const storeName = stores.find((s: any) => s.id === report.storeId)?.name || `Cửa hàng #${report.storeId}`;
    const { workbook, worksheet } = createReportWorkbook("Báo cáo tồn kho");

    addReportHeader(worksheet, {
      storeName: storeName,
      title: "BÁO CÁO TỒN KHO",
      fromDate: dayjs(report.reportDate).format("YYYY-MM-DD") + " 00:00",
      toDate: dayjs(report.reportDate).format("YYYY-MM-DD") + " 23:59",
      customerName: storeName,
    });

    // Columns
    worksheet.columns = [
      { key: "stt", width: 5 },
      { key: "productCode", width: 15 },
      { key: "productName", width: 30 },
      { key: "quantity", width: 15 },
      { key: "unit", width: 10 },
    ];

    // Header Row
    const headerRow = worksheet.getRow(7);
    headerRow.values = ["STT", "Mã hàng", "Tên hàng hóa", "Số lượng tồn", "Đơn vị"];
    headerRow.font = STYLES.headerFont;
    headerRow.alignment = STYLES.centerAlign;
    headerRow.eachCell((cell) => {
      cell.border = STYLES.borderStyle;
    });

    // Data
    report.products.forEach((item: any, index: number) => {
      const row = worksheet.addRow([index + 1, item.productCode, item.productName, item.totalStock, item.unit]);
      row.font = STYLES.normalFont;
      row.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        if (colNumber === 1 || colNumber === 2 || colNumber === 5) {
          cell.alignment = STYLES.centerAlign;
        } else if (colNumber === 3) {
          cell.alignment = STYLES.leftAlign;
        } else {
          cell.alignment = STYLES.rightAlign;
          cell.numFmt = "#,##0.00";
        }
      });
    });

    // Total
    const totalRow = worksheet.addRow(["", "", "TỔNG CỘNG", calculateTotalStock(), "lít"]);
    totalRow.font = STYLES.boldFont;
    totalRow.eachCell((cell, colNumber) => {
      cell.border = STYLES.borderStyle;
      if (colNumber === 3) cell.alignment = STYLES.rightAlign;
      if (colNumber === 4) {
        cell.alignment = STYLES.rightAlign;
        cell.numFmt = "#,##0.00";
      }
      if (colNumber === 5) cell.alignment = STYLES.centerAlign;
    });
    worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);

    addReportFooter(worksheet, {
      signatures: {
        left: "Người lập",
        center: "",
        right: "Cửa hàng trưởng",
      },
    });

    await downloadExcel(workbook, "Bao_cao_ton_kho");
  };

  const error = reportError
    ? (reportError as any).response?.data?.message || (reportError as Error).message || "Không thể tải báo cáo"
    : null;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📊 Báo Cáo Tồn Kho</h1>
        <button
          onClick={handleExportExcel}
          disabled={!report}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Xuất Excel
        </button>
      </div>

      {/* Chọn cửa hàng */}
      <div className="mb-6 bg-white shadow-md rounded px-6 py-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Chọn cửa hàng
          {isStoreUser && <span className="ml-2 text-xs text-gray-500">(Chỉ xem cửa hàng của bạn)</span>}
        </label>
        <select
          className="shadow border rounded w-full md:w-1/2 py-2 px-3 text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={selectedStoreId || ""}
          onChange={(e) => handleStoreChange(Number(e.target.value))}
          disabled={isStoreUser}
        >
          <option value="">-- Chọn cửa hàng --</option>
          {stores
            .filter((store: any) => !isStoreUser || store.id === user?.storeId)
            .map((store: any) => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.code})
              </option>
            ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">⏳ Đang tải báo cáo...</p>
        </div>
      )}

      {/* Error */}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">❌ {error}</div>}

      {/* Report */}
      {report && !loading && (
        <div className="bg-white shadow-md rounded overflow-hidden">
          {/* Header */}
          <div className="bg-blue-500 text-white px-6 py-4">
            <h2 className="text-xl font-bold">
              {stores.find((s: any) => s.id === report.storeId)?.name || `Cửa hàng #${report.storeId}`}
            </h2>
            <p className="text-sm opacity-90">Ngày báo cáo: {new Date(report.reportDate).toLocaleString("vi-VN")}</p>
          </div>

          {/* Products Table */}
          {!report.products || report.products.length === 0 ? (
            <div className="p-6 text-center text-gray-500">📭 Chưa có dữ liệu tồn kho</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã SP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên Sản Phẩm
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tồn Kho
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Đơn Vị
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.products.map((product: any, index: number) => (
                    <tr key={product.productId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.productCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.productName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        <span className={product.totalStock > 0 ? "text-green-600" : "text-gray-400"}>
                          {product.totalStock.toLocaleString("vi-VN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 3,
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{product.unit}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      TỔNG CỘNG:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-blue-600">
                      {calculateTotalStock().toLocaleString("vi-VN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 3,
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-500">lít</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Help */}
      {!selectedStoreId && (
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <h3 className="font-bold mb-2">💡 Lưu ý:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Báo cáo hiển thị tổng tồn kho theo từng mặt hàng</li>
            <li>
              <strong>Không phân biệt bể chứa</strong> - chỉ tổng hợp theo sản phẩm
            </li>
            <li>Tồn kho được tính từ tất cả giao dịch nhập/xuất trong hệ thống</li>
            <li>Dữ liệu cập nhật theo thời gian thực</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default StockReport;
