import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory";
import { lossConfigApi, type ProductCategory } from "../api/loss-config";
import { usePageTitle } from "../hooks/usePageTitle";
import { storesApi } from "../api/stores";
import { productsApi } from "../api/products";
import { useAuth } from "../contexts/AuthContext";
import {
  ArchiveBoxIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  BuildingStorefrontIcon,
  PrinterIcon,
  FunnelIcon,
  CalculatorIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
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
  formatNumber,
  formatDate,
} from "../utils/report-printer";
import DateRangePicker from "../components/DateRangePicker";
import SearchableSelect from "../components/SearchableSelect";

// Helper function to aggregate tanks by product within a store's report
const aggregateProductsByStore = (tanks: any[]) => {
  const productMap: Record<number, any> = {};

  tanks.forEach((tank) => {
    const productId = tank.productId;
    if (!productMap[productId]) {
      productMap[productId] = {
        productId: tank.productId,
        productCode: tank.productCode,
        productName: tank.productName,
        unitName: tank.unitName,
        tankCount: 0,
        totalCapacity: 0,
        openingBalance: 0,
        importQuantity: 0,
        exportQuantity: 0,
        closingBalance: 0,
      };
    }
    productMap[productId].tankCount += 1;
    productMap[productId].totalCapacity += Number(tank.capacity);
    productMap[productId].openingBalance += Number(tank.openingBalance);
    productMap[productId].importQuantity += Number(tank.importQuantity);
    productMap[productId].exportQuantity += Number(tank.exportQuantity);
    productMap[productId].closingBalance += Number(tank.closingBalance);
  });

  return Object.values(productMap);
};

