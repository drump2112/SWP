import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Select from "react-select";
import DateTimeRangePicker from "../components/DateTimeRangePicker";
import {
  reportsApi,
  type RevenueSalesReportParams,
  type SalesByCustomerReportParams,
} from "../api/reports";
import { storesApi } from "../api/stores";
import { productsApi } from "../api/products";
import { customersApi } from "../api/customers";
import { useAuth } from "../contexts/AuthContext";
import {
  ChartBarIcon,
  FunnelIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import {
  createReportWorkbook,
  addReportHeader,
  downloadExcel,
  STYLES,
} from "../utils/report-exporter";
import { printReport } from "../utils/report-printer";

type TabType = "store" | "customer";

const RevenueSalesReportPage: React.FC = () => {
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("store");

  // Filter states cho tab Cửa hàng
  const [fromDateTime, setFromDateTime] = useState(
    dayjs().startOf("month").format("YYYY-MM-DDTHH:mm")
  );
  const [toDateTime, setToDateTime] = useState(
    dayjs().format("YYYY-MM-DDTHH:mm")
  );
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    user?.storeId
  );
  const [selectedProductId, setSelectedProductId] = useState<
    number | undefined
  >(undefined);

  // Filter states cho tab Khách hàng
  const [customerFromDateTime, setCustomerFromDateTime] = useState(
    dayjs().startOf("month").format("YYYY-MM-DDTHH:mm")
  );
  const [customerToDateTime, setCustomerToDateTime] = useState(
    dayjs().format("YYYY-MM-DDTHH:mm")
  );
  const [customerSelectedStoreId, setCustomerSelectedStoreId] = useState<
    number | undefined
  >(user?.storeId);
  const [selectedCustomerId, setSelectedCustomerId] = useState<
    number | undefined
  >(undefined);
  const [customerSelectedProductId, setCustomerSelectedProductId] = useState<
    number | undefined
  >(undefined);

  // Expanded states
  const [expandedStores, setExpandedStores] = useState<Set<number>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(
    new Set()
  );

  // Fetch stores
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.getAll(),
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.getAll(),
  });

  // Fetch price periods (kỳ giá)
  const { data: pricePeriods } = useQuery({
    queryKey: ["price-periods"],
    queryFn: () => reportsApi.getPricePeriods(),
  });

  // Build query params cho tab Cửa hàng (không cần priceId vì đã set thời gian)
  const queryParams: RevenueSalesReportParams = {
    ...(fromDateTime && { fromDateTime }),
    ...(toDateTime && { toDateTime }),
    ...(selectedStoreId && { storeId: selectedStoreId }),
    ...(selectedProductId && { productId: selectedProductId }),
  };

  // Fetch report data cho tab Cửa hàng
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["revenue-sales-report", queryParams],
    queryFn: () => reportsApi.getRevenueSalesReport(queryParams),
    enabled: activeTab === "store",
  });

  // Build query params cho tab Khách hàng
  const customerQueryParams: SalesByCustomerReportParams = {
    ...(customerFromDateTime && { fromDateTime: customerFromDateTime }),
    ...(customerToDateTime && { toDateTime: customerToDateTime }),
    ...(customerSelectedStoreId && { storeId: customerSelectedStoreId }),
    ...(selectedCustomerId && { customerId: selectedCustomerId }),
    ...(customerSelectedProductId && { productId: customerSelectedProductId }),
  };

  // Fetch report data cho tab Khách hàng
  const {
    data: customerReportData,
    isLoading: customerIsLoading,
    error: customerError,
    refetch: customerRefetch,
  } = useQuery({
    queryKey: ["sales-by-customer-report", customerQueryParams],
    queryFn: () => reportsApi.getSalesByCustomerReport(customerQueryParams),
    enabled: activeTab === "customer",
  });

  // Toggle functions
  const toggleStore = (storeId: number) => {
    const newSet = new Set(expandedStores);
    if (newSet.has(storeId)) {
      newSet.delete(storeId);
    } else {
      newSet.add(storeId);
    }
    setExpandedStores(newSet);
  };

  const toggleCustomer = (customerId: number) => {
    const newSet = new Set(expandedCustomers);
    if (newSet.has(customerId)) {
      newSet.delete(customerId);
    } else {
      newSet.add(customerId);
    }
    setExpandedCustomers(newSet);
  };

  // Expand/Collapse all
  const expandAll = () => {
    if (activeTab === "store" && reportData?.stores) {
      const storeIds = new Set(reportData.stores.map((s) => s.storeId));
      setExpandedStores(storeIds);
    } else if (activeTab === "customer" && customerReportData?.customers) {
      const customerIds = new Set(
        customerReportData.customers.map((c) => c.customerId)
      );
      setExpandedCustomers(customerIds);
    }
  };

  const collapseAll = () => {
    if (activeTab === "store") {
      setExpandedStores(new Set());
    } else {
      setExpandedCustomers(new Set());
    }
  };

  // Format helpers
  const formatNumber = (num: number | null | undefined) => {
    return (num || 0).toLocaleString("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return (amount || 0).toLocaleString("vi-VN");
  };

  // Export to Excel - Tab Cửa hàng
  const handleExportExcel = async () => {
    if (!reportData || !reportData.stores.length) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    const { workbook, worksheet } = createReportWorkbook("Báo cáo doanh thu");

    const selectedStore = selectedStoreId
      ? stores?.find((s) => s.id === selectedStoreId)
      : undefined;

    addReportHeader(worksheet, {
      title: "BÁO CÁO DOANH THU / XUẤT HÀNG",
      storeName: selectedStore?.name,
      fromDate: fromDateTime,
      toDate: toDateTime,
    });

    // Table header - 2 dòng header
    // Row 1: Group headers (Công nợ → Bán lẻ → Tổng xuất)
    const headerRow1 = worksheet.addRow([
      "Cửa hàng / Mặt hàng",
      "Công nợ", "",
      "Bán lẻ", "",
      "Tổng xuất", "",
    ]);
    headerRow1.font = STYLES.headerFont;
    headerRow1.alignment = STYLES.centerAlign;
    headerRow1.eachCell((cell, colNumber) => {
      cell.border = STYLES.borderStyle;
      if (colNumber === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
      } else if (colNumber >= 2 && colNumber <= 3) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFED7AA" } }; // orange - Công nợ
      } else if (colNumber >= 4 && colNumber <= 5) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBBF7D0" } }; // green - Bán lẻ
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } }; // blue - Tổng
      }
    });
    // Merge cells for group headers
    worksheet.mergeCells(headerRow1.number, 2, headerRow1.number, 3);
    worksheet.mergeCells(headerRow1.number, 4, headerRow1.number, 5);
    worksheet.mergeCells(headerRow1.number, 6, headerRow1.number, 7);

    // Row 2: Sub headers
    const headerRow2 = worksheet.addRow([
      "",
      "Lượng (lít)", "Tiền (₫)",
      "Lượng (lít)", "Tiền (₫)",
      "Lượng (lít)", "Tiền (₫)",
    ]);
    headerRow2.font = STYLES.headerFont;
    headerRow2.alignment = STYLES.centerAlign;
    headerRow2.eachCell((cell, colNumber) => {
      cell.border = STYLES.borderStyle;
      if (colNumber === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
      } else if (colNumber >= 2 && colNumber <= 3) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFED7AA" } }; // orange
      } else if (colNumber >= 4 && colNumber <= 5) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBBF7D0" } }; // green
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } }; // blue
      }
    });

    // Data rows (Công nợ → Bán lẻ → Tổng)
    reportData.stores.forEach((store) => {
      const storeRow = worksheet.addRow([
        `${store.storeCode} - ${store.storeName}`,
        store.debtQuantity,
        store.debtAmount,
        store.retailQuantity,
        store.retailAmount,
        store.totalQuantity,
        store.totalAmount,
      ]);
      storeRow.font = STYLES.boldFont;
      storeRow.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF3C7" },
        };
        if (colNumber === 2 || colNumber === 4 || colNumber === 6) {
          cell.numFmt = "#,##0.00";
          cell.alignment = STYLES.rightAlign;
        }
        if (colNumber === 3 || colNumber === 5 || colNumber === 7) {
          cell.numFmt = "#,##0";
          cell.alignment = STYLES.rightAlign;
        }
      });

      store.products.forEach((product) => {
        const productRow = worksheet.addRow([
          `    ${product.productCode} - ${product.productName}`,
          product.debtQuantity,
          product.debtAmount,
          product.retailQuantity,
          product.retailAmount,
          product.totalQuantity,
          product.totalAmount,
        ]);
        productRow.font = STYLES.normalFont;
        productRow.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber === 2 || colNumber === 4 || colNumber === 6) {
            cell.numFmt = "#,##0.00";
            cell.alignment = STYLES.rightAlign;
          }
          if (colNumber === 3 || colNumber === 5 || colNumber === 7) {
            cell.numFmt = "#,##0";
            cell.alignment = STYLES.rightAlign;
          }
        });
      });
    });

    // Total row
    const totalRow = worksheet.addRow([
      "TỔNG CỘNG",
      reportData.summary.debtQuantity,
      reportData.summary.debtAmount,
      reportData.summary.retailQuantity,
      reportData.summary.retailAmount,
      reportData.summary.totalQuantity,
      reportData.summary.totalAmount,
    ]);
    totalRow.font = STYLES.boldFont;
    totalRow.eachCell((cell, colNumber) => {
      cell.border = STYLES.borderStyle;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD966" },
      };
      if (colNumber === 2 || colNumber === 4 || colNumber === 6) {
        cell.numFmt = "#,##0.00";
        cell.alignment = STYLES.rightAlign;
      }
      if (colNumber === 3 || colNumber === 5 || colNumber === 7) {
        cell.numFmt = "#,##0";
        cell.alignment = STYLES.rightAlign;
      }
    });

    worksheet.columns = [
      { width: 40 },
      { width: 15 }, { width: 18 },
      { width: 15 }, { width: 18 },
      { width: 15 }, { width: 18 },
    ];

    downloadExcel(workbook, "bao-cao-doanh-thu");
  };

  // Print - Tab Cửa hàng
  const handlePrint = () => {
    if (!reportData || !reportData.stores.length) {
      alert("Không có dữ liệu để in");
      return;
    }

    let tableHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr>
            <th rowspan="2" style="border: 2px solid #000; padding: 8px; text-align: left; background-color: #d9e1f2; vertical-align: middle;">Cửa hàng / Mặt hàng</th>
            <th colspan="2" style="border: 2px solid #000; padding: 6px; text-align: center; background-color: #fed7aa; font-weight: bold;">Công nợ</th>
            <th colspan="2" style="border: 2px solid #000; padding: 6px; text-align: center; background-color: #bbf7d0; font-weight: bold;">Bán lẻ</th>
            <th colspan="2" style="border: 2px solid #000; padding: 6px; text-align: center; background-color: #dbeafe; font-weight: bold;">Tổng xuất</th>
          </tr>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #000; border-left: 2px solid #000; padding: 4px; text-align: right; font-weight: bold;">Lượng</th>
            <th style="border: 1px solid #000; border-right: 2px solid #000; padding: 4px; text-align: right; font-weight: bold;">Tiền</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Lượng</th>
            <th style="border: 1px solid #000; border-right: 2px solid #000; padding: 4px; text-align: right; font-weight: bold;">Tiền</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Lượng</th>
            <th style="border: 1px solid #000; border-right: 2px solid #000; padding: 4px; text-align: right; font-weight: bold;">Tiền</th>
          </tr>
        </thead>
        <tbody>
    `;

    reportData.stores.forEach((store) => {
      tableHTML += `
        <tr style="background-color: #fef3c7; font-weight: bold;">
          <td style="border: 1px solid #000; border-left: 2px solid #000; padding: 6px;">${store.storeCode} - ${store.storeName}</td>
          <td style="border: 1px solid #000; border-left: 2px solid #000; padding: 6px; text-align: right; color: #c2410c;">${formatNumber(store.debtQuantity)}</td>
          <td style="border: 1px solid #000; border-right: 2px solid #000; padding: 6px; text-align: right; color: #ea580c;">${formatCurrency(store.debtAmount)}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #16a34a;">${formatNumber(store.retailQuantity)}</td>
          <td style="border: 1px solid #000; border-right: 2px solid #000; padding: 6px; text-align: right; color: #22c55e;">${formatCurrency(store.retailAmount)}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #1d4ed8; background-color: #eff6ff;">${formatNumber(store.totalQuantity)}</td>
          <td style="border: 1px solid #000; border-right: 2px solid #000; padding: 6px; text-align: right; color: #2563eb; background-color: #eff6ff;">${formatCurrency(store.totalAmount)}</td>
        </tr>
      `;
      store.products.forEach((product) => {
        tableHTML += `
          <tr>
            <td style="border: 1px solid #000; border-left: 2px solid #000; padding: 6px; padding-left: 20px;">${product.productCode} - ${product.productName}</td>
            <td style="border: 1px solid #000; border-left: 2px solid #000; padding: 6px; text-align: right; color: #c2410c;">${formatNumber(product.debtQuantity)}</td>
            <td style="border: 1px solid #000; border-right: 2px solid #000; padding: 6px; text-align: right; color: #ea580c;">${formatCurrency(product.debtAmount)}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #16a34a;">${formatNumber(product.retailQuantity)}</td>
            <td style="border: 1px solid #000; border-right: 2px solid #000; padding: 6px; text-align: right; color: #22c55e;">${formatCurrency(product.retailAmount)}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #1d4ed8; background-color: #f0f9ff;">${formatNumber(product.totalQuantity)}</td>
            <td style="border: 1px solid #000; border-right: 2px solid #000; padding: 6px; text-align: right; color: #2563eb; background-color: #f0f9ff;">${formatCurrency(product.totalAmount)}</td>
          </tr>
        `;
      });
    });

    tableHTML += `
          <tr style="background-color: #ffd966; font-weight: bold;">
            <td style="border: 2px solid #000; padding: 8px;">TỔNG CỘNG</td>
            <td style="border: 1px solid #000; border-left: 2px solid #000; padding: 8px; text-align: right;">${formatNumber(reportData.summary.debtQuantity)}</td>
            <td style="border: 1px solid #000; border-right: 2px solid #000; padding: 8px; text-align: right;">${formatCurrency(reportData.summary.debtAmount)}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatNumber(reportData.summary.retailQuantity)}</td>
            <td style="border: 1px solid #000; border-right: 2px solid #000; padding: 8px; text-align: right;">${formatCurrency(reportData.summary.retailAmount)}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatNumber(reportData.summary.totalQuantity)}</td>
            <td style="border: 2px solid #000; padding: 8px; text-align: right;">${formatCurrency(reportData.summary.totalAmount)}</td>
          </tr>
        </tbody>
      </table>
    `;

    const selectedStore = selectedStoreId
      ? stores?.find((s) => s.id === selectedStoreId)
      : undefined;

    printReport(tableHTML, {
      title: "BÁO CÁO DOANH THU / XUẤT HÀNG",
      storeName: selectedStore?.name,
      fromDate: fromDateTime,
      toDate: toDateTime,
      signatures: {
        left: "Người lập",
        center: "Kế toán",
        right: "Giám đốc",
      },
    });
  };

  // Export to Excel - Tab Khách hàng
  const handleCustomerExportExcel = async () => {
    if (!customerReportData || !customerReportData.customers.length) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    const { workbook, worksheet } = createReportWorkbook("Báo cáo theo khách hàng");

    const selectedStore = customerSelectedStoreId
      ? stores?.find((s) => s.id === customerSelectedStoreId)
      : undefined;

    addReportHeader(worksheet, {
      title: "BÁO CÁO DOANH THU THEO KHÁCH HÀNG",
      storeName: selectedStore?.name,
      fromDate: customerFromDateTime,
      toDate: customerToDateTime,
    });

    // Table header
    const headerRow = worksheet.addRow([
      "Khách hàng / Mặt hàng",
      "Số lượng (lít)",
      "Tổng tiền",
    ]);
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

    // Data rows
    customerReportData.customers.forEach((customer) => {
      const customerRow = worksheet.addRow([
        `${customer.customerCode} - ${customer.customerName}`,
        customer.totalQuantity,
        customer.totalAmount,
      ]);
      customerRow.font = STYLES.boldFont;
      customerRow.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0F2FE" },
        };
        if (colNumber === 2) {
          cell.numFmt = "#,##0.00";
          cell.alignment = STYLES.rightAlign;
        }
        if (colNumber === 3) {
          cell.numFmt = "#,##0";
          cell.alignment = STYLES.rightAlign;
        }
      });

      customer.products.forEach((product) => {
        const productRow = worksheet.addRow([
          `    ${product.productCode} - ${product.productName}`,
          product.quantity,
          product.amount,
        ]);
        productRow.font = STYLES.normalFont;
        productRow.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber === 2) {
            cell.numFmt = "#,##0.00";
            cell.alignment = STYLES.rightAlign;
          }
          if (colNumber === 3) {
            cell.numFmt = "#,##0";
            cell.alignment = STYLES.rightAlign;
          }
        });
      });
    });

    // Total row
    const totalRow = worksheet.addRow([
      "TỔNG CỘNG",
      customerReportData.summary.totalQuantity,
      customerReportData.summary.totalAmount,
    ]);
    totalRow.font = STYLES.boldFont;
    totalRow.eachCell((cell, colNumber) => {
      cell.border = STYLES.borderStyle;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD966" },
      };
      if (colNumber === 2) {
        cell.numFmt = "#,##0.00";
        cell.alignment = STYLES.rightAlign;
      }
      if (colNumber === 3) {
        cell.numFmt = "#,##0";
        cell.alignment = STYLES.rightAlign;
      }
    });

    worksheet.columns = [{ width: 40 }, { width: 20 }, { width: 20 }];

    downloadExcel(workbook, "bao-cao-theo-khach-hang");
  };

  // Print - Tab Khách hàng
  const handleCustomerPrint = () => {
    if (!customerReportData || !customerReportData.customers.length) {
      alert("Không có dữ liệu để in");
      return;
    }

    let tableHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background-color: #d9e1f2;">
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Khách hàng / Mặt hàng</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right;">Số lượng (lít)</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right;">Tổng tiền</th>
          </tr>
        </thead>
        <tbody>
    `;

    customerReportData.customers.forEach((customer) => {
      tableHTML += `
        <tr style="background-color: #e0f2fe; font-weight: bold;">
          <td style="border: 1px solid #000; padding: 6px;">${customer.customerCode} - ${customer.customerName}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatNumber(customer.totalQuantity)}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatCurrency(customer.totalAmount)}</td>
        </tr>
      `;
      customer.products.forEach((product) => {
        tableHTML += `
          <tr>
            <td style="border: 1px solid #000; padding: 6px; padding-left: 20px;">${product.productCode} - ${product.productName}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatNumber(product.quantity)}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatCurrency(product.amount)}</td>
          </tr>
        `;
      });
    });

    tableHTML += `
          <tr style="background-color: #ffd966; font-weight: bold;">
            <td style="border: 1px solid #000; padding: 8px;">TỔNG CỘNG</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatNumber(customerReportData.summary.totalQuantity)}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(customerReportData.summary.totalAmount)}</td>
          </tr>
        </tbody>
      </table>
    `;

    const selectedStore = customerSelectedStoreId
      ? stores?.find((s) => s.id === customerSelectedStoreId)
      : undefined;

    printReport(tableHTML, {
      title: "BÁO CÁO DOANH THU THEO KHÁCH HÀNG",
      storeName: selectedStore?.name,
      fromDate: customerFromDateTime,
      toDate: customerToDateTime,
      signatures: {
        left: "Người lập",
        center: "Kế toán",
        right: "Giám đốc",
      },
    });
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Báo Cáo Doanh Thu / Xuất Hàng</h1>
              <p className="text-sm text-gray-600">Theo dõi doanh thu theo cửa hàng hoặc khách hàng</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "store" ? (
              <>
                <button
                  onClick={handleExportExcel}
                  disabled={!reportData || !reportData.stores.length}
                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                  Xuất Excel
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!reportData || !reportData.stores.length}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <PrinterIcon className="h-4 w-4 mr-1" />
                  In
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCustomerExportExcel}
                  disabled={!customerReportData || !customerReportData.customers.length}
                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                  Xuất Excel
                </button>
                <button
                  onClick={handleCustomerPrint}
                  disabled={!customerReportData || !customerReportData.customers.length}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <PrinterIcon className="h-4 w-4 mr-1" />
                  In
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("store")}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === "store"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <BuildingStorefrontIcon className="h-5 w-5" />
            Theo cửa hàng
          </button>
          <button
            onClick={() => setActiveTab("customer")}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === "customer"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <UserGroupIcon className="h-5 w-5" />
            Theo khách hàng
          </button>
        </div>

        {/* Filters Panel */}
        <div className="p-4 overflow-visible">
          <div className="flex items-center gap-2 mb-3">
            <FunnelIcon className="h-4 w-4 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
          </div>

          {/* ========== TAB CỬA HÀNG FILTERS ========== */}
          {activeTab === "store" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Price Period Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nhanh theo kỳ giá
                </label>
                <Select
                  value={null}
                  onChange={(option) => {
                    if (option && pricePeriods) {
                      const period = pricePeriods[option.value - 1];
                      if (period) {
                        if (period.validFrom) {
                          setFromDateTime(
                            dayjs(period.validFrom).format("YYYY-MM-DDTHH:mm")
                          );
                        }
                        if (period.validTo) {
                          setToDateTime(
                            dayjs(period.validTo).format("YYYY-MM-DDTHH:mm")
                          );
                        } else {
                          setToDateTime(dayjs().format("YYYY-MM-DDTHH:mm"));
                        }
                      }
                    }
                  }}
                  options={pricePeriods?.map((period, index) => ({
                    value: index + 1,
                    label: period.label,
                  })) || []}
                  placeholder="-- Chọn kỳ giá --"
                  classNamePrefix="react-select"
                  className="react-select-container"
                />
              </div>

              {/* DateTime Range */}
              <div className="lg:col-span-2">
                <DateTimeRangePicker
                  startDate={fromDateTime}
                  endDate={toDateTime}
                  onStartDateChange={setFromDateTime}
                  onEndDateChange={setToDateTime}
                  label="Thời gian"
                />
              </div>

              {/* Store Filter */}
              {!user?.storeId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cửa hàng
                  </label>
                  <Select
                    value={selectedStoreId ? stores?.find(s => s.id === selectedStoreId) ? { value: selectedStoreId, label: `${stores.find(s => s.id === selectedStoreId)?.code} - ${stores.find(s => s.id === selectedStoreId)?.name}` } : null : null}
                    onChange={(option) => setSelectedStoreId(option?.value)}
                    options={[
                      { value: undefined, label: "Tất cả cửa hàng" },
                      ...(stores?.map((store) => ({
                        value: store.id,
                        label: `${store.code} - ${store.name}`,
                      })) || []),
                    ]}
                    isClearable
                    placeholder="Tất cả cửa hàng"
                    classNamePrefix="react-select"
                    className="react-select-container"
                  />
                </div>
              )}

              {/* Product Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mặt hàng
                </label>
                <Select
                  value={selectedProductId ? products?.find(p => p.id === selectedProductId) ? { value: selectedProductId, label: `${products.find(p => p.id === selectedProductId)?.code} - ${products.find(p => p.id === selectedProductId)?.name}` } : null : null}
                  onChange={(option) => setSelectedProductId(option?.value)}
                  options={[
                    { value: undefined, label: "Tất cả mặt hàng" },
                    ...(products?.map((product) => ({
                      value: product.id,
                      label: `${product.code} - ${product.name}`,
                    })) || []),
                  ]}
                  isClearable
                  placeholder="Tất cả mặt hàng"
                  classNamePrefix="react-select"
                  className="react-select-container"
                />
              </div>
            </div>
          )}

          {/* ========== TAB KHÁCH HÀNG FILTERS ========== */}
          {activeTab === "customer" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* DateTime Range */}
              <div className="lg:col-span-2">
                <DateTimeRangePicker
                  startDate={customerFromDateTime}
                  endDate={customerToDateTime}
                  onStartDateChange={setCustomerFromDateTime}
                  onEndDateChange={setCustomerToDateTime}
                  label="Thời gian"
                />
              </div>

              {/* Customer Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Khách hàng
                </label>
                <Select
                  value={selectedCustomerId ? customers?.find(c => c.id === selectedCustomerId) ? { value: selectedCustomerId, label: `${customers.find(c => c.id === selectedCustomerId)?.code} - ${customers.find(c => c.id === selectedCustomerId)?.name}` } : null : null}
                  onChange={(option) => setSelectedCustomerId(option?.value)}
                  options={[
                    { value: undefined, label: "Tất cả khách hàng" },
                    ...(customers?.map((customer) => ({
                      value: customer.id,
                      label: `${customer.code} - ${customer.name}`,
                    })) || []),
                  ]}
                  isClearable
                  placeholder="Tất cả khách hàng"
                  classNamePrefix="react-select"
                  className="react-select-container"
                />
              </div>

              {/* Store Filter */}
              {!user?.storeId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cửa hàng
                  </label>
                  <Select
                    value={customerSelectedStoreId ? stores?.find(s => s.id === customerSelectedStoreId) ? { value: customerSelectedStoreId, label: `${stores.find(s => s.id === customerSelectedStoreId)?.code} - ${stores.find(s => s.id === customerSelectedStoreId)?.name}` } : null : null}
                    onChange={(option) => setCustomerSelectedStoreId(option?.value)}
                    options={[
                      { value: undefined, label: "Tất cả cửa hàng" },
                      ...(stores?.map((store) => ({
                        value: store.id,
                        label: `${store.code} - ${store.name}`,
                      })) || []),
                    ]}
                    isClearable
                    placeholder="Tất cả cửa hàng"
                    classNamePrefix="react-select"
                    className="react-select-container"
                  />
                </div>
              )}

              {/* Product Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mặt hàng
                </label>
                <Select
                  value={customerSelectedProductId ? products?.find(p => p.id === customerSelectedProductId) ? { value: customerSelectedProductId, label: `${products.find(p => p.id === customerSelectedProductId)?.code} - ${products.find(p => p.id === customerSelectedProductId)?.name}` } : null : null}
                  onChange={(option) => setCustomerSelectedProductId(option?.value)}
                  options={[
                    { value: undefined, label: "Tất cả mặt hàng" },
                    ...(products?.map((product) => ({
                      value: product.id,
                      label: `${product.code} - ${product.name}`,
                    })) || []),
                  ]}
                  isClearable
                  placeholder="Tất cả mặt hàng"
                  classNamePrefix="react-select"
                  className="react-select-container"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== TAB CỬA HÀNG CONTENT ========== */}
      {activeTab === "store" && (
        <>
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Lỗi khi tải dữ liệu</p>
              <p className="text-sm mt-1">{(error as Error).message}</p>
            </div>
          )}

          {/* Report Data */}
          {!isLoading && !error && reportData && (
            <>
              {reportData.stores.length > 0 ? (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {/* Summary Row */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 border-l-4 border-orange-400 shadow-sm">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">💳 Bán công nợ</p>
                        <p className="text-xl font-bold text-orange-600 mt-1">
                          {formatNumber(reportData.summary.debtQuantity)} <span className="text-sm font-normal">lít</span>
                        </p>
                        <p className="text-sm text-orange-500 mt-0.5">
                          {formatCurrency(reportData.summary.debtAmount)} ₫
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border-l-4 border-green-400 shadow-sm">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🛒 Bán lẻ</p>
                        <p className="text-xl font-bold text-green-600 mt-1">
                          {formatNumber(reportData.summary.retailQuantity)} <span className="text-sm font-normal">lít</span>
                        </p>
                        <p className="text-sm text-green-500 mt-0.5">
                          {formatCurrency(reportData.summary.retailAmount)} ₫
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">📦 Tổng xuất bán</p>
                        <p className="text-xl font-bold text-blue-600 mt-1">
                          {formatNumber(reportData.summary.totalQuantity)} <span className="text-sm font-normal">lít</span>
                        </p>
                        <p className="text-sm text-blue-500 mt-0.5">
                          {formatCurrency(reportData.summary.totalAmount)} ₫
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider align-middle border-b border-r-2 border-gray-300 min-w-[200px]">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-semibold">Cửa hàng / Mặt hàng</span>
                              <div className="flex items-center gap-1 ml-4">
                                <button
                                  onClick={expandAll}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                  title="Mở tất cả"
                                >
                                  ⊕ Mở
                                </button>
                                <button
                                  onClick={collapseAll}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                  title="Thu gọn tất cả"
                                >
                                  ⊖ Gọn
                                </button>
                              </div>
                            </div>
                          </th>
                          <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold text-orange-700 uppercase tracking-wider bg-orange-50 border-b border-orange-200 border-r-2 border-r-gray-300">
                            💳 Công nợ
                          </th>
                          <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50 border-b border-green-200 border-r-2 border-r-gray-300">
                            🛒 Bán lẻ
                          </th>
                          <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider bg-blue-50 border-b border-blue-200">
                            📦 Tổng xuất
                          </th>
                        </tr>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-right text-xs font-bold text-orange-600 border-b border-gray-200">Lượng</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-orange-600 border-b border-gray-200 border-r-2 border-r-gray-300">Tiền</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-green-600 border-b border-gray-200">Lượng</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-green-600 border-b border-gray-200 border-r-2 border-r-gray-300">Tiền</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-blue-600 border-b border-gray-200">Lượng</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-blue-600 border-b border-gray-200">Tiền</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.stores.map((store) => (
                          <React.Fragment key={`store-${store.storeId}`}>
                            {/* Store Row */}
                            <tr
                              className="bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors"
                              onClick={() => toggleStore(store.storeId)}
                            >
                              <td className="px-4 py-3 whitespace-nowrap border-r-2 border-r-gray-300">
                                <div className="flex items-center gap-2">
                                  {expandedStores.has(store.storeId) ? (
                                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                                  )}
                                  <BuildingStorefrontIcon className="h-4 w-4 text-amber-600" />
                                  <span className="font-semibold text-gray-800">
                                    {store.storeCode} - {store.storeName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-orange-700">
                                {formatNumber(store.debtQuantity)}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-orange-600 border-r-2 border-r-gray-300">
                                {formatCurrency(store.debtAmount)}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-green-700">
                                {formatNumber(store.retailQuantity)}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-green-600 border-r-2 border-r-gray-300">
                                {formatCurrency(store.retailAmount)}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-blue-700 bg-blue-50/50">
                                {formatNumber(store.totalQuantity)}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-blue-600 bg-blue-50/50">
                                {formatCurrency(store.totalAmount)}
                              </td>
                            </tr>

                            {/* Product Rows */}
                            {expandedStores.has(store.storeId) &&
                              store.products.map((product) => (
                                <tr
                                  key={`store-${store.storeId}-product-${product.productId}`}
                                  className="bg-white hover:bg-gray-50"
                                >
                                  <td className="px-4 py-2 pl-12 whitespace-nowrap border-r-2 border-r-gray-300">
                                    <div className="flex items-center gap-2">
                                      <ShoppingCartIcon className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-700">
                                        {product.productCode} - {product.productName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right text-orange-600">
                                    {formatNumber(product.debtQuantity)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right text-orange-500 border-r-2 border-r-gray-300">
                                    {formatCurrency(product.debtAmount)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right text-green-600 font-medium">
                                    {formatNumber(product.retailQuantity)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right text-green-500 font-medium border-r-2 border-r-gray-300">
                                    {formatCurrency(product.retailAmount)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right text-blue-600 bg-blue-50/30">
                                    {formatNumber(product.totalQuantity)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right text-blue-500 bg-blue-50/30">
                                    {formatCurrency(product.totalAmount)}
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
                  <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Không có dữ liệu</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Vui lòng điều chỉnh bộ lọc và thử lại
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ========== TAB KHÁCH HÀNG CONTENT ========== */}
      {activeTab === "customer" && (
        <>
          {/* Loading State */}
          {customerIsLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {customerError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Lỗi khi tải dữ liệu</p>
              <p className="text-sm mt-1">{(customerError as Error).message}</p>
            </div>
          )}

          {/* Report Data */}
          {!customerIsLoading && !customerError && customerReportData && (
            <>
              {customerReportData.customers.length > 0 ? (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {/* Summary Row */}
                  <div className="bg-blue-50 p-4 border-b border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Tổng số lượng</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formatNumber(customerReportData.summary.totalQuantity)} lít
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tổng doanh thu</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(customerReportData.summary.totalAmount)} ₫
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={expandAll}
                                className="text-blue-500 hover:text-blue-700 text-xs"
                              >
                                Mở tất cả
                              </button>
                              <span>|</span>
                              <button
                                onClick={collapseAll}
                                className="text-blue-500 hover:text-blue-700 text-xs"
                              >
                                Thu gọn
                              </button>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Số lượng (lít)
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Thành tiền (₫)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {customerReportData.customers.map((customer) => (
                          <React.Fragment key={`customer-${customer.customerId}`}>
                            {/* Customer Row */}
                            <tr
                              className="bg-sky-50 cursor-pointer hover:bg-sky-100 transition-colors"
                              onClick={() => toggleCustomer(customer.customerId)}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {expandedCustomers.has(customer.customerId) ? (
                                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                                  )}
                                  <UserGroupIcon className="h-4 w-4 text-sky-600" />
                                  <span className="font-semibold text-gray-800">
                                    {customer.customerCode} - {customer.customerName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-800">
                                {formatNumber(customer.totalQuantity)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-800">
                                {formatCurrency(customer.totalAmount)}
                              </td>
                            </tr>

                            {/* Product Rows */}
                            {expandedCustomers.has(customer.customerId) &&
                              customer.products.map((product) => (
                                <tr
                                  key={`customer-${customer.customerId}-product-${product.productId}`}
                                  className="bg-white hover:bg-gray-50"
                                >
                                  <td className="px-4 py-2 pl-12 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <ShoppingCartIcon className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-700">
                                        {product.productCode} - {product.productName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right text-gray-600">
                                    {formatNumber(product.quantity)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right text-gray-600">
                                    {formatCurrency(product.amount)}
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
                  <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Không có dữ liệu</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Vui lòng điều chỉnh bộ lọc và thử lại
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RevenueSalesReportPage;
