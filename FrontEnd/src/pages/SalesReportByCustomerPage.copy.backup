import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api/reports";
import type { SalesByCustomerItem } from "../api/reports";
import { storesApi } from "../api/stores";
import { customersApi } from "../api/customers";
import { productsApi } from "../api/products";
import { useAuth } from "../contexts/AuthContext";
import {
  UsersIcon,
  FunnelIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChartBarIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import {
  createReportWorkbook,
  addReportHeader,
  STYLES,
} from "../utils/report-exporter";
import { printReport } from "../utils/report-printer";
import DateRangePicker from "../components/DateRangePicker";
import SearchableSelect from "../components/SearchableSelect";

const SalesReportByCustomerPage: React.FC = () => {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(user?.storeId);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const [selectedPriceId, setSelectedPriceId] = useState<number | undefined>(undefined);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Fetch stores for admin/accountant/sales
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId,
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["customers", selectedStoreId],
    queryFn: () => customersApi.getAll(selectedStoreId),
  });

  // Get selected store's regionId
  const selectedStore = stores?.find(s => s.id === selectedStoreId) || user?.store;
  const regionId = (selectedStore as any)?.regionId;

  // Fetch prices for the selected store's region
  const { data: allPrices, isLoading: loadingPrices } = useQuery({
    queryKey: ['region-prices', regionId],
    queryFn: async () => {
      console.log('Fetching prices for regionId:', regionId);
      const prices = await productsApi.getPricesByRegion(regionId!);
      console.log('Prices loaded:', prices);
      return prices;
    },
    enabled: !!regionId && !!selectedStoreId,
  });

  React.useEffect(() => {
    console.log('Selected Store:', selectedStore);
    console.log('Region ID:', regionId);
    console.log('All Prices:', allPrices);
  }, [selectedStore, regionId, allPrices]);

  // Reset selected price when store changes
  React.useEffect(() => {
    setSelectedPriceId(undefined);
  }, [selectedStoreId]);

  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["sales-report-by-customer", selectedStoreId, selectedCustomerId, fromDate, toDate, selectedPriceId],
    queryFn: () =>
      reportsApi.getSalesByCustomer({
        storeId: selectedStoreId,
        customerId: selectedCustomerId,
        fromDate,
        toDate,
        priceId: selectedPriceId,
      }),
    enabled: !!selectedStoreId || !!selectedCustomerId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(num);
  };

  const toggleRow = (customerId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedRows(newExpanded);
  };

  const handleExportExcel = async () => {
    if (!reportData || reportData.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    const storeName = user?.store?.name || stores?.find((s) => s.id === selectedStoreId)?.name || "Tất cả cửa hàng";

    const { workbook, worksheet } = createReportWorkbook("Báo cáo xuất hàng theo khách hàng");

    addReportHeader(worksheet, {
      storeName,
      title: "BÁO CÁO XUẤT HÀNG THEO KHÁCH HÀNG",
      fromDate,
      toDate,
    });

    // Columns setup
    worksheet.columns = [
      { key: "stt", width: 5 },
      { key: "customerCode", width: 12 },
      { key: "customerName", width: 30 },
      { key: "customerType", width: 12 },
      { key: "productName", width: 25 },
      { key: "quantity", width: 15 },
      { key: "unitPrice", width: 15 },
      { key: "amount", width: 18 },
    ];


    // Table Header
    const headerRow = worksheet.getRow(7);
    headerRow.values = [
      "STT",
      "Mã KH",
      "Tên khách hàng",
      "Loại KH",
      "Mặt hàng",
      "Số lượng (lít)",
      "Đơn giá",
      "Thành tiền",
    ];
    headerRow.font = STYLES.headerFont;
    headerRow.alignment = STYLES.centerAlign;
    headerRow.eachCell((cell) => {
      cell.border = STYLES.borderStyle;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9E1F2" },
      };
    });

    let rowIndex = 0;
    let grandTotalQuantity = 0;
    let grandTotalAmount = 0;

    reportData.forEach((customer: SalesByCustomerItem, customerIdx: number) => {
      rowIndex++;

      // Customer Summary Row
      const customerRow = worksheet.addRow([
        rowIndex,
        customer.customerCode,
        customer.customerName,
        customer.customerType === "INTERNAL" ? "Nội bộ" : "Bên ngoài",
        "",
        customer.totalQuantity,
        "",
        customer.totalAmount,
      ]);

      customerRow.font = STYLES.boldFont;
      customerRow.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        if (colNumber === 6 || colNumber === 8) {
          cell.numFmt = colNumber === 6 ? "#,##0.000" : "#,##0";
          cell.alignment = STYLES.rightAlign;
        }
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: customer.customerType === "INTERNAL" ? "FFF4E5D4" : "FFE2EFD9" },
        };
      });

      // Product Details
      customer.products.forEach((product, productIdx) => {
        const detailRow = worksheet.addRow([
          "",
          "",
          "",
          "",
          product.productName,
          product.quantity,
          product.unitPrice,
          product.amount,
        ]);

        detailRow.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber === 5) {
            cell.alignment = { ...STYLES.leftAlign, indent: 2 };
          }
          if (colNumber === 6) {
            cell.numFmt = "#,##0.000";
            cell.alignment = STYLES.rightAlign;
          }
          if (colNumber === 7 || colNumber === 8) {
            cell.numFmt = "#,##0";
            cell.alignment = STYLES.rightAlign;
          }
        });
      });

      grandTotalQuantity += customer.totalQuantity;
      grandTotalAmount += customer.totalAmount;
    });

    // Grand Total Row
    const totalRow = worksheet.addRow([
      "",
      "",
      "",
      "TỔNG CỘNG:",
      "",
      grandTotalQuantity,
      "",
      grandTotalAmount,
    ]);

    worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    totalRow.font = { ...STYLES.boldFont, size: 12 };
    totalRow.eachCell((cell, colNumber) => {
      cell.border = STYLES.borderStyle;
      if (colNumber === 1) {
        cell.alignment = STYLES.rightAlign;
      }
      if (colNumber === 6 || colNumber === 8) {
        cell.numFmt = colNumber === 6 ? "#,##0.000" : "#,##0";
        cell.alignment = STYLES.rightAlign;
      }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD966" },
      };
    });

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao_cao_xuat_hang_theo_khach_hang_${dayjs(fromDate).format("YYYYMMDD")}_${dayjs(toDate).format("YYYYMMDD")}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!reportData || reportData.length === 0) {
      alert("Không có dữ liệu để in");
      return;
    }

    const storeName = user?.store?.name || stores?.find((s) => s.id === selectedStoreId)?.name || "Tất cả cửa hàng";

    const tableHTML = `
        <table class="report-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã KH</th>
              <th>Tên khách hàng</th>
              <th>Loại KH</th>
              <th>Mặt hàng</th>
              <th>Số lượng (lít)</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${reportData
        .map(
          (customer: SalesByCustomerItem, idx: number) => `
              <tr class="customer-row">
                <td>${idx + 1}</td>
                <td>${customer.customerCode}</td>
                <td><strong>${customer.customerName}</strong></td>
                <td>${customer.customerType === "INTERNAL" ? "Nội bộ 🏠" : "Bên ngoài"}</td>
                <td></td>
                <td class="text-right"><strong>${formatNumber(customer.totalQuantity)}</strong></td>
                <td></td>
                <td class="text-right"><strong>${formatCurrency(customer.totalAmount)}</strong></td>
              </tr>
              ${customer.products
              .map(
                (product) => `
                <tr class="product-detail-row">
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td style="padding-left: 20px;">${product.productName}</td>
                  <td class="text-right">${formatNumber(product.quantity)}</td>
                  <td class="text-right">${formatCurrency(product.unitPrice)}</td>
                  <td class="text-right">${formatCurrency(product.amount)}</td>
                </tr>
              `
              )
              .join("")}
            `
        )
        .join("")}
            <tr class="total-row">
              <td colspan="5" class="text-right"><strong>TỔNG CỘNG:</strong></td>
              <td class="text-right"><strong>${formatNumber(
          reportData.reduce((sum: number, c: SalesByCustomerItem) => sum + c.totalQuantity, 0)
        )}</strong></td>
              <td></td>
              <td class="text-right"><strong>${formatCurrency(
          reportData.reduce((sum: number, c: SalesByCustomerItem) => sum + c.totalAmount, 0)
        )}</strong></td>
            </tr>
          </tbody>
        </table>
        <style>
          .customer-row {
            background-color: #f0f9ff;
            font-weight: 600;
          }
          .product-detail-row {
            background-color: #fafafa;
          }
          .total-row {
            background-color: #fef3c7;
            font-weight: bold;
            font-size: 14px;
          }
        </style>
      `;

    printReport(tableHTML, {
      title: "BÁO CÁO XUẤT HÀNG THEO KHÁCH HÀNG",
      storeName,
      fromDate,
      toDate,
    });
  };

  const totalQuantity = reportData?.reduce((sum, c) => sum + c.totalQuantity, 0) || 0;
  const totalAmount = reportData?.reduce((sum, c) => sum + c.totalAmount, 0) || 0;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <UsersIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Báo cáo Xuất hàng theo Khách hàng</h1>
              <p className="text-sm text-gray-600">Theo dõi chi tiết xuất hàng cho từng khách hàng</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isLoading || !reportData || reportData.length === 0}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Xuất Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={isLoading || !reportData || reportData.length === 0}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Store Filter */}
          {!user?.storeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BuildingStorefrontIcon className="h-4 w-4 inline mr-1" />
                Cửa hàng
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: '-- Tất cả cửa hàng --' },
                  ...(stores?.map((store) => ({
                    value: store.id,
                    label: `${store.code} - ${store.name}`,
                  })) || [])
                ]}
                value={selectedStoreId}
                onChange={(value) => setSelectedStoreId(value as number | undefined)}
                placeholder="-- Tất cả cửa hàng --"
                isClearable
              />
            </div>
          )}

          {/* Customer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UsersIcon className="h-4 w-4 inline mr-1" />
              Khách hàng
            </label>
            <SearchableSelect
              options={
                customers?.map((c) => ({
                  value: c.id,
                  label: `${c.code} - ${c.name}${c.type === "INTERNAL" ? " 🏠" : ""}`,
                })) || []
              }
              value={selectedCustomerId}
              onChange={(value) => setSelectedCustomerId(value as number | undefined)}
              placeholder="-- Tất cả khách hàng --"
              isClearable
            />
          </div>

          {/* Date Range */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              Khoảng thời gian
            </label>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              label=""
            />
          </div>

          {/* Price Period Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FunnelIcon className="h-4 w-4 inline mr-1" />
              Kỳ giá {loadingPrices && <span className="text-xs text-gray-500">(Đang tải...)</span>}
            </label>
            <SearchableSelect
              options={[
                { value: '', label: 'Tất cả kỳ giá' },
                ...(allPrices?.map((price) => ({
                  value: price.id,
                  label: `${price.product?.name} - ${price.region?.name} (${new Intl.NumberFormat('vi-VN').format(price.price)}đ) - ${new Date(price.validFrom).toLocaleDateString('vi-VN')}`,
                })) || [])
              ]}
              value={selectedPriceId}
              onChange={(value) => setSelectedPriceId(value as number | undefined)}
              placeholder="Tất cả kỳ giá"
              isClearable
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Số khách hàng</p>
              <p className="text-2xl font-bold text-blue-600">{reportData?.length || 0}</p>
            </div>
            <UsersIcon className="h-10 w-10 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Tổng số lượng (lít)</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(totalQuantity)}</p>
            </div>
            <ChartBarIcon className="h-10 w-10 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Tổng tiền</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalAmount)}</p>
            </div>
            <BanknotesIcon className="h-10 w-10 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : reportData && reportData.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase w-12">STT</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase w-32">Mã KH</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Tên khách hàng</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase w-32">Loại KH</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase w-40">
                    Số lượng (lít)
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase w-48">Thành tiền</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.map((customer, idx) => {
                  const isExpanded = expandedRows.has(customer.customerId);
                  const isInternal = customer.customerType === "INTERNAL";

                  return (
                    <React.Fragment key={customer.customerId}>
                      {/* Customer Summary Row */}
                      <tr
                        className={`cursor-pointer transition-colors ${isInternal
                          ? "bg-amber-50 hover:bg-amber-100"
                          : "bg-green-50 hover:bg-green-100"
                          }`}
                        onClick={() => toggleRow(customer.customerId)}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.customerCode}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className="text-sm font-bold text-gray-900">{customer.customerName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${isInternal
                              ? "bg-amber-200 text-amber-800"
                              : "bg-green-200 text-green-800"
                              }`}
                          >
                            {isInternal ? "🏠 Nội bộ" : "Bên ngoài"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">
                          {formatNumber(customer.totalQuantity)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-green-600">
                          {formatCurrency(customer.totalAmount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isExpanded ? (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500 mx-auto" />
                          ) : (
                            <ChevronRightIcon className="h-5 w-5 text-gray-500 mx-auto" />
                          )}
                        </td>
                      </tr>

                      {/* Product Details (Expandable) */}
                      {isExpanded &&
                        customer.products.map((product, productIdx) => (
                          <tr key={`${customer.customerId}-${product.productId}`} className="bg-white hover:bg-gray-50">
                            <td></td>
                            <td></td>
                            <td className="px-6 py-3 pl-12">
                              <div className="flex items-center text-sm text-gray-700">
                                <div className="h-2 w-2 bg-blue-400 rounded-full mr-3"></div>
                                {product.productName}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-center text-xs text-gray-500">
                              {product.saleType === "DEBT" ? "Bán nợ" : "Bán lẻ"}
                            </td>
                            <td className="px-6 py-3 text-right text-sm text-gray-700">
                              {formatNumber(product.quantity)}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="text-sm text-gray-700">{formatCurrency(product.amount)}</div>
                              <div className="text-xs text-gray-500">
                                @ {formatCurrency(product.unitPrice)}/lít
                              </div>
                            </td>
                            <td></td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}

                {/* Total Row */}
                <tr className="bg-yellow-50 font-bold border-t-2 border-yellow-200">
                  <td colSpan={4} className="px-6 py-4 text-right text-sm uppercase text-gray-800">
                    TỔNG CỘNG:
                  </td>
                  <td className="px-6 py-4 text-right text-base text-blue-700">{formatNumber(totalQuantity)}</td>
                  <td className="px-6 py-4 text-right text-base text-green-700">{formatCurrency(totalAmount)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">Không có dữ liệu</p>
              <p className="text-gray-400 text-sm mt-2">Vui lòng chọn bộ lọc và thử lại</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReportByCustomerPage;