const InventoryReportPage: React.FC = () => {
  usePageTitle("Nhập Xuất Tồn");
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [toDate, setToDate] = useState(
    dayjs().endOf("month").format("YYYY-MM-DD"),
  );
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    user?.storeId,
  );
  const [selectedPriceId, setSelectedPriceId] = useState<number | undefined>(
    undefined,
  );
  const [reportType, setReportType] = useState<"summary" | "import" | "export">(
    "summary",
  );
  const [isAllStores, setIsAllStores] = useState(false);

  // State cho tính hao hụt
  const [showLossColumn, setShowLossColumn] = useState(false);
  const [lossRates, setLossRates] = useState<Record<ProductCategory, number>>(
    {} as Record<ProductCategory, number>,
  );
  const [isCalculatingLoss, setIsCalculatingLoss] = useState(false);

  const isStoreUser = user?.roleCode === "STORE";

  // Fetch stores for admin/accountant
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => storesApi.getAll(),
    enabled: !user?.storeId,
  });

  // Get selected store's regionId
  const selectedStore =
    stores?.find((s) => s.id === selectedStoreId) || user?.store;
  const regionId = (selectedStore as any)?.regionId;

  // Fetch prices for the selected store's region only
  const { data: allPrices } = useQuery({
    queryKey: ["region-prices", regionId],
    queryFn: () => productsApi.getPricesByRegion(regionId!),
    enabled: !!regionId && !isAllStores,
  });

  // Reset selected price when store changes
  useEffect(() => {
    setSelectedPriceId(undefined);
  }, [selectedStoreId]);

  // Reset loss column when store, date range, or report type changes
  useEffect(() => {
    setShowLossColumn(false);
    setLossRates({} as Record<ProductCategory, number>);
  }, [selectedStoreId, fromDate, toDate, isAllStores]);

  // 🔥 NEW: Fetch inventory report WITH PERIODS (tách theo kỳ chốt)
  const { data: reportWithPeriods, isLoading: isLoadingReportWithPeriods } =
    useQuery({
      queryKey: [
        "inventory-report-with-periods",
        selectedStoreId,
        fromDate,
        toDate,
      ],
      queryFn: () => {
        if (!selectedStoreId)
          return Promise.resolve({ periods: [], tanks: [] });
        return inventoryApi.getInventoryReportByTankWithPeriods(
          selectedStoreId,
          fromDate,
          toDate,
        );
      },
      enabled: !!selectedStoreId && reportType === "summary" && !isAllStores,
    });

  // Legacy: Fetch inventory report (Summary) - single store - 🔥 THEO BỂ (Tank-based)
  const { data: report, isLoading: isLoadingReport } = useQuery({
    queryKey: ["inventory-report-by-tank", selectedStoreId, fromDate, toDate],
    queryFn: () => {
      if (!selectedStoreId) return Promise.resolve([]);
      return inventoryApi.getInventoryReportByTank(
        selectedStoreId,
        fromDate,
        toDate,
      );
    },
    enabled: false, // Disabled - use reportWithPeriods instead
  });

  // Fetch inventory reports for all stores - 🔥 THEO MẶT HÀNG (Product-based per store)
  const { data: allStoresReport, isLoading: isLoadingAllStoresReport } =
    useQuery({
      queryKey: ["inventory-report-all-stores-by-product", fromDate, toDate],
      queryFn: async () => {
        if (!stores || stores.length === 0) return [];

        const reports = await Promise.all(
          stores.map(async (store: any) => {
            try {
              const storeReport = await inventoryApi.getInventoryReportByTank(
                store.id,
                fromDate,
                toDate,
              );
              const aggregatedProducts = aggregateProductsByStore(storeReport);
              return {
                storeId: store.id,
                storeName: store.name,
                data: aggregatedProducts,
              };
            } catch (error) {
              console.error(
                `Error fetching report for store ${store.id}:`,
                error,
              );
              return {
                storeId: store.id,
                storeName: store.name,
                data: [],
              };
            }
          }),
        );

        return reports;
      },
      enabled: isAllStores && reportType === "summary" && !!stores,
    });

  // Fetch documents (Listing)
  const { data: documents, isLoading: isLoadingDocs } = useQuery({
    queryKey: [
      "inventory-documents",
      selectedStoreId,
      reportType,
      fromDate,
      toDate,
    ],
    queryFn: async () => {
      if (!selectedStoreId || reportType === "summary")
        return Promise.resolve([]);
      const type = reportType === "import" ? "IMPORT" : "EXPORT";
      console.log(
        `🔍 Fetching documents: storeId=${selectedStoreId}, type=${type}, from=${fromDate}, to=${toDate}`,
      );
      const result = await inventoryApi.getDocuments(
        selectedStoreId,
        type,
        fromDate,
        toDate,
      );
      console.log(`📦 Documents received:`, result);
      return result;
    },
    enabled: !!selectedStoreId && reportType !== "summary",
  });

  const isLoading =
    reportType === "summary"
      ? isAllStores
        ? isLoadingAllStoresReport
        : isLoadingReportWithPeriods
      : isLoadingDocs;

  // Hàm tính hao hụt
  const handleCalculateLoss = async () => {
    if (!selectedStoreId || isAllStores) {
      alert("Vui lòng chọn một cửa hàng cụ thể để tính hao hụt");
      return;
    }

    setIsCalculatingLoss(true);
    try {
      // Lấy cấu hình hao hụt đang hiệu lực của store
      const configs = await lossConfigApi.getCurrentByStore(selectedStoreId);

      const rates: Record<ProductCategory, number> = {
        GASOLINE: 0,
        DIESEL: 0,
      };

      configs.forEach((config) => {
        rates[config.productCategory] = Number(config.lossRate);
      });

      setLossRates(rates);
      setShowLossColumn(true);
    } catch (error) {
      console.error("Error fetching loss configs:", error);
      alert("Không thể lấy cấu hình hao hụt. Vui lòng kiểm tra lại.");
    } finally {
      setIsCalculatingLoss(false);
    }
  };

  // Hàm tính hao hụt và tồn sau hao hụt cho một item
  const calculateLossForItem = (item: any) => {
    const category = item.productCategory as ProductCategory;
    const lossRate = category && lossRates[category] ? lossRates[category] : 0;
    const exportQty = Number(item.exportQuantity);
    const lossAmount = exportQty * lossRate;
    const closingAfterLoss =
      Number(item.openingBalance) +
      Number(item.importQuantity) -
      exportQty -
      lossAmount;
    return { lossRate, lossAmount, closingAfterLoss };
  };

  const handleExport = async () => {
    // @ts-ignore
    const storeName = isAllStores
      ? "Tất cả cửa hàng"
      : user?.store?.name ||
        stores?.find((s) => s.id === selectedStoreId)?.name ||
        "Cửa hàng";

    if (reportType === "summary") {
      if (isAllStores && (!allStoresReport || allStoresReport.length === 0)) {
        alert("Không có dữ liệu để xuất");
        return;
      }
      if (
        !isAllStores &&
        (!reportWithPeriods || reportWithPeriods.periods.length === 0)
      ) {
        alert("Không có dữ liệu để xuất");
        return;
      }

      const { workbook, worksheet } = createReportWorkbook("Nhập xuất tồn");

      addReportHeader(worksheet, {
        storeName,
        title: "BÁO CÁO NHẬP - XUẤT - TỒN",
        fromDate,
        toDate,
      });

      // Columns setup
      if (isAllStores) {
        // 🔥 THEO MẶT HÀNG (Product-based for all stores)
        worksheet.columns = [
          { key: "stt", width: 6 },
          { key: "productName", width: 25 },
          { key: "unit", width: 10 },
          { key: "tankCount", width: 8 },
          { key: "capacity", width: 12 },
          { key: "opening", width: 15 },
          { key: "import", width: 15 },
          { key: "export", width: 15 },
          { key: "closing", width: 15 },
        ];

        // Table Header (Row 7)
        const headerRow = worksheet.getRow(7);
        headerRow.values = [
          "STT",
          "Mặt hàng",
          "ĐVT",
          "Số bể",
          "Dung tích",
          "Tồn đầu kỳ",
          "Nhập",
          "Xuất",
          "Tồn cuối kỳ",
        ];
        headerRow.font = STYLES.headerFont;
        headerRow.alignment = STYLES.centerAlign;
        headerRow.eachCell((cell) => {
          cell.border = STYLES.borderStyle;
        });
      } else {
        // 🔥 THEO BỂ (Tank-based for single store)
        worksheet.columns = [
          { key: "stt", width: 6 },
          { key: "tankCode", width: 12 },
          { key: "tankName", width: 20 },
          { key: "productName", width: 25 },
          { key: "unit", width: 10 },
          { key: "capacity", width: 12 },
          { key: "opening", width: 15 },
          { key: "import", width: 15 },
          { key: "export", width: 15 },
          { key: "closing", width: 15 },
        ];

        // Table Header (Row 7)
        const headerRow = worksheet.getRow(7);
        headerRow.values = [
          "STT",
          "Mã bể",
          "Tên bể",
          "Mặt hàng",
          "ĐVT",
          "Dung tích",
          "Tồn đầu kỳ",
          "Nhập",
          "Xuất",
          "Tồn cuối kỳ",
        ];
        headerRow.font = STYLES.headerFont;
        headerRow.alignment = STYLES.centerAlign;
        headerRow.eachCell((cell) => {
          cell.border = STYLES.borderStyle;
        });
      }

      // Data Rows
      let totalOpening = 0;
      let totalImport = 0;
      let totalExport = 0;
      let totalClosing = 0;

      if (isAllStores && allStoresReport) {
        // All stores mode - group by store, then by product (🔥 THEO MẶT HÀNG)
        let stt = 1;
        allStoresReport.forEach((storeData: any) => {
          if (storeData.data && storeData.data.length > 0) {
            // Store header row
            const storeHeaderRow = worksheet.addRow([
              storeData.storeName,
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ]);
            storeHeaderRow.font = { ...STYLES.boldFont, size: 12 };
            storeHeaderRow.eachCell((cell) => {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFE0E0E0" },
              };
              cell.border = STYLES.borderStyle;
            });
            worksheet.mergeCells(
              `A${storeHeaderRow.number}:I${storeHeaderRow.number}`,
            );

            // Store data rows - products (🔥 THEO MẶT HÀNG)
            storeData.data.forEach((product: any) => {
              const row = worksheet.addRow([
                stt++,
                product.productName,
                product.unitName,
                product.tankCount,
                Number(product.totalCapacity),
                Number(product.openingBalance),
                Number(product.importQuantity),
                Number(product.exportQuantity),
                Number(product.closingBalance),
              ]);

              totalOpening += Number(product.openingBalance);
              totalImport += Number(product.importQuantity);
              totalExport += Number(product.exportQuantity);
              totalClosing += Number(product.closingBalance);

              row.font = STYLES.normalFont;
              row.eachCell((cell, colNumber) => {
                cell.border = STYLES.borderStyle;
                if (colNumber === 1 || colNumber === 4) {
                  cell.alignment = STYLES.centerAlign;
                } else if (colNumber >= 2 && colNumber <= 3) {
                  cell.alignment = STYLES.leftAlign;
                } else {
                  cell.alignment = STYLES.rightAlign;
                  cell.numFmt = "#,##0.00";
                }
              });
            });
          }
        });
      } else {
        // Single store mode - sử dụng reportWithPeriods
        if (reportWithPeriods && reportWithPeriods.periods) {
          let stt = 1;
          reportWithPeriods.periods.forEach((period: any) => {
            // Period header row
            const periodLabel =
              period.periodType === "CLOSED" ? "✓ Đã chốt" : "⏳ Chưa chốt";
            const periodRange = `${dayjs(period.periodFrom).format("DD/MM/YYYY")} → ${dayjs(period.periodTo).format("DD/MM/YYYY")}`;
            const closingInfo = period.closingDate
              ? ` (Chốt lúc: ${dayjs(period.closingDate).format("DD/MM/YYYY HH:mm")})`
              : "";

            const periodHeaderRow = worksheet.addRow([
              `${periodLabel}: ${periodRange}${closingInfo}`,
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ]);
            periodHeaderRow.font = { ...STYLES.boldFont, size: 11 };
            periodHeaderRow.eachCell((cell) => {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                  argb:
                    period.periodType === "CLOSED" ? "FFD4EDDA" : "FFFFF3CD",
                },
              };
              cell.border = STYLES.borderStyle;
            });
            worksheet.mergeCells(
              `A${periodHeaderRow.number}:J${periodHeaderRow.number}`,
            );

            // Period items
            period.items.forEach((item: any) => {
              const row = worksheet.addRow([
                stt++,
                item.tankCode,
                item.tankName,
                item.productName,
                item.unitName,
                Number(item.capacity),
                Number(item.openingBalance),
                Number(item.importQuantity),
                Number(item.exportQuantity),
                Number(item.closingBalance),
              ]);

              totalOpening += Number(item.openingBalance);
              totalImport += Number(item.importQuantity);
              totalExport += Number(item.exportQuantity);
              totalClosing += Number(item.closingBalance);

              row.font = STYLES.normalFont;
              row.eachCell((cell, colNumber) => {
                cell.border = STYLES.borderStyle;
                if (colNumber === 1 || colNumber === 5) {
                  cell.alignment = STYLES.centerAlign;
                } else if (colNumber >= 2 && colNumber <= 4) {
                  cell.alignment = STYLES.leftAlign;
                } else {
                  cell.alignment = STYLES.rightAlign;
                  cell.numFmt = "#,##0.00";
                }
              });
            });

            // 🔥 Tổng theo từng mặt hàng CHỈ CỦA KỲ NÀY
            const periodProductTotals: Record<
              number,
              {
                productId: number;
                productName: string;
                openingBalance: number;
                importQuantity: number;
                exportQuantity: number;
                lossAmount: number;
                closingBalance: number;
              }
            > = {};

            period.items.forEach((item: any) => {
              if (!periodProductTotals[item.productId]) {
                periodProductTotals[item.productId] = {
                  productId: item.productId,
                  productName: item.productName,
                  openingBalance: 0,
                  importQuantity: 0,
                  exportQuantity: 0,
                  lossAmount: 0,
                  closingBalance: 0,
                };
              }
              periodProductTotals[item.productId].openingBalance += Number(
                item.openingBalance,
              );
              periodProductTotals[item.productId].importQuantity += Number(
                item.importQuantity,
              );
              periodProductTotals[item.productId].exportQuantity += Number(
                item.exportQuantity,
              );
              periodProductTotals[item.productId].lossAmount += Number(
                item.lossAmount || 0,
              );
              periodProductTotals[item.productId].closingBalance += Number(
                item.closingBalance,
              );
            });

            const periodProductList = Object.values(periodProductTotals);
            const periodTotal = {
              openingBalance: periodProductList.reduce(
                (sum, p) => sum + p.openingBalance,
                0,
              ),
              importQuantity: periodProductList.reduce(
                (sum, p) => sum + p.importQuantity,
                0,
              ),
              exportQuantity: periodProductList.reduce(
                (sum, p) => sum + p.exportQuantity,
                0,
              ),
              lossAmount: periodProductList.reduce(
                (sum, p) => sum + p.lossAmount,
                0,
              ),
              closingBalance: periodProductList.reduce(
                (sum, p) => sum + p.closingBalance,
                0,
              ),
            };

            const periodBgColor =
              period.periodType === "CLOSED" ? "FFD4EDDA" : "FFFFF3CD";

            // Tổng từng mặt hàng của kỳ
            periodProductList.forEach((product) => {
              const row = worksheet.addRow([
                "",
                "",
                "",
                `Tổng ${product.productName}`,
                "lít",
                "-",
                product.openingBalance,
                product.importQuantity,
                product.exportQuantity,
                product.closingBalance,
              ]);
              row.font = STYLES.boldFont;
              row.eachCell((cell, colNumber) => {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: periodBgColor },
                };
                cell.border = STYLES.borderStyle;
                if (colNumber >= 7) {
                  cell.alignment = STYLES.rightAlign;
                  cell.numFmt = "#,##0.00";
                }
              });
              worksheet.mergeCells(`A${row.number}:C${row.number}`);
            });

            // Tổng tất cả mặt hàng của kỳ
            // const periodTotalRow = worksheet.addRow([
            //   '',
            //   '',
            //   '',
            //   '',
            //   `🏁 Tổng cộng kỳ ${period.periodType === 'CLOSED' ? 'đã chốt' : 'chưa chốt'}`,
            //   '',
            //   periodTotal.openingBalance,
            //   periodTotal.importQuantity,
            //   periodTotal.exportQuantity,
            //   periodTotal.closingBalance,
            // ]);
            const periodTotalRow = worksheet.addRow([
              "",
              "",
              "",
              "",
              `🏁 Tổng cộng: `,
              "",
              periodTotal.openingBalance,
              periodTotal.importQuantity,
              periodTotal.exportQuantity,
              periodTotal.closingBalance,
            ]);
            periodTotalRow.font = STYLES.boldFont;
            periodTotalRow.eachCell((cell, colNumber) => {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: periodBgColor },
              };
              cell.border = STYLES.borderStyle;
              if (colNumber >= 7) {
                cell.alignment = STYLES.rightAlign;
                cell.numFmt = "#,##0.00";
              }
            });
            worksheet.mergeCells(
              `A${periodTotalRow.number}:D${periodTotalRow.number}`,
            );
            worksheet.mergeCells(
              `E${periodTotalRow.number}:F${periodTotalRow.number}`,
            );
          });
        }
      }

      addReportFooter(worksheet);
      await downloadExcel(workbook, "Bao_cao_nhap_xuat_ton");
    } else {
      // Import or Export listing
      if (!documents || documents.length === 0) {
        alert("Không có dữ liệu để xuất");
        return;
      }

      const { workbook, worksheet } = createReportWorkbook(
        reportType === "import" ? "Bảng kê nhập" : "Bảng kê xuất",
      );

      addReportHeader(worksheet, {
        storeName,
        title:
          reportType === "import"
            ? "BẢNG KÊ CHI TIẾT NHẬP KHO"
            : "BẢNG KÊ CHI TIẾT XUẤT KHO",
        fromDate,
        toDate,
      });

      // Columns setup
      worksheet.columns = [
        { key: "stt", width: 6 },
        { key: "date", width: 15 },
        { key: "invoice", width: 18 },
        { key: "supplier", width: 25 },
        { key: "product", width: 25 },
        { key: "quantity", width: 15 },
        { key: "price", width: 15 },
        { key: "amount", width: 18 },
      ];

      // Table Header (Row 7)
      const headerRow = worksheet.getRow(7);
      headerRow.values = [
        "STT",
        "Ngày",
        "Số chứng từ",
        reportType === "import" ? "Nhà cung cấp" : "Khách hàng/Ghi chú",
        "Mặt hàng",
        "Số lượng",
        "Đơn giá",
        "Thành tiền",
      ];
      headerRow.font = STYLES.headerFont;
      headerRow.alignment = STYLES.centerAlign;
      headerRow.eachCell((cell) => {
        cell.border = STYLES.borderStyle;
      });

      // Data Rows
      let totalQuantity = 0;
      let totalAmount = 0;

      documents.forEach((item, index) => {
        const row = worksheet.addRow([
          index + 1,
          item.docAt
            ? dayjs(item.docAt).format("DD/MM/YYYY HH:mm")
            : dayjs(item.docDate).format("DD/MM/YYYY"),
          item.invoiceNumber || "-",
          item.supplierName || "-",
          item.productName,
          Number(item.quantity),
          Number(item.unitPrice),
          Number(item.amount),
        ]);

        totalQuantity += Number(item.quantity);
        totalAmount += Number(item.amount);

        row.font = STYLES.normalFont;
        row.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber === 1 || colNumber === 2) {
            cell.alignment = STYLES.centerAlign;
          } else if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
            cell.alignment = STYLES.leftAlign;
          } else {
            cell.alignment = STYLES.rightAlign;
            if (colNumber === 6) cell.numFmt = "#,##0.00";
            else cell.numFmt = "#,##0";
          }
        });
      });

      // Total Row
      const totalRow = worksheet.addRow([
        "",
        "",
        "",
        "",
        "Tổng cộng",
        totalQuantity,
        "",
        totalAmount,
      ]);
      totalRow.font = STYLES.boldFont;
      totalRow.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        if (colNumber === 5) {
          cell.alignment = STYLES.centerAlign;
        } else if (colNumber === 6 || colNumber === 8) {
          cell.alignment = STYLES.rightAlign;
          if (colNumber === 6) cell.numFmt = "#,##0.00";
          else cell.numFmt = "#,##0";
        }
      });
      worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);

      addReportFooter(worksheet);
      await downloadExcel(
        workbook,
        reportType === "import" ? "Bang_ke_nhap" : "Bang_ke_xuat",
      );
    }
  };

  const handlePrint = () => {
    // @ts-ignore
    const storeName = isAllStores
      ? "Tất cả cửa hàng"
      : user?.store?.name ||
        stores?.find((s) => s.id === selectedStoreId)?.name ||
        "Cửa hàng";

    if (reportType === "summary") {
      if (isAllStores && (!allStoresReport || allStoresReport.length === 0)) {
        alert("Không có dữ liệu để in");
        return;
      }
      if (
        !isAllStores &&
        (!reportWithPeriods || reportWithPeriods.periods.length === 0)
      ) {
        alert("Không có dữ liệu để in");
        return;
      }

      let totalOpening = 0;
      let totalImport = 0;
      let totalExport = 0;
      let totalClosing = 0;

      let tableRows = "";

      if (isAllStores && allStoresReport) {
        // All stores mode - group by store, then by product (🔥 THEO MẶT HÀNG)
        let stt = 1;
        allStoresReport.forEach((storeData: any) => {
          if (storeData.data && storeData.data.length > 0) {
            // Store header row (🔥 9 cột)
            tableRows += `
              <tr class="store-header">
                <td colspan="9" class="text-left font-bold" style="background-color: #e0e0e0; padding: 8px;">${storeData.storeName}</td>
              </tr>
            `;

            // Store data rows - products (🔥 THEO MẶT HÀNG)
            storeData.data.forEach((product: any) => {
              totalOpening += Number(product.openingBalance);
              totalImport += Number(product.importQuantity);
              totalExport += Number(product.exportQuantity);
              totalClosing += Number(product.closingBalance);

              tableRows += `
                <tr>
                  <td class="text-center">${stt++}</td>
                  <td class="text-left">${product.productName}</td>
                  <td class="text-center">${product.unitName}</td>
                  <td class="text-center">${product.tankCount}</td>
                  <td class="text-right">${formatNumber(product.totalCapacity)}</td>
                  <td class="text-right">${formatNumber(product.openingBalance)}</td>
                  <td class="text-right">${formatNumber(product.importQuantity)}</td>
                  <td class="text-right">${formatNumber(product.exportQuantity)}</td>
                  <td class="text-right">${formatNumber(product.closingBalance)}</td>
                </tr>
              `;
            });
          }
        });
      } else {
        // Single store mode - sử dụng reportWithPeriods
        if (reportWithPeriods && reportWithPeriods.periods) {
          let stt = 1;
          reportWithPeriods.periods.forEach((period: any) => {
            // Period header row
            const periodLabel =
              period.periodType === "CLOSED" ? "✓ Đã chốt" : "⏳ Chưa chốt";
            const periodRange = `${dayjs(period.periodFrom).format("DD/MM/YYYY")} → ${dayjs(period.periodTo).format("DD/MM/YYYY")}`;
            const closingInfo = period.closingDate
              ? ` (Chốt lúc: ${dayjs(period.closingDate).format("DD/MM/YYYY HH:mm")})`
              : "";
            const bgColor =
              period.periodType === "CLOSED" ? "#d4edda" : "#fff3cd";

            tableRows += `
              <tr class="period-header">
                <td colspan="10" class="text-left font-bold" style="background-color: ${bgColor}; padding: 8px;">${periodLabel}: ${periodRange}${closingInfo}</td>
              </tr>
            `;

            // Period items
            period.items.forEach((item: any) => {
              totalOpening += Number(item.openingBalance);
              totalImport += Number(item.importQuantity);
              totalExport += Number(item.exportQuantity);
              totalClosing += Number(item.closingBalance);

              tableRows += `
                <tr>
                  <td class="text-center">${stt++}</td>
                  <td class="text-center">${item.tankCode}</td>
                  <td class="text-left">${item.tankName}</td>
                  <td class="text-left">${item.productName}</td>
                  <td class="text-center">${item.unitName}</td>
                  <td class="text-right">${formatNumber(item.capacity)}</td>
                  <td class="text-right">${formatNumber(item.openingBalance)}</td>
                  <td class="text-right">${formatNumber(item.importQuantity)}</td>
                  <td class="text-right">${formatNumber(item.exportQuantity)}</td>
                  <td class="text-right">${formatNumber(item.closingBalance)}</td>
                </tr>
              `;
            });

            // 🔥 Tổng theo từng mặt hàng CHỈ CỦA KỲ NÀY
            const periodProductTotals: Record<
              number,
              {
                productId: number;
                productName: string;
                openingBalance: number;
                importQuantity: number;
                exportQuantity: number;
                closingBalance: number;
              }
            > = {};

            period.items.forEach((item: any) => {
              if (!periodProductTotals[item.productId]) {
                periodProductTotals[item.productId] = {
                  productId: item.productId,
                  productName: item.productName,
                  openingBalance: 0,
                  importQuantity: 0,
                  exportQuantity: 0,
                  closingBalance: 0,
                };
              }
              periodProductTotals[item.productId].openingBalance += Number(
                item.openingBalance,
              );
              periodProductTotals[item.productId].importQuantity += Number(
                item.importQuantity,
              );
              periodProductTotals[item.productId].exportQuantity += Number(
                item.exportQuantity,
              );
              periodProductTotals[item.productId].closingBalance += Number(
                item.closingBalance,
              );
            });

            const periodProductList = Object.values(periodProductTotals);
            const periodTotal = {
              openingBalance: periodProductList.reduce(
                (sum, p) => sum + p.openingBalance,
                0,
              ),
              importQuantity: periodProductList.reduce(
                (sum, p) => sum + p.importQuantity,
                0,
              ),
              exportQuantity: periodProductList.reduce(
                (sum, p) => sum + p.exportQuantity,
                0,
              ),
              closingBalance: periodProductList.reduce(
                (sum, p) => sum + p.closingBalance,
                0,
              ),
            };

            // Tổng từng mặt hàng của kỳ
            periodProductList.forEach((product) => {
              tableRows += `
                <tr style="background-color: ${bgColor};">
                  <td colspan="3" class="text-left font-bold">Tổng ${product.productName}</td>
                  <td class="text-center">lít</td>
                  <td class="text-right">-</td>
                  <td class="text-right font-bold">${formatNumber(product.openingBalance)}</td>
                  <td class="text-right font-bold" style="color: green;">${formatNumber(product.importQuantity)}</td>
                  <td class="text-right font-bold" style="color: red;">${formatNumber(product.exportQuantity)}</td>
                  <td class="text-right">-</td>
                  <td class="text-right font-bold" style="color: blue;">${formatNumber(product.closingBalance)}</td>
                </tr>
              `;
            });

            // Tổng tất cả mặt hàng của kỳ
            tableRows += `
              <tr style="background-color: ${bgColor}; border-bottom: 2px solid;">
                <td colspan="5" class="text-left font-bold">🏁 Tổng cộng kỳ ${period.periodType === "CLOSED" ? "đã chốt" : "chưa chốt"}</td>
                <td class="text-right font-bold">${formatNumber(periodTotal.openingBalance)}</td>
                <td class="text-right font-bold" style="color: green;">${formatNumber(periodTotal.importQuantity)}</td>
                <td class="text-right font-bold" style="color: red;">${formatNumber(periodTotal.exportQuantity)}</td>
                <td class="text-right">-</td>
                <td class="text-right font-bold" style="color: blue;">${formatNumber(periodTotal.closingBalance)}</td>
              </tr>
            `;
          });
        }
      }

      const tableHTML = `
        <table>
          <thead>
            <tr>
              <th>STT</th>
              ${
                isAllStores
                  ? `
                <th>Mặt hàng</th>
                <th>ĐVT</th>
                <th>Số bể</th>
                <th>Dung tích</th>
              `
                  : `
                <th>Mã bể</th>
                <th>Tên bể</th>
                <th>Mặt hàng</th>
                <th>ĐVT</th>
                <th>Dung tích</th>
              `
              }
              <th>Tồn đầu kỳ</th>
              <th>Nhập</th>
              <th>Xuất</th>
              ${!isAllStores ? "<th>Hao hụt</th>" : ""}
              <th>Tồn cuối kỳ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;

      printReport(tableHTML, {
        storeName,
        title: isAllStores
          ? "BÁO CÁO NHẬP - XUẤT - TỒN THEO MẶT HÀNG"
          : "BÁO CÁO NHẬP - XUẤT - TỒN THEO BỂ",
        fromDate,
        toDate,
      });
    } else {
      // Import or Export listing
      if (!documents || documents.length === 0) {
        alert("Không có dữ liệu để in");
        return;
      }

      let totalQuantity = 0;
      let totalAmount = 0;

      const tableRows = documents
        .map((item, index) => {
          totalQuantity += Number(item.quantity);
          totalAmount += Number(item.amount);

          return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td class="text-center">${item.docAt ? dayjs(item.docAt).format("DD/MM/YYYY HH:mm") : formatDate(item.docDate)}</td>
            <td class="text-left">${item.invoiceNumber || "-"}</td>
            <td class="text-left">${item.supplierName || "-"}</td>
            <td class="text-left">${item.productName}</td>
            <td class="text-right">${formatNumber(Number(item.quantity))}</td>
            <td class="text-right">${formatCurrency(Number(item.unitPrice))}</td>
            <td class="text-right font-bold">${formatCurrency(Number(item.amount))}</td>
          </tr>
        `;
        })
        .join("");

      const tableHTML = `
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Ngày</th>
              <th>Số chứng từ</th>
              <th>${reportType === "import" ? "Nhà cung cấp" : "Khách hàng/Ghi chú"}</th>
              <th>Mặt hàng</th>
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
        title:
          reportType === "import"
            ? "BẢNG KÊ CHI TIẾT NHẬP KHO"
            : "BẢNG KÊ CHI TIẾT XUẤT KHO",
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
              <ArchiveBoxIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Báo cáo Nhập - Xuất - Tồn
              </h1>
              <p className="text-sm text-gray-600">
                Theo dõi biến động hàng hóa trong kho
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={
                reportType === "summary"
                  ? isAllStores
                    ? !allStoresReport?.length
                    : !reportWithPeriods?.periods?.length
                  : !documents?.length
              }
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Xuất Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={
                reportType === "summary"
                  ? isAllStores
                    ? !allStoresReport?.length
                    : !reportWithPeriods?.periods?.length
                  : !documents?.length
              }
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              <PrinterIcon className="h-4 w-4 mr-1" />
              In báo cáo
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Store Selector */}
          {!user?.storeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cửa hàng
              </label>
              <SearchableSelect
                options={[
                  { value: "all", label: "📊 Tất cả cửa hàng" },
                  ...(stores?.map((store) => ({
                    value: store.id,
                    label: store.name,
                  })) || []),
                ]}
                value={isAllStores ? "all" : selectedStoreId || null}
                onChange={(val) => {
                  if (val === "all") {
                    setIsAllStores(true);
                    setSelectedStoreId(undefined);
                  } else {
                    setIsAllStores(false);
                    setSelectedStoreId(val ? Number(val) : undefined);
                  }
                }}
                placeholder="Chọn cửa hàng"
              />
            </div>
          )}
          {isStoreUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cửa hàng
                <span className="ml-2 text-xs text-gray-500">
                  (Cửa hàng của bạn)
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={user?.store?.name || "Cửa hàng của bạn"}
                  disabled
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-100 text-gray-600 cursor-not-allowed sm:text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kỳ giá
            </label>
            <SearchableSelect
              options={
                allPrices?.map((price) => ({
                  value: price.id,
                  label: `${price.product?.name} - ${price.region?.name} (${new Intl.NumberFormat("vi-VN").format(price.price)}đ) - ${new Date(price.validFrom).toLocaleDateString("vi-VN")}`,
                })) || []
              }
              value={selectedPriceId || null}
              onChange={(val) =>
                setSelectedPriceId(val ? Number(val) : undefined)
              }
              placeholder="Tất cả kỳ giá"
              isClearable
            />
          </div>
        </div>

        {/* Active Filter Info */}
        {reportType === "summary" && (fromDate || toDate) && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Đang lọc:{" "}
                {fromDate ? dayjs(fromDate).format("DD/MM/YYYY") : "..."} đến{" "}
                {toDate ? dayjs(toDate).format("DD/MM/YYYY") : "..."}
              </span>
            </div>
          </div>
        )}

        {/* Report Type Toggle */}
        <div className="flex justify-center">
          <span className="relative z-0 inline-flex shadow-sm rounded-md">
            <button
              type="button"
              onClick={() => setReportType("summary")}
              className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                reportType === "summary"
                  ? "bg-blue-50 text-blue-600 border-blue-500 z-10"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Tổng hợp
            </button>
            <button
              type="button"
              onClick={() => setReportType("import")}
              className={`-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                reportType === "import"
                  ? "bg-blue-50 text-blue-600 border-blue-500 z-10"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Bảng kê Nhập
            </button>
            <button
              type="button"
              onClick={() => setReportType("export")}
              className={`-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                reportType === "export"
                  ? "bg-blue-50 text-blue-600 border-blue-500 z-10"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Bảng kê Xuất
            </button>
          </span>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {reportType === "summary" ? (
                    <>
                      {isAllStores ? (
                        // 🔥 All stores mode - THEO MẶT HÀNG (grouped by product)
                        <>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Mặt hàng
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            ĐVT
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Số bể
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Dung tích
                          </th>
                        </>
                      ) : (
                        // 🔥 Single store mode - THEO BỂ (tank-based)
                        <>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Mã bể
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Tên bể
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Mặt hàng
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            ĐVT
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Dung tích
                          </th>
                        </>
                      )}
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Tồn đầu kỳ
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Nhập
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Xuất
                      </th>
                      {/* Hao hụt - chỉ hiển thị cho single store vì có kỳ đã chốt */}
                      {!isAllStores && (
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-orange-600 uppercase tracking-wider"
                        >
                          Hao hụt
                        </th>
                      )}
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Tồn cuối kỳ
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Ngày giờ
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Số chứng từ
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {reportType === "import"
                          ? "Nhà cung cấp"
                          : "Khách hàng/Ghi chú"}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Mặt hàng
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Số lượng
                      </th>
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
                        Thành tiền
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportType === "summary" &&
                isAllStores &&
                allStoresReport &&
                allStoresReport.length > 0 ? (
                  // All stores mode - grouped by store, then by product (🔥 THEO MẶT HÀNG)
                  allStoresReport.map((storeData: any, storeIndex: number) => (
                    <React.Fragment key={storeIndex}>
                      {storeData.data && storeData.data.length > 0 && (
                        <>
                          <tr className="bg-gray-100">
                            <td
                              colSpan={8}
                              className="px-6 py-3 text-left text-sm font-bold text-gray-900"
                            >
                              {storeData.storeName}
                            </td>
                          </tr>
                          {storeData.data.map(
                            (product: any, itemIndex: number) => (
                              <tr
                                key={`${storeIndex}-${itemIndex}`}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {product.productName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {product.unitName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                  {product.tankCount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                  {Number(product.totalCapacity).toLocaleString(
                                    "vi-VN",
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  {Number(
                                    product.openingBalance,
                                  ).toLocaleString("vi-VN")}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                                  {Number(
                                    product.importQuantity,
                                  ).toLocaleString("vi-VN")}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                                  {Number(
                                    product.exportQuantity,
                                  ).toLocaleString("vi-VN")}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                                  {Number(
                                    product.closingBalance,
                                  ).toLocaleString("vi-VN")}
                                </td>
                              </tr>
                            ),
                          )}
                        </>
                      )}
                    </React.Fragment>
                  ))
                ) : reportType === "summary" &&
                  !isAllStores &&
                  reportWithPeriods &&
                  reportWithPeriods.periods.length > 0 ? (
                  // 🔥 NEW: Single store mode - TÁCH THEO KỲ CHỐT
                  <>
                    {reportWithPeriods.periods.map(
                      (period: any, periodIndex: number) => (
                        <React.Fragment key={periodIndex}>
                          {/* Period Header */}
                          <tr
                            className={
                              period.periodType === "CLOSED"
                                ? "bg-green-50"
                                : "bg-yellow-50"
                            }
                          >
                            <td colSpan={10} className="px-6 py-3 text-left">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      period.periodType === "CLOSED"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {period.periodType === "CLOSED"
                                      ? "✓ Đã chốt"
                                      : "⏳ Chưa chốt"}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {dayjs(period.periodFrom).format(
                                      "DD/MM/YYYY",
                                    )}{" "}
                                    →{" "}
                                    {dayjs(period.periodTo).format(
                                      "DD/MM/YYYY",
                                    )}
                                  </span>
                                </div>
                                {period.closingDate && (
                                  <span className="text-xs text-gray-500">
                                    Chốt lúc:{" "}
                                    {dayjs(period.closingDate).format(
                                      "DD/MM/YYYY HH:mm",
                                    )}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Period Items */}
                          {period.items.map((item: any, itemIndex: number) => {
                            const lossData =
                              showLossColumn && period.periodType === "OPEN"
                                ? calculateLossForItem(item)
                                : null;
                            return (
                              <tr
                                key={`${periodIndex}-${itemIndex}`}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {item.tankCode}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.tankName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.productName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.unitName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                  {Number(item.capacity).toLocaleString(
                                    "vi-VN",
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  {Number(item.openingBalance).toLocaleString(
                                    "vi-VN",
                                    { maximumFractionDigits: 2 },
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                                  {Number(item.importQuantity).toLocaleString(
                                    "vi-VN",
                                    { maximumFractionDigits: 2 },
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                                  {Number(item.exportQuantity).toLocaleString(
                                    "vi-VN",
                                    { maximumFractionDigits: 2 },
                                  )}
                                </td>
                                {/* Hao hụt - hiển thị nếu đã chốt hoặc đang tính */}
                                {period.periodType === "CLOSED" ? (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                                      {Number(
                                        item.lossAmount || 0,
                                      ).toLocaleString("vi-VN", {
                                        maximumFractionDigits: 2,
                                      })}
                                      {item.lossRate > 0 && (
                                        <span className="text-xs text-gray-400 ml-1">
                                          (
                                          {(
                                            Number(item.lossRate) * 100
                                          ).toFixed(3)}
                                          %)
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                                      {Number(
                                        item.closingBalance,
                                      ).toLocaleString("vi-VN", {
                                        maximumFractionDigits: 2,
                                      })}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-400">
                                      {lossData ? (
                                        <>
                                          {lossData.lossAmount.toLocaleString(
                                            "vi-VN",
                                            { maximumFractionDigits: 2 },
                                          )}
                                          <span className="text-xs ml-1">
                                            (
                                            {(lossData.lossRate * 100).toFixed(
                                              3,
                                            )}
                                            %)
                                          </span>
                                        </>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                                      {lossData
                                        ? lossData.closingAfterLoss.toLocaleString(
                                            "vi-VN",
                                            { maximumFractionDigits: 2 },
                                          )
                                        : Number(
                                            item.closingBalance,
                                          ).toLocaleString("vi-VN", {
                                            maximumFractionDigits: 2,
                                          })}
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                          {/* 🔥 Tổng của kỳ này */}
                          {(() => {
                            // Tính tổng theo từng mặt hàng CHỈ CỦA KỲ NÀY
                            const periodProductTotals: Record<
                              number,
                              {
                                productId: number;
                                productName: string;
                                openingBalance: number;
                                importQuantity: number;
                                exportQuantity: number;
                                lossAmount: number;
                                closingBalance: number;
                              }
                            > = {};

                            period.items.forEach((item: any) => {
                              if (!periodProductTotals[item.productId]) {
                                periodProductTotals[item.productId] = {
                                  productId: item.productId,
                                  productName: item.productName,
                                  openingBalance: 0,
                                  importQuantity: 0,
                                  exportQuantity: 0,
                                  lossAmount: 0,
                                  closingBalance: 0,
                                };
                              }
                              periodProductTotals[
                                item.productId
                              ].openingBalance += Number(item.openingBalance);
                              periodProductTotals[
                                item.productId
                              ].importQuantity += Number(item.importQuantity);
                              periodProductTotals[
                                item.productId
                              ].exportQuantity += Number(item.exportQuantity);
                              periodProductTotals[item.productId].lossAmount +=
                                Number(item.lossAmount || 0);
                              periodProductTotals[
                                item.productId
                              ].closingBalance += Number(item.closingBalance);
                            });

                            const periodProductList =
                              Object.values(periodProductTotals);
                            const periodTotal = {
                              openingBalance: periodProductList.reduce(
                                (sum, p) => sum + p.openingBalance,
                                0,
                              ),
                              importQuantity: periodProductList.reduce(
                                (sum, p) => sum + p.importQuantity,
                                0,
                              ),
                              exportQuantity: periodProductList.reduce(
                                (sum, p) => sum + p.exportQuantity,
                                0,
                              ),
                              lossAmount: periodProductList.reduce(
                                (sum, p) => sum + p.lossAmount,
                                0,
                              ),
                              closingBalance: periodProductList.reduce(
                                (sum, p) => sum + p.closingBalance,
                                0,
                              ),
                            };

                            const bgColor =
                              period.periodType === "CLOSED"
                                ? "bg-green-100"
                                : "bg-yellow-100";
                            const borderColor =
                              period.periodType === "CLOSED"
                                ? "border-green-400"
                                : "border-yellow-400";
                            const textColor =
                              period.periodType === "CLOSED"
                                ? "text-green-800"
                                : "text-yellow-800";

                            return (
                              <>
                                {/* Tổng từng mặt hàng của kỳ */}
                                {periodProductList.map((product, idx) => (
                                  <tr
                                    key={`period-${periodIndex}-product-${idx}`}
                                    className={`${bgColor} hover:opacity-80`}
                                  >
                                    <td
                                      colSpan={3}
                                      className={`px-6 py-2 whitespace-nowrap text-sm font-semibold ${textColor}`}
                                    >
                                      Tổng {product.productName}
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                                      lít
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-right text-gray-500">
                                      -
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                      {product.openingBalance.toLocaleString(
                                        "vi-VN",
                                        { maximumFractionDigits: 2 },
                                      )}
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                                      {product.importQuantity.toLocaleString(
                                        "vi-VN",
                                        { maximumFractionDigits: 2 },
                                      )}
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                                      {product.exportQuantity.toLocaleString(
                                        "vi-VN",
                                        { maximumFractionDigits: 2 },
                                      )}
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-semibold text-orange-600">
                                      {product.lossAmount > 0
                                        ? product.lossAmount.toLocaleString(
                                            "vi-VN",
                                            { maximumFractionDigits: 2 },
                                          )
                                        : "-"}
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-bold text-blue-700">
                                      {product.closingBalance.toLocaleString(
                                        "vi-VN",
                                        { maximumFractionDigits: 2 },
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                {/* Tổng tất cả mặt hàng của kỳ */}
                                <tr
                                  className={`${bgColor} border-b-2 ${borderColor}`}
                                >
                                  <td
                                    colSpan={5}
                                    className={`px-6 py-2 whitespace-nowrap text-sm font-bold ${textColor}`}
                                  >
                                    🏁 Tổng cộng kỳ{" "}
                                    {period.periodType === "CLOSED"
                                      ? "đã chốt"
                                      : "chưa chốt"}
                                  </td>
                                  <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                    {periodTotal.openingBalance.toLocaleString(
                                      "vi-VN",
                                      { maximumFractionDigits: 2 },
                                    )}
                                  </td>
                                  <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-bold text-green-700">
                                    {periodTotal.importQuantity.toLocaleString(
                                      "vi-VN",
                                      { maximumFractionDigits: 2 },
                                    )}
                                  </td>
                                  <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-bold text-red-700">
                                    {periodTotal.exportQuantity.toLocaleString(
                                      "vi-VN",
                                      { maximumFractionDigits: 2 },
                                    )}
                                  </td>
                                  <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-bold text-orange-700">
                                    {periodTotal.lossAmount > 0
                                      ? periodTotal.lossAmount.toLocaleString(
                                          "vi-VN",
                                          { maximumFractionDigits: 2 },
                                        )
                                      : "-"}
                                  </td>
                                  <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-bold text-blue-800">
                                    {periodTotal.closingBalance.toLocaleString(
                                      "vi-VN",
                                      { maximumFractionDigits: 2 },
                                    )}
                                  </td>
                                </tr>
                              </>
                            );
                          })()}
                        </React.Fragment>
                      ),
                    )}
                  </>
                ) : reportType !== "summary" &&
                  documents &&
                  documents.length > 0 ? (
                  documents.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.docAt
                          ? dayjs(item.docAt).format("DD/MM/YYYY HH:mm")
                          : dayjs(item.docDate).format("DD/MM/YYYY")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.invoiceNumber || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.supplierName || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {Number(item.quantity).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {Number(item.unitPrice).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                        {Number(item.amount).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={
                        reportType === "summary" ? (isAllStores ? 8 : 10) : 7
                      }
                      className="px-6 py-12 text-center"
                    >
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <ArchiveBoxIcon className="h-12 w-12 mb-3 text-gray-400" />
                        <p className="text-sm font-medium">
                          {reportType === "summary"
                            ? "Chưa có dữ liệu nhập xuất tồn trong kỳ này"
                            : reportType === "import"
                              ? "Chưa có phiếu nhập hàng trong kỳ này"
                              : "Chưa có phiếu xuất hàng trong kỳ này"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Thử chọn khoảng thời gian khác hoặc tạo phiếu mới
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryReportPage;
