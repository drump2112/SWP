import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api/reports";
import { storesApi } from "../api/stores";
import { useAuth } from "../contexts/AuthContext";
import {
  ChartBarIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import SearchableSelect from '../components/SearchableSelect';
import DateTimeRangePicker from '../components/DateTimeRangePicker';

const ShiftReportPage: React.FC = () => {
  const { user } = useAuth();
  const [fromDateTime, setFromDateTime] = useState<string>(
    dayjs().startOf("month").format("YYYY-MM-DDTHH:mm")
  );
  const [toDateTime, setToDateTime] = useState<string>(
    dayjs().endOf("day").format("YYYY-MM-DDTHH:mm")
  );
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(user?.storeId);

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

  // Fetch shift report data
  const { data: shiftReport, isLoading } = useQuery({
    queryKey: ["shift-report", selectedStoreId, fromDateTime, toDateTime],
    queryFn: () =>
      reportsApi.getSalesByShift({
        storeId: selectedStoreId,
        fromDate: fromDateTime ? dayjs(fromDateTime).format("YYYY-MM-DD HH:mm:ss") : "",
        toDate: toDateTime ? dayjs(toDateTime).format("YYYY-MM-DD HH:mm:ss") : "",
      }),
    enabled: !!selectedStoreId && !!fromDateTime && !!toDateTime,
  });

  // Debug log
  React.useEffect(() => {
    if (shiftReport && shiftReport.length > 0) {
      console.log('📊 Shift Report Data:', shiftReport);
      console.log('📊 First item keys:', Object.keys(shiftReport[0]));
      console.log('📊 First item:', shiftReport[0]);
    }
  }, [shiftReport]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const storeOptions = stores?.map(store => ({
    value: store.id,
    label: `${store.code} - ${store.name}`
  })) || [];

  // Export to Excel function
  const handleExportExcel = () => {
    if (!shiftReport || shiftReport.length === 0) return;

    // Create CSV content
    let csv = '\uFEFF'; // BOM for UTF-8

    // Header
    const storeName = stores?.find(s => s.id === selectedStoreId)?.name || userStoreDetails?.name || '';
    csv += `BÁO CÁO CA\n`;
    csv += `Cửa hàng: ${storeName}\n`;
    csv += `Từ: ${dayjs(fromDateTime).format('DD/MM/YYYY HH:mm')} - Đến: ${dayjs(toDateTime).format('DD/MM/YYYY HH:mm')}\n\n`;

    // Table 1: Pump readings
    csv += `TỔNG HỢP LƯỢNG XUẤT MÁY\n`;
    csv += `Vòi bơm,Mặt hàng,Số đầu,Số cuối,Xuất KT/Quay kho,Số lít\n`;
    pumpReadingsAggregated.forEach((item: any) => {
      const pumpCode = item.pumpCode || '-';
      const pumpName = item.pumpName || '-';
      const productName = item.productName || '';
      const startValue = formatNumber(item.startValue);
      const endValue = formatNumber(item.endValue);
      const testExport = formatNumber(item.testExport);
      const quantity = formatNumber(item.quantity);
      csv += `"${pumpCode} - ${pumpName}",${productName},${startValue},${endValue},${testExport},${quantity}\n`;
    });
    const totalPumpQuantity = formatNumber(pumpReadingsAggregated.reduce((sum: number, item: any) => sum + item.quantity, 0));
    csv += `,,,,,${totalPumpQuantity}\n`;
    csv += `\n`;

    // Table 2: Revenue by product
    csv += `TỔNG HỢP DOANH THU\n`;
    csv += `STT,Mặt hàng,Đơn vị,Đơn giá,Lượng bán,Thành tiền\n`;
    revenueByProduct.forEach((item: any, idx: number) => {
      csv += `${idx + 1},${item.productName},Lít,${formatCurrency(item.unitPrice)},${formatNumber(item.quantity)},${formatCurrency(item.amount)}\n`;
    });

    const totalQuantity = formatNumber(revenueByProduct.reduce((sum: number, item: any) => sum + item.quantity, 0));
    const totalAmount = formatCurrency(revenueByProduct.reduce((sum: number, item: any) => sum + item.amount, 0));
    csv += `,,,Tổng,${totalQuantity},${totalAmount}\n`;

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCaoCa_${dayjs(fromDateTime).format('DDMMYYYYHHmm')}_${dayjs(toDateTime).format('DDMMYYYYHHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print function
  const handlePrint = () => {
    if (!shiftReport || shiftReport.length === 0) return;

    const storeName = stores?.find(s => s.id === selectedStoreId)?.name || userStoreDetails?.name || '';
    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Báo Cáo Ca</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #000; }
            .info { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #fff; color: #000; font-weight: bold; border: 1px solid #000; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .total-row { background-color: #fff; font-weight: bold; }
            h3 { color: #000; margin-top: 20px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>BÁO CÁO CA</h1>
          <div class="info">
            <p><strong>Cửa hàng:</strong> ${storeName}</p>
            <p><strong>Từ:</strong> ${dayjs(fromDateTime).format('DD/MM/YYYY HH:mm')} - <strong>Đến:</strong> ${dayjs(toDateTime).format('DD/MM/YYYY HH:mm')}</p>
          </div>

          <h3>TỔNG HỢP LƯỢNG XUẤT MÁY</h3>
          <table>
            <thead>
              <tr>
                <th>Vòi bơm</th>
                <th>Mặt hàng</th>
                <th class="text-right">Số đầu</th>
                <th class="text-right">Số cuối</th>
                <th class="text-right">Xuất KT/Quay kho</th>
                <th class="text-right">Số lít</th>
              </tr>
            </thead>
            <tbody>
              ${pumpReadingsAggregated.map((item: any) => `
                <tr>
                  <td>${item.pumpCode || '-'} - ${item.pumpName || '-'}</td>
                  <td>${item.productName}</td>
                  <td class="text-right">${formatNumber(item.startValue)}</td>
                  <td class="text-right">${formatNumber(item.endValue)}</td>
                  <td class="text-right">${formatNumber(item.testExport)}</td>
                  <td class="text-right font-bold">${formatNumber(item.quantity)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="5" class="text-right">Tổng</td>
                <td class="text-right">${formatNumber(pumpReadingsAggregated.reduce((sum: number, item: any) => sum + item.quantity, 0))}</td>
              </tr>
            </tbody>
          </table>

          <h3>TỔNG HỢP DOANH THU</h3>
          <table>
            <thead>
              <tr>
                <th class="text-center">STT</th>
                <th>Mặt hàng</th>
                <th class="text-center">Đơn vị</th>
                <th class="text-right">Đơn giá</th>
                <th class="text-right">Lượng bán</th>
                <th class="text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${revenueByProduct.map((item: any, idx: number) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td>${item.productName}</td>
                  <td class="text-center">Lít</td>
                  <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                  <td class="text-right font-bold">${formatNumber(item.quantity)}</td>
                  <td class="text-right font-bold">${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4" class="text-right">Tổng</td>
                <td class="text-right">${formatNumber(revenueByProduct.reduce((sum: number, item: any) => sum + item.quantity, 0))}</td>
                <td class="text-right">${formatCurrency(revenueByProduct.reduce((sum: number, item: any) => sum + item.amount, 0))}</td>
              </tr>
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Aggregate revenue by product
  const revenueByProduct = React.useMemo(() => {
    if (!shiftReport) return [];

    const productMap = new Map();

    shiftReport.forEach((item: any) => {
      const productName = item.productname || item.productName;
      const productId = item.productid || item.productId;
      const unitPrice = Number(item.unitprice || item.unitPrice || 0);
      const quantity = Number(item.quantity || 0);
      const amount = Number(item.amount || 0);

      // Create a unique key combining productId and unitPrice to handle different price periods
      const key = `${productId}_${unitPrice}`;

      if (productMap.has(key)) {
        const existing = productMap.get(key);
        existing.quantity += quantity;
        existing.amount += amount;
      } else {
        productMap.set(key, {
          productId,
          productName,
          unitPrice,
          quantity,
          amount,
        });
      }
    });

    return Array.from(productMap.values());
  }, [shiftReport]);

  // Aggregate pump readings by pump + product (get first start_value and last end_value)
  const pumpReadingsAggregated = React.useMemo(() => {
    if (!shiftReport) return [];

    const pumpMap = new Map();

    // Sort by shift date and shift no to ensure correct order
    const sortedReport = [...shiftReport].sort((a: any, b: any) => {
      const dateA = new Date(a.shiftdate || a.shiftDate);
      const dateB = new Date(b.shiftdate || b.shiftDate);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return (a.shiftno || a.shiftNo || 0) - (b.shiftno || b.shiftNo || 0);
    });

    sortedReport.forEach((item: any) => {
      const pumpId = item.pumpid || item.pumpId;
      const pumpCode = item.pumpcode || item.pumpCode;
      const pumpName = item.pumpname || item.pumpName;
      const productName = item.productname || item.productName;
      const productId = item.productid || item.productId;
      const startValue = Number(item.startvalue || item.startValue || 0);
      const endValue = Number(item.endvalue || item.endValue || 0);
      const testExport = Number(item.testexport || item.testExport || 0);
      const quantity = Number(item.quantity || 0);

      // Create unique key by pump and product
      const key = `${pumpId}_${productId}`;

      if (pumpMap.has(key)) {
        const existing = pumpMap.get(key);
        // Sum up quantities and test exports
        existing.quantity += quantity;
        existing.testExport += testExport;
        // Keep first start value and last end value
        existing.endValue = endValue; // This is last because we sorted
      } else {
        pumpMap.set(key, {
          pumpId,
          pumpCode,
          pumpName,
          productName,
          productId,
          startValue, // This is first because we sorted
          endValue,
          testExport,
          quantity,
        });
      }
    });

    return Array.from(pumpMap.values());
  }, [shiftReport]);

  // Calculate totals for summary cards
  const totalQuantity = React.useMemo(() => {
    return pumpReadingsAggregated.reduce((sum: number, item: any) => sum + item.quantity, 0);
  }, [pumpReadingsAggregated]);

  const totalRevenue = React.useMemo(() => {
    return revenueByProduct.reduce((sum: number, item: any) => sum + item.amount, 0);
  }, [revenueByProduct]);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-2 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Báo Cáo Ca</h1>
              <p className="text-sm text-gray-600">Tổng hợp chi tiết theo ca làm việc</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={!selectedStoreId || !shiftReport || shiftReport.length === 0}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Xuất Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={!selectedStoreId || !shiftReport || shiftReport.length === 0}
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
          {/* Store Filter */}
          {!user?.storeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BuildingStorefrontIcon className="h-4 w-4 inline mr-1" />
                Cửa hàng
              </label>
              <SearchableSelect
                options={storeOptions}
                value={selectedStoreId}
                onChange={(value) => setSelectedStoreId(value as number | undefined)}
                placeholder="Chọn cửa hàng..."
              />
            </div>
          )}

          {/* Date Time Range */}
          <div>
            <DateTimeRangePicker
              startDate={fromDateTime}
              endDate={toDateTime}
              onStartDateChange={setFromDateTime}
              onEndDateChange={setToDateTime}
              label="Thời gian"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {selectedStoreId && shiftReport && shiftReport.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-4">
            <div className="text-sm text-green-600 font-medium">Tổng lượng xuất (Lít)</div>
            <div className="text-2xl font-bold text-green-700 mt-1">
              {formatNumber(totalQuantity)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-4">
            <div className="text-sm text-purple-600 font-medium">Tổng doanh thu</div>
            <div className="text-2xl font-bold text-purple-700 mt-1">
              {formatCurrency(totalRevenue)} ₫
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-4">
            <div className="text-sm text-blue-600 font-medium">Số mặt hàng</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {revenueByProduct.length}
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-4">
            <div className="text-sm text-orange-600 font-medium">Số vòi bơm</div>
            <div className="text-2xl font-bold text-orange-700 mt-1">
              {pumpReadingsAggregated.length}
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {!selectedStoreId ? (
          <div className="p-12 text-center text-gray-500">
            <FunnelIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Vui lòng chọn cửa hàng để xem báo cáo</p>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : !shiftReport || shiftReport.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Không có dữ liệu trong khoảng thời gian này</div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Bảng 1: Tổng hợp lượng xuất máy (theo vòi bơm) */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                Tổng hợp lượng xuất máy
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Vòi bơm</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Mặt hàng</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Số đầu</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Số cuối</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Xuất KT/Quay kho</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Số lít</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pumpReadingsAggregated.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <span className="text-green-600 font-bold text-sm">{item.pumpCode || '-'}</span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{item.pumpName || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(item.startValue)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(item.endValue)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(item.testExport)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">{formatNumber(item.quantity)}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={5} className="px-4 py-3 text-sm text-gray-900 text-right">Tổng</td>
                      <td className="px-4 py-3 text-sm text-green-600 text-right">
                        {formatNumber(pumpReadingsAggregated.reduce((sum: number, item: any) => sum + item.quantity, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bảng 2: Tổng hợp doanh thu */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                Tổng hợp doanh thu
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">STT</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Mặt hàng</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Đơn vị</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Đơn giá</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Lượng bán</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {revenueByProduct.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-center text-gray-900">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900">Lít</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatNumber(item.quantity)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-purple-600 text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={4} className="px-4 py-3 text-sm text-gray-900 text-right">Tổng</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatNumber(revenueByProduct.reduce((sum: number, item: any) => sum + item.quantity, 0))}
                      </td>
                      <td className="px-4 py-3 text-sm text-purple-600 text-right">
                        {formatCurrency(revenueByProduct.reduce((sum: number, item: any) => sum + item.amount, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ShiftReportPage;
