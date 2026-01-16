import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi, type SalesByCustomerItem } from "../api/reports";
import { storesApi } from "../api/stores";
import { productsApi } from "../api/products";
import { customersApi } from "../api/customers";
import { useAuth } from "../contexts/AuthContext";
import {
  ChartBarIcon,
  FunnelIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import {
  createReportWorkbook,
  addReportHeader,
  addReportFooter,
  downloadExcel,
  STYLES,
} from "../utils/report-exporter";
import { printReport } from '../utils/report-printer';
import DateRangePicker from '../components/DateRangePicker';
import SearchableSelect from '../components/SearchableSelect';

const SalesReportPage: React.FC = () => {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(user?.storeId);
  const [selectedPriceIds, setSelectedPriceIds] = useState<number[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const [saleTypeFilter, setSaleTypeFilter] = useState<"ALL" | "RETAIL_ONLY" | "DEBT_ONLY">("ALL");
  const [reportType, setReportType] = useState<"pump" | "product">("product");

  // Fetch stores for admin/accountant/sales
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId, // Only fetch if user is not bound to a store
  });

  // Fetch current user's store details if user is bound to a store
  const { data: userStoreDetails } = useQuery({
    queryKey: ["store", user?.storeId],
    queryFn: () => storesApi.getById(user!.storeId),
    enabled: !!user?.storeId,
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.getAll(),
  });

  // Get selected store's regionId
  const selectedStore = stores?.find(s => s.id === selectedStoreId) || userStoreDetails;
  const regionId = (selectedStore as any)?.regionId || (selectedStore as any)?.region?.id;

  // Fetch all prices (when no store selected) or prices for the selected store's region
  const { data: allPrices } = useQuery({
    queryKey: ['prices', regionId],
    queryFn: async () => {
      if (regionId) {
        // Nếu có regionId, lấy prices của region đó
        return productsApi.getPricesByRegion(regionId);
      } else {
        // Nếu không có regionId (tất cả cửa hàng), lấy tất cả prices
        return productsApi.getAllPrices();
      }
    },
    enabled: true, // Luôn fetch
  });

  // Reset selected prices when store changes
  useEffect(() => {
    setSelectedPriceIds([]);
  }, [selectedStoreId]);

  // Fetch report data
  const { data: pumpReport, isLoading: loadingPump } = useQuery({
    queryKey: ["sales-report-pump", selectedStoreId, fromDate, toDate, selectedPriceIds, selectedCustomerId],
    queryFn: () =>
      reportsApi.getSalesByPump({
        storeId: selectedStoreId,
        fromDate,
        toDate,
        priceId: selectedPriceIds.length === 1 ? selectedPriceIds[0] : undefined,
      }),
    enabled: !!selectedStoreId && reportType === "pump" && !selectedCustomerId,
  });

  const { data: productReport, isLoading: loadingProduct } = useQuery({
    queryKey: ["sales-report-product", selectedStoreId, fromDate, toDate, selectedPriceIds, selectedCustomerId],
    queryFn: () =>
      reportsApi.getSalesByShift({
        storeId: selectedStoreId,
        fromDate,
        toDate,
        priceId: selectedPriceIds.length === 1 ? selectedPriceIds[0] : undefined,
      }),
    enabled: !!selectedStoreId && reportType === "product" && !selectedCustomerId,
  });

  // Fetch customer report (with or without specific customer selected)
  const { data: customerReport, isLoading: loadingCustomer } = useQuery({
    queryKey: ["sales-report-customer", selectedStoreId, fromDate, toDate, selectedPriceIds, selectedCustomerId, saleTypeFilter],
    queryFn: () =>
      reportsApi.getSalesByCustomer({
        storeId: selectedStoreId,
        fromDate,
        toDate,
        priceId: selectedPriceIds.length === 1 ? selectedPriceIds[0] : undefined,
        customerId: selectedCustomerId,
      }),
    enabled: saleTypeFilter !== "ALL" || !!selectedCustomerId || selectedPriceIds.length > 0,
  });

  // Filter customer report by sale type
  const filteredCustomerReport = React.useMemo(() => {
    if (!customerReport) return [];

    console.log('🔍 DEBUG: Raw customerReport from backend:', JSON.stringify(customerReport, null, 2));
    console.log('🔍 DEBUG: saleTypeFilter:', saleTypeFilter);

    if (saleTypeFilter === "ALL") {
      return customerReport;
    }

    // Filter theo loại khách hàng trước
    const customersByType = customerReport.filter(customer => {
      if (saleTypeFilter === "RETAIL_ONLY") {
        // Bán lẻ: chỉ lấy   (INTERNAL)
        return customer.customerType === "INTERNAL";
      } else if (saleTypeFilter === "DEBT_ONLY") {
        // Công nợ: chỉ lấy khách công nợ (EXTERNAL)
        return customer.customerType === "EXTERNAL";
      }
      return true; // ALL: lấy tất cả
    });

    console.log(`   Filtered customers by type: ${customersByType.length} customers`);

    return customersByType.map(customer => {
      console.log(`\n📦 Customer: ${customer.customerName} (${customer.customerCode}) - Type: ${customer.customerType}`);
      console.log(`   Total products in customer:`, customer.products.length);

      const filteredProducts = customer.products.filter(product => {
        console.log(`  Product: ${product.productName}, saleType: "${product.saleType}", quantity: ${product.quantity}`);

        // Chỉ hiển thị sản phẩm có quantity > 0
        if (Number(product.quantity) <= 0) {
          console.log(`  -> Filtered out: quantity <= 0`);
          return false;
        }

        if (saleTypeFilter === "RETAIL_ONLY") {
          const isRetail = product.saleType === "RETAIL";
          console.log(`  -> RETAIL_ONLY filter: ${isRetail}`);
          return isRetail;
        } else if (saleTypeFilter === "DEBT_ONLY") {
          const isDebt = product.saleType === "DEBT";
          console.log(`  -> DEBT_ONLY filter: ${isDebt}`);
          return isDebt;
        }
        return true;
      });

      const totalQuantity = filteredProducts.reduce((sum, p) => sum + Number(p.quantity), 0);
      const totalAmount = filteredProducts.reduce((sum, p) => sum + Number(p.amount), 0);

      console.log(`  ✅ After filter: ${filteredProducts.length} products, totalQty: ${totalQuantity}`);

      return {
        ...customer,
        products: filteredProducts,
        totalQuantity,
        totalAmount
      };
    }).filter(customer => customer.products.length > 0);
  }, [customerReport, saleTypeFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const handleExportExcel = async () => {
    // Determine which data to export based on filters
    let dataToExport;
    if (saleTypeFilter !== "ALL" || selectedCustomerId) {
      dataToExport = filteredCustomerReport;
    } else {
      dataToExport = reportType === "pump" ? pumpReport : productReport;
    }

    if (!dataToExport || dataToExport.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    // @ts-ignore
    const storeName = user?.store?.name || stores?.find((s) => s.id === selectedStoreId)?.name || (selectedStoreId ? "Cửa hàng" : "Tất cả cửa hàng");

    const { workbook, worksheet } = createReportWorkbook("Báo cáo xuất hàng");

    let reportTitle = (selectedCustomerId || saleTypeFilter !== "ALL") ? "BẢNG KÊ CHI TIẾT BÁN HÀNG THEO KHÁCH HÀNG" : "BẢNG KÊ CHI TIẾT BÁN HÀNG";
    if (saleTypeFilter === "RETAIL_ONLY") {
      reportTitle += " - BÁN LẺ";
    } else if (saleTypeFilter === "DEBT_ONLY") {
      reportTitle += " - CÔNG NỢ";
    }

    addReportHeader(worksheet, {
      storeName,
      title: reportTitle,
      fromDate,
      toDate,
    });

    // Handle customer report export (for filtered sale type or specific customer)
    if ((saleTypeFilter !== "ALL" || selectedCustomerId) && filteredCustomerReport) {
      // Columns setup for customer report
      worksheet.columns = [
        { key: "stt", width: 5 },
        { key: "customerCode", width: 12 },
        { key: "customerName", width: 25 },
        { key: "productName", width: 25 },
        { key: "saleType", width: 12 },
        { key: "quantity", width: 12 },
        { key: "price", width: 12 },
        { key: "amount", width: 15 },
      ];

      // Table Header (Row 7)
      const headerRow = worksheet.getRow(7);
      headerRow.values = [
        "STT",
        "Mã KH",
        "Tên khách hàng",
        "Mặt hàng",
        "Loại bán",
        "Số lượng",
        "Đơn giá",
        "Thành tiền",
      ];
      headerRow.font = STYLES.headerFont;
      headerRow.alignment = STYLES.centerAlign;
      headerRow.eachCell((cell) => {
        cell.border = STYLES.borderStyle;
      });

      let totalAllAmount = 0;
      let totalAllQuantity = 0;

      filteredCustomerReport.forEach((customer) => {
        // Customer Group Header Row
        const groupRow = worksheet.addRow([
          customer.customerCode,
          "",
          customer.customerName,
          "",
          customer.customerType === "INTERNAL" ? " " : "Khách công nợ",
          customer.totalQuantity,
          "",
          customer.totalAmount,
        ]);

        worksheet.mergeCells(`A${groupRow.number}:B${groupRow.number}`);
        worksheet.mergeCells(`C${groupRow.number}:D${groupRow.number}`);

        groupRow.font = STYLES.boldFont;
        groupRow.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber === 1 || colNumber === 3) cell.alignment = STYLES.leftAlign;
          if (colNumber === 5) cell.alignment = STYLES.centerAlign;
          if (colNumber === 6 || colNumber === 8) {
            cell.numFmt = colNumber === 6 ? "#,##0.00" : "#,##0";
            cell.alignment = STYLES.rightAlign;
          }
        });

        // Product Detail Rows
        customer.products.forEach((product, idx) => {
          const row = worksheet.addRow([
            idx + 1,
            "",
            "",
            product.productName,
            product.saleType === "DEBT" ? "Công nợ" : "Bán lẻ",
            Number(product.quantity),
            Number(product.unitPrice),
            Number(product.amount),
          ]);

          row.font = STYLES.normalFont;
          row.eachCell((cell, colNumber) => {
            cell.border = STYLES.borderStyle;
            if (colNumber === 1 || colNumber === 5) {
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

        totalAllQuantity += Number(customer.totalQuantity);
        totalAllAmount += Number(customer.totalAmount);
      });

      // Product Subtotals
      const productTotals = new Map<string, { quantity: number; amount: number; productName: string }>();

      filteredCustomerReport.forEach(customer => {
        customer.products.forEach(product => {
          const key = product.productId?.toString() || product.productName || 'unknown';
          const existing = productTotals.get(key) || { quantity: 0, amount: 0, productName: product.productName || 'Sản phẩm không xác định' };
          existing.quantity += Number(product.quantity);
          existing.amount += Number(product.amount);
          productTotals.set(key, existing);
        });
      });

      Array.from(productTotals.values()).forEach((total) => {
        const subtotalRow = worksheet.addRow([
          "",
          "",
          "",
          `Tổng ${total.productName}`,
          "",
          total.quantity,
          "",
          total.amount,
        ]);

        subtotalRow.font = STYLES.boldFont;
        subtotalRow.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' } // Yellow background
          };
          if (colNumber === 4) cell.alignment = STYLES.rightAlign;
          if (colNumber === 6 || colNumber === 8) {
            cell.alignment = STYLES.rightAlign;
            cell.numFmt = colNumber === 6 ? "#,##0.00" : "#,##0";
          }
        });
        worksheet.mergeCells(`A${subtotalRow.number}:D${subtotalRow.number}`);
      });

      // Total Row
      const totalRow = worksheet.addRow(["", "", "", "", "Cộng tổng", totalAllQuantity, "", totalAllAmount]);
      totalRow.font = STYLES.boldFont;
      totalRow.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        if (colNumber === 5) cell.alignment = STYLES.centerAlign;
        if (colNumber === 6 || colNumber === 8) {
          cell.alignment = STYLES.rightAlign;
          cell.numFmt = colNumber === 6 ? "#,##0.00" : "#,##0";
        }
      });
      worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    }
    // Original product/pump report export
    else {

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
    }

    addReportFooter(worksheet);
    await downloadExcel(workbook, "Bao_cao_xuat_hang");
  };

  const handlePrint = () => {
    // Determine which data to export based on filters
    let dataToExport;
    if (saleTypeFilter !== "ALL" || selectedCustomerId) {
      dataToExport = filteredCustomerReport;
    } else {
      dataToExport = reportType === "pump" ? pumpReport : productReport;
    }

    if (!dataToExport || dataToExport.length === 0) {
      alert("Không có dữ liệu để in");
      return;
    }

    // @ts-ignore
    const storeName = user?.store?.name || stores?.find((s) => s.id === selectedStoreId)?.name || (selectedStoreId ? "Cửa hàng" : "Tất cả cửa hàng");

    let reportTitle = (selectedCustomerId || saleTypeFilter !== "ALL") ? "BẢNG KÊ CHI TIẾT BÁN HÀNG THEO KHÁCH HÀNG" : "BẢNG KÊ CHI TIẾT BÁN HÀNG";
    if (saleTypeFilter === "RETAIL_ONLY") {
      reportTitle += " - BÁN LẺ";
    } else if (saleTypeFilter === "DEBT_ONLY") {
      reportTitle += " - CÔNG NỢ";
    }

    // Handle customer report print
    if ((saleTypeFilter !== "ALL" || selectedCustomerId) && filteredCustomerReport) {
      let totalAllAmount = 0;
      let totalAllQuantity = 0;

      const customerRows = filteredCustomerReport.map((customer) => {
        totalAllQuantity += Number(customer.totalQuantity);
        totalAllAmount += Number(customer.totalAmount);

        const productRows = customer.products.map((product, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-left" style="padding-left: 20px;">└─ ${product.productName}</td>
            <td class="text-center">${product.saleType === "DEBT" ? "Công nợ" : "Bán lẻ"}</td>
            <td class="text-right">${formatNumber(Number(product.quantity))}</td>
            <td class="text-right">${formatCurrency(Number(product.unitPrice))}</td>
            <td class="text-right font-bold">${formatCurrency(Number(product.amount))}</td>
          </tr>
        `).join('');

        return `
          <tr class="total-row" style="background-color: #eff6ff;">
            <td class="text-left font-bold" colspan="2">${customer.customerCode} - ${customer.customerName}</td>
            <td class="text-center">${customer.customerType === "INTERNAL" ? " " : "Khách công nợ"}</td>
            <td class="text-right font-bold">${formatNumber(Number(customer.totalQuantity))}</td>
            <td class="text-right"></td>
            <td class="text-right font-bold">${formatCurrency(Number(customer.totalAmount))}</td>
          </tr>
          ${productRows}
        `;
      }).join('');

      // Product Subtotals
      const productTotals = new Map<string, { quantity: number; amount: number; productName: string }>();

      filteredCustomerReport.forEach(customer => {
        customer.products.forEach(product => {
          const key = product.productId?.toString() || product.productName || 'unknown';
          const existing = productTotals.get(key) || { quantity: 0, amount: 0, productName: product.productName || 'Sản phẩm không xác định' };
          existing.quantity += Number(product.quantity);
          existing.amount += Number(product.amount);
          productTotals.set(key, existing);
        });
      });

      const productSubtotalRows = Array.from(productTotals.values()).map((total) => `
        <tr class="total-row" style="background-color: #fef3c7; font-weight: bold;">
          <td colspan="3" class="text-right">Tổng ${total.productName}:</td>
          <td class="text-right">${formatNumber(total.quantity)}</td>
          <td></td>
          <td class="text-right">${formatCurrency(total.amount)}</td>
        </tr>
      `).join('');

      const tableHTML = `
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mặt hàng / Khách hàng</th>
              <th>Loại</th>
              <th>Số lượng (Lít)</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${customerRows}
            ${productSubtotalRows}
            <tr class="total-row" style="background-color: #f0f0f0; font-weight: bold;">
              <td colspan="3" class="text-center">Cộng tổng</td>
              <td class="text-right">${formatNumber(totalAllQuantity)}</td>
              <td></td>
              <td class="text-right">${formatCurrency(totalAllAmount)}</td>
            </tr>
          </tbody>
        </table>
      `;

      printReport(tableHTML, {
        storeName,
        title: reportTitle,
        fromDate,
        toDate,
      });
    }
    else if (reportType === "product") {
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

      const groupRows = Object.keys(groupedData).map((productName) => {
        const items = groupedData[productName];
        const subTotalQuantity = items.reduce((sum, item) => sum + Number(item.totalQuantity), 0);
        const subTotalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount), 0);

        totalAllQuantity += subTotalQuantity;
        totalAllAmount += subTotalAmount;

        const detailRows = items.map((item: any, idx: number) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-center">${item.shiftNo}</td>
            <td class="text-center">${dayjs(item.openedAt || item.shiftDate).format('DD/MM/YYYY HH:mm')}</td>
            <td class="text-left">${item.productName}</td>
            <td class="text-center">lít</td>
            <td class="text-right">${formatNumber(Number(item.totalQuantity))}</td>
            <td class="text-right">${formatCurrency(Number(item.unitPrice))}</td>
            <td class="text-right font-bold">${formatCurrency(Number(item.totalAmount))}</td>
          </tr>
        `).join('');

        return `
          <tr class="total-row">
            <td colspan="4" class="text-left font-bold">${productName}</td>
            <td class="text-center"></td>
            <td class="text-right font-bold">${formatNumber(subTotalQuantity)}</td>
            <td class="text-right"></td>
            <td class="text-right font-bold">${formatCurrency(subTotalAmount)}</td>
          </tr>
          ${detailRows}
        `;
      }).join('');

      const tableHTML = `
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Số CT</th>
              <th>Ngày tháng</th>
              <th>Tên hàng hóa</th>
              <th>Đơn vị</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${groupRows}
            <tr class="total-row" style="background-color: #f0f0f0; font-weight: bold;">
              <td colspan="4" class="text-center">Cộng tổng</td>
              <td></td>
              <td class="text-right">${formatNumber(totalAllQuantity)}</td>
              <td></td>
              <td class="text-right">${formatCurrency(totalAllAmount)}</td>
            </tr>
          </tbody>
        </table>
      `;

      printReport(tableHTML, {
        storeName,
        title: reportTitle,
        fromDate,
        toDate,
      });
    } else {
      // By pump view
      let totalQuantity = 0;
      let totalAmount = 0;

      const tableRows = dataToExport.map((item: any, index: number) => {
        totalQuantity += Number(item.totalQuantity);
        totalAmount += Number(item.totalAmount);

        return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td class="text-center">${item.pumpCode}</td>
            <td class="text-left">${item.pumpCode}${item.pumpName ? ' - ' + item.pumpName : ''}</td>
            <td class="text-left">${item.productName}</td>
            <td class="text-center">lít</td>
            <td class="text-right">${formatNumber(Number(item.totalQuantity))}</td>
            <td class="text-right">${formatCurrency(Number(item.unitPrice))}</td>
            <td class="text-right font-bold">${formatCurrency(Number(item.totalAmount))}</td>
          </tr>
        `;
      }).join('');

      const tableHTML = `
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã vòi</th>
              <th>Tên vòi bơm</th>
              <th>Mặt hàng</th>
              <th>Đơn vị</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="5" class="text-center">Tổng cộng</td>
              <td class="text-right">${formatNumber(totalQuantity)}</td>
              <td></td>
              <td class="text-right">${formatCurrency(totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      `;

      printReport(tableHTML, {
        storeName,
        title: reportType === "pump" ? 'BÁO CÁO XUẤT HÀNG THEO VÒI BƠM' : reportTitle,
        fromDate,
        toDate,
      });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Báo cáo xuất hàng</h1>
              <p className="text-sm text-gray-600">
                Xem báo cáo xuất hàng theo cột bơm, mặt hàng hoặc khách hàng.
                <strong className="text-blue-600"> Bán lẻ = Không chọn khách hàng. Công nợ = Chọn khách hàng.</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Xuất Excel
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
            >
              <PrinterIcon className="h-4 w-4 mr-1" />
              In báo cáo
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Store Selector (if applicable) */}
          {!user?.storeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cửa hàng</label>
              <SearchableSelect
                options={[
                  { value: "", label: "Tất cả cửa hàng" },
                  ...(stores?.map((store) => ({
                    value: store.id,
                    label: store.name
                  })) || [])
                ]}
                value={selectedStoreId ?? ""}
                onChange={(value) => setSelectedStoreId(value === "" || value === null ? undefined : Number(value))}
                placeholder="Tìm cửa hàng..."
                isClearable
              />
            </div>
          )}

          {/* Date Range */}
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />

          {/* Price Period Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kỳ giá</label>
            <SearchableSelect
              options={[
                ...(allPrices?.map((price) => ({
                  value: price.id,
                  label: `${price.product?.name} - ${price.region?.name} (${new Intl.NumberFormat('vi-VN').format(price.price)}đ) - ${new Date(price.validFrom).toLocaleDateString('vi-VN')}`
                })) || [])
              ]}
              value={selectedPriceIds}
              onChange={(value) => {
                if (Array.isArray(value)) {
                  setSelectedPriceIds(value.map(v => Number(v)));
                } else {
                  setSelectedPriceIds([]);
                }
              }}
              placeholder="Chọn kỳ giá..."
              isClearable
              isMulti
              hideSelectedValues
            />
          </div>

          {/* Sale Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại bán hàng</label>
            <SearchableSelect
              options={[
                { value: "ALL", label: "Tất cả" },
                { value: "RETAIL_ONLY", label: "Bán lẻ" },
                { value: "DEBT_ONLY", label: "Công nợ" }
              ]}
              value={saleTypeFilter}
              onChange={(value) => setSaleTypeFilter(value as "ALL" | "RETAIL_ONLY" | "DEBT_ONLY")}
              placeholder="Chọn loại bán hàng..."
            />
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
            <SearchableSelect
              options={[
                { value: "", label: "Tất cả khách hàng" },
                ...(customers?.map((customer) => ({
                  value: customer.id,
                  label: `${customer.code} - ${customer.name}`
                })) || [])
              ]}
              value={selectedCustomerId ?? ""}
              onChange={(value) => setSelectedCustomerId(value === "" || value === null ? undefined : Number(value))}
              placeholder="Tìm khách hàng..."
              isClearable
            />
          </div>

          {/* Report Type Toggle - Hidden when sale type filter is active */}
          {saleTypeFilter === "ALL" && !selectedCustomerId && (
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
          )}
        </div>
      </div>

      {/* Summary Cards - Show retail vs debt breakdown */}
      {(selectedStoreId || saleTypeFilter !== "ALL") && !selectedCustomerId && (pumpReport || productReport || filteredCustomerReport?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  {selectedStoreId ? "Tổng doanh thu" : `Tất cả cửa hàng (${filteredCustomerReport?.length || 0})`}
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {selectedStoreId
                    ? ((reportType === "pump" ? pumpReport : productReport)?.reduce((sum, item) => sum + Number(item.totalAmount), 0) || 0).toLocaleString("vi-VN") + " ₫"
                    : (filteredCustomerReport?.reduce((sum, c) => sum + Number(c.totalAmount), 0) || 0).toLocaleString("vi-VN") + " ₫"
                  }
                </p>
              </div>
              <ChartBarIcon className="h-10 w-10 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">
                  {saleTypeFilter === "RETAIL_ONLY" ? "Bán lẻ" : saleTypeFilter === "DEBT_ONLY" ? "Công nợ" : "Số lượng"}
                </p>
                <p className="text-xl font-bold text-green-900 mt-1">
                  {saleTypeFilter !== "ALL"
                    ? `${(filteredCustomerReport?.reduce((sum, c) => sum + Number(c.totalQuantity), 0) || 0).toLocaleString("vi-VN")} lít`
                    : `${((reportType === "pump" ? pumpReport : productReport)?.reduce((sum, item) => sum + Number(item.totalQuantity), 0) || 0).toLocaleString("vi-VN")} lít`
                  }
                </p>
              </div>
              <BanknotesIcon className="h-10 w-10 text-green-400" />
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {!user?.storeId && !selectedStoreId && saleTypeFilter === "ALL" ? (
          <div className="p-12 text-center text-gray-500">
            <FunnelIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Vui lòng chọn cửa hàng hoặc filter loại bán hàng để xem báo cáo</p>
          </div>
        ) : (
          <>
            {loadingPump || loadingProduct || loadingCustomer ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : (selectedCustomerId || saleTypeFilter !== "ALL") && filteredCustomerReport ? (
              <div className="overflow-x-auto">
                {saleTypeFilter !== "ALL" && (
                  <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                    <p className="text-sm text-blue-700">
                      <span className="font-semibold">Đang lọc:</span>{" "}
                      {saleTypeFilter === "RETAIL_ONLY" ? "Chỉ hiển thị bán lẻ" : "Chỉ hiển thị công nợ"}
                    </p>
                  </div>
                )}
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wide"
                      >
                        Khách hàng
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wide"
                      >
                        Loại
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-right text-sm font-bold text-white uppercase tracking-wide"
                      >
                        Số lượng (Lít)
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-right text-sm font-bold text-white uppercase tracking-wide"
                      >
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCustomerReport.map((customer) => (
                      <>
                        <tr key={customer.customerId} className="bg-blue-50 font-semibold hover:bg-blue-100">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customer.customerCode} - {customer.customerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {customer.customerType === "INTERNAL" ? " " : "Khách công nợ"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatNumber(customer.products.reduce((sum, p) => sum + Number(p.quantity), 0))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">
                            {formatCurrency(customer.products.reduce((sum, p) => sum + Number(p.amount), 0))}
                          </td>
                        </tr>
                        {customer.products.map((product, idx) => (
                          <tr key={`${customer.customerId}-${product.productId}-${idx}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-700 pl-12">
                              └─ {product.productName || 'Sản phẩm không xác định'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.saleType === "DEBT" ? "Công nợ" : "Bán lẻ"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatNumber(Number(product.quantity))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                              {formatCurrency(Number(product.amount))}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                    {/* Product Subtotals */}
                    {(() => {
                      const productTotals = new Map<string, { quantity: number; amount: number; productName: string }>();

                      filteredCustomerReport.forEach(customer => {
                        customer.products.forEach(product => {
                          const key = product.productId?.toString() || product.productName || 'unknown';
                          const existing = productTotals.get(key) || { quantity: 0, amount: 0, productName: product.productName || 'Sản phẩm không xác định' };
                          existing.quantity += Number(product.quantity);
                          existing.amount += Number(product.amount);
                          productTotals.set(key, existing);
                        });
                      });

                      return Array.from(productTotals.values()).map((total, idx) => (
                        <tr key={`product-total-${idx}`} className="bg-yellow-50 font-semibold">
                          <td colSpan={2} className="px-6 py-4 text-sm text-gray-900 text-right">
                            Tổng {total.productName}:
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatNumber(total.quantity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-right font-semibold">
                            {formatCurrency(total.amount)}
                          </td>
                        </tr>
                      ));
                    })()}
                    {/* Grand Total Row */}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        Tổng cộng:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatNumber(
                          filteredCustomerReport.reduce((sum, customer) => sum + Number(customer.totalQuantity), 0)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">
                        {formatCurrency(
                          filteredCustomerReport.reduce((sum, customer) => sum + Number(customer.totalAmount), 0)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {filteredCustomerReport.length === 0 && (
                  <div className="p-12 text-center text-gray-500">Không có dữ liệu trong khoảng thời gian này</div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-green-600 to-green-700">
                    <tr>
                      {reportType === "pump" ? (
                        <>
                          <th
                            scope="col"
                            className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wide shadow-sm"
                          >
                            Vòi bơm
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wide shadow-sm"
                          >
                            Mặt hàng
                          </th>
                        </>
                      ) : (
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wide shadow-sm"
                        >
                          Mặt hàng
                        </th>
                      )}
                      <th
                        scope="col"
                        className="px-6 py-4 text-right text-sm font-bold text-white uppercase tracking-wide shadow-sm"
                      >
                        Đơn giá
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-right text-sm font-bold text-white uppercase tracking-wide shadow-sm"
                      >
                        Số lượng (Lít)
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-right text-sm font-bold text-white uppercase tracking-wide shadow-sm"
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                            {formatCurrency(Number(item.unitPrice))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatNumber(Number(item.totalQuantity))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                            {formatCurrency(Number(item.unitPrice))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatNumber(Number(item.totalQuantity))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatNumber(
                          (reportType === "pump" ? pumpReport : productReport)?.reduce(
                            (sum, item) => sum + Number(item.totalQuantity),
                            0
                          ) || 0
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">
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
