import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { reportsApi, type ShiftHandoverReport } from '../api/reports';
import { shiftsApi } from '../api/shifts';
import { usePageTitle } from '../hooks/usePageTitle';
import { storesApi } from '../api/stores';
import { useAuth } from '../contexts/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import {
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

const ShiftHandoverReportPage: React.FC = () => {
  usePageTitle('Sổ Giao Ca');
  const { user } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(
    user?.storeId || null
  );
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [report, setReport] = useState<ShiftHandoverReport | null>(null);

  // Fetch stores
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  // Fetch shifts for selected store
  const { data: shifts } = useQuery({
    queryKey: ['shifts-by-store', selectedStoreId],
    queryFn: () => (selectedStoreId ? shiftsApi.getByStore(selectedStoreId) : Promise.resolve([])),
    enabled: !!selectedStoreId,
  });

  // Fetch handover report
  const { isLoading } = useQuery({
    queryKey: ['shift-handover-report', selectedShiftId],
    queryFn: async () => {
      if (!selectedShiftId) return null;
      const data = await reportsApi.getShiftHandoverReport(selectedShiftId);
      setReport(data);
      return data;
    },
    enabled: !!selectedShiftId,
  });

  const storeOptions =
    stores?.map((store) => ({
      value: store.id,
      label: `${store.code} - ${store.name}`,
    })) || [];

  const shiftOptions =
    shifts?.map((shift) => ({
      value: shift.id,
      label: `Ca ${shift.shiftNo} - ${dayjs(shift.shiftDate).format('DD/MM/YYYY')}`,
    })) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleExportExcel = () => {
    if (!report) return;

    const ws = XLSX.utils.aoa_to_sheet([]);

    // Header
    ws['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
    ];

    let row = 1;
    ws[`A${row}`] = 'CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P - CHI NHÁNH ĐỐNG ĐA';
    ws[`A${row}`].s = { font: { bold: true, size: 12 } };
    row++;

    ws[`A${row}`] = 'CỬA HÀNG XĂNG DẦU: ' + report.shift.store.name;
    ws[`A${row}`].s = { font: { bold: true, size: 11 } };
    row++;

    ws[`A${row}`] = 'SỔ GIAO CA BÁN HÀNG';
    ws[`A${row}`].s = { font: { bold: true, size: 11 } };
    row++;

    ws[`A${row}`] = `Từ ${dayjs(report.shift.openedAt).format('DD/MM/YYYY HH:mm')} - Đến ${dayjs(report.shift.closedAt).format('DD/MM/YYYY HH:mm')}`;
    row += 2;

    // Nhân viên giao/nhận
    ws[`A${row}`] = 'Nhân viên bán hàng:';
    ws[`C${row}`] = report.shift.handoverName || '';
    row++;
    ws[`A${row}`] = 'Nhân viên nhận ca:';
    ws[`C${row}`] = report.shift.receiverName || '';
    row += 2;

    // PHẦN I: BẢNG GIAO
    ws[`A${row}`] = 'I. PHẦN BÁN HÀNG';
    ws[`A${row}`].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } } };
    row++;

    ws[`A${row}`] = 'Với';
    ws[`B${row}`] = 'Mặt hàng';
    ws[`C${row}`] = 'Diễn giải';
    ws[`D${row}`] = 'Số đầu ca';
    ws[`E${row}`] = 'Số cuối ca';
    ws[`F${row}`] = 'Lượng qua vòi';
    ws[`G${row}`] = 'Lượng xuất bán';
    ws[`H${row}`] = 'Đơn giá';
    ws[`I${row}`] = 'Thành tiền';
    for (let col = 1; col <= 9; col++) {
      ws[String.fromCharCode(64 + col) + row].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } } };
    }
    row++;

    // Pump readings
    let stt = 1;
    report.pumpReadings.forEach((reading) => {
      ws[`A${row}`] = stt;
      ws[`B${row}`] = reading.productName;
      ws[`C${row}`] = `Số điện tử / Số cơ`;
      ws[`D${row}`] = reading.startValue;
      ws[`E${row}`] = reading.endValue;
      ws[`F${row}`] = reading.quantity;
      ws[`G${row}`] = reading.quantity - reading.testExport;
      ws[`H${row}`] = reading.unitPrice;
      ws[`I${row}`] = reading.amount;
      row++;

      ws[`A${row}`] = '';
      ws[`B${row}`] = reading.productName;
      ws[`C${row}`] = `Số cơ`;
      ws[`D${row}`] = '';
      ws[`E${row}`] = '';
      ws[`F${row}`] = '';
      ws[`G${row}`] = '';
      ws[`H${row}`] = '';
      ws[`I${row}`] = '';
      row++;

      stt++;
    });

    // Total retail
    ws[`A${row}`] = 'TỔNG BÁN LẺ';
    ws[`I${row}`] = report.summary.totalRetailAmount;
    ws[`A${row}`].s = { font: { bold: true } };
    row++;

    // Debt sales
    ws[`A${row}`] = 'II. CÔNG NỢ KHÁCH HÀNG';
    ws[`A${row}`].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } } };
    row++;

    if (report.debtSales.length > 0) {
      ws[`A${row}`] = 'TT';
      ws[`B${row}`] = 'Khách hàng ';
      ws[`C${row}`] = 'Số tiền';
      ws[`D${row}`] = 'Xuất Hóm';
      for (let col = 1; col <= 4; col++) {
        ws[String.fromCharCode(64 + col) + row].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } } };
      }
      row++;

      report.debtSales.forEach((debt, idx) => {
        ws[`A${row}`] = idx + 1;
        ws[`B${row}`] = debt.customerName;
        ws[`C${row}`] = debt.amount;
        ws[`D${row}`] = '';
        row++;
      });

      ws[`A${row}`] = 'CÔNG NỢ TRONG CA';
      ws[`C${row}`] = report.summary.totalDebtAmount;
      ws[`A${row}`].s = { font: { bold: true } };
      row += 2;
    }

    // Receipts
    ws[`A${row}`] = 'III. THU NỢ KHÁCH HÀNG';
    ws[`A${row}`].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } } };
    row++;

    if (report.receipts.length > 0) {
      ws[`A${row}`] = 'TT';
      ws[`B${row}`] = 'Khách hàng ';
      ws[`C${row}`] = 'Số tiền';
      ws[`D${row}`] = 'Xuất Hóm';
      for (let col = 1; col <= 4; col++) {
        ws[String.fromCharCode(64 + col) + row].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } } };
      }
      row++;

      report.receipts.forEach((receipt, idx) => {
        ws[`A${row}`] = idx + 1;
        ws[`B${row}`] = receipt.details.map((d) => d.customerName).join(', ');
        ws[`C${row}`] = receipt.amount;
        ws[`D${row}`] = '';
        row++;
      });

      ws[`A${row}`] = 'CỘNG THU CÓ NGÀY';
      ws[`C${row}`] = report.summary.totalReceiptAmount;
      ws[`A${row}`].s = { font: { bold: true } };
      row += 2;
    }

    // Summary
    ws[`A${row}`] = 'IV. TIỀN HÀNG TRONG NGÀY';
    ws[`A${row}`].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFCCCC' } } };
    row++;

    ws[`A${row}`] = `Tiền ca trước chuyển sang: ${formatCurrency(report.carryOverCash)}`;
    row++;

    ws[`A${row}`] = '';
    row++;

    // Summary grid
    ws[`A${row}`] = 'Tổng bán lẻ';
    ws[`B${row}`] = report.summary.totalRetailAmount;
    ws[`A${row}`].s = { font: { bold: true } };
    ws[`B${row}`].s = { font: { bold: true }, numFmt: '#,##0' };
    row++;

    ws[`A${row}`] = 'Tổng công nợ';
    ws[`B${row}`] = report.summary.totalDebtAmount;
    ws[`A${row}`].s = { font: { bold: true } };
    ws[`B${row}`].s = { font: { bold: true }, numFmt: '#,##0' };
    row++;

    ws[`A${row}`] = 'Thu tiền nợ';
    ws[`B${row}`] = report.summary.totalReceiptAmount;
    ws[`A${row}`].s = { font: { bold: true } };
    ws[`B${row}`].s = { font: { bold: true }, numFmt: '#,##0' };
    row++;

    ws[`A${row}`] = 'Tồn quỹ';
    ws[`B${row}`] = report.summary.cashBalance;
    ws[`A${row}`].s = { font: { bold: true } };
    ws[`B${row}`].s = { font: { bold: true }, numFmt: '#,##0' };
    row++;

    ws[`A${row}`] = '';
    row++;

    ws[`A${row}`] = 'V. NHẬP XUẤT TỒN TRONG CA';
    ws[`A${row}`].s = { font: { bold: true }, fill: { fgColor: { rgb: 'CCFFCC' } } };
    row++;

    ws[`A${row}`] = 'Mặt hàng';
    ws[`B${row}`] = 'Tồn đầu ca';
    ws[`C${row}`] = 'Nhập trong ca';
    ws[`D${row}`] = 'Xuất trong ca';
    ws[`E${row}`] = 'Tồn cuối ca';
    ws[`F${row}`] = 'Ghi chú';
    for (let col = 1; col <= 6; col++) {
      ws[String.fromCharCode(64 + col) + row].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFCCCC' } } };
    }
    row++;

    // Inventory data
    if (report.inventoryByProduct && report.inventoryByProduct.length > 0) {
      report.inventoryByProduct.forEach((item) => {
        ws[`A${row}`] = item.productName;
        ws[`B${row}`] = item.openingStock || 0;
        ws[`C${row}`] = item.importQuantity || 0;
        ws[`D${row}`] = item.exportQuantity || 0;
        ws[`E${row}`] = item.closingStock || 0;
        ws[`F${row}`] = '';
        row++;
      });
    }

    row += 2;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, 'Sổ Giao Ca');
    XLSX.writeFile(workbook, `SoGiaoCa_${report.shift.shiftNo}_${dayjs(report.shift.shiftDate).format('DDMMYYYY')}.xlsx`);
  };

  const handlePrint = () => {
    if (!report) return;

    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Sổ Giao Ca</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            h1, h2, h3 { text-align: center; }
            .yellow-bg { background-color: #ffff00; }
            .pink-bg { background-color: #ffcccc; }
            .green-bg { background-color: #ccffcc; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P - CHI NHÁNH ĐỐNG ĐA</h1>
          <h2>CỬA HÀNG XĂNG DẦU: ${report.shift.store.name}</h2>
          <h3>SỔ GIAO CA BÁN HÀNG</h3>
          <p style="text-align: center;">
            Từ ${dayjs(report.shift.openedAt).format('DD/MM/YYYY HH:mm')} -
            Đến ${dayjs(report.shift.closedAt).format('DD/MM/YYYY HH:mm')}
          </p>

          <div style="margin: 20px 0;">
            <p><strong>Nhân viên bán hàng:</strong> ${report.shift.handoverName || ''}</p>
            <p><strong>Nhân viên nhận ca:</strong> ${report.shift.receiverName || ''}</p>
          </div>

          <h3 class="yellow-bg">I. PHẦN BÁN HÀNG</h3>
          <table>
            <tr class="yellow-bg">
              <th>Với</th>
              <th>Mặt hàng</th>
              <th>Diễn giải</th>
              <th>Số đầu ca</th>
              <th>Số cuối ca</th>
              <th>Lượng qua vòi</th>
              <th>Lượng xuất bán</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
            ${report.pumpReadings
              .map(
                (reading, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${reading.productName}</td>
                <td>Số độn tư / Số cơ</td>
                <td class="text-right">${reading.startValue.toFixed(2)}</td>
                <td class="text-right">${reading.endValue.toFixed(2)}</td>
                <td class="text-right">${reading.quantity.toFixed(3)}</td>
                <td class="text-right">${(reading.quantity - reading.testExport).toFixed(3)}</td>
                <td class="text-right">${reading.unitPrice.toLocaleString('vi-VN')}</td>
                <td class="text-right">${reading.amount.toLocaleString('vi-VN')}</td>
              </tr>
            `
              )
              .join('')}
            <tr class="font-bold">
              <td colspan="8">TỔNG BÁN LẺ</td>
              <td class="text-right">${report.summary.totalRetailAmount.toLocaleString('vi-VN')}</td>
            </tr>
          </table>

          ${
            report.debtSales.length > 0
              ? `
          <h3 class="yellow-bg">II. CÔNG NỢ KHÁCH HÀNG</h3>
          <table>
            <tr class="yellow-bg">
              <th>TT</th>
              <th>Khách hàng</th>
              <th>Số tiền</th>
              <th>Xuất Hóm</th>
            </tr>
            ${report.debtSales
              .map(
                (debt, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${debt.customerName}</td>
                <td class="text-right">${debt.amount.toLocaleString('vi-VN')}</td>
                <td></td>
              </tr>
            `
              )
              .join('')}
            <tr class="font-bold">
              <td colspan="2">CÔNG NỢ TRONG CA</td>
              <td class="text-right">${report.summary.totalDebtAmount.toLocaleString('vi-VN')}</td>
              <td></td>
            </tr>
          </table>
          `
              : ''
          }

          ${
            report.receipts.length > 0
              ? `
          <h3 class="yellow-bg">III. THU NỢ KHÁCH HÀNG</h3>
          <table>
            <tr class="yellow-bg">
              <th>TT</th>
              <th>Khách hàng</th>
              <th>Số tiền</th>
              <th>Xuất Hóm</th>
            </tr>
            ${report.receipts
              .map(
                (receipt, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${receipt.details.map((d) => d.customerName).join(', ')}</td>
                <td class="text-right">${receipt.amount.toLocaleString('vi-VN')}</td>
                <td></td>
              </tr>
            `
              )
              .join('')}
            <tr class="font-bold">
              <td colspan="2">CỘNG THU CÓ NGÀY</td>
              <td class="text-right">${report.summary.totalReceiptAmount.toLocaleString('vi-VN')}</td>
              <td></td>
            </tr>
          </table>
          `
              : ''
          }

          ${
            report.inventoryByProduct && report.inventoryByProduct.length > 0
              ? `
          <h3 class="pink-bg">IV. TIỀN HÀNG TRONG NGÀY</h3>
          <p style="padding: 8px; font-weight: bold;">Tiền ca trước chuyển sang: ${formatCurrency(report.carryOverCash)}</p>

          <table style="margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px; font-weight: bold;">Tổng bán lẻ:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(report.summary.totalRetailAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Tổng công nợ:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(report.summary.totalDebtAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Thu tiền nợ:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(report.summary.totalReceiptAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Tồn quỹ:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(report.summary.cashBalance)}</td>
            </tr>
          </table>

          <h3 class="green-bg">V. NHẬP XUẤT TỒN TRONG CA</h3>
          <table>
            <tr class="green-bg">
              <th>Mặt hàng</th>
              <th>Tồn đầu ca</th>
              <th>Nhập trong ca</th>
              <th>Xuất trong ca</th>
              <th>Tồn cuối ca</th>
              <th>Ghi chú</th>
            </tr>
            ${report.inventoryByProduct
              .map(
                (item) => `
              <tr>
                <td>${item.productName}</td>
                <td class="text-right">${(item.openingStock || 0).toFixed(3)}</td>
                <td class="text-right">${(item.importQuantity || 0).toFixed(3)}</td>
                <td class="text-right">${(item.exportQuantity || 0).toFixed(3)}</td>
                <td class="text-right font-bold">${(item.closingStock || 0).toFixed(3)}</td>
                <td></td>
              </tr>
            `
              )
              .join('')}
          </table>
          `
              : ''
          }
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn Cửa Hàng
            </label>
            <SearchableSelect
              value={selectedStoreId}
              onChange={(value) => {
                setSelectedStoreId(value as number);
                setSelectedShiftId(null);
                setReport(null);
              }}
              options={storeOptions}
              placeholder="Chọn cửa hàng..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn Ca Làm Việc
            </label>
            <SearchableSelect
              value={selectedShiftId}
              onChange={(value) => {
                setSelectedShiftId(value as number);
              }}
              options={shiftOptions}
              placeholder="Chọn ca..."
              isDisabled={!selectedStoreId}
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleExportExcel}
              disabled={!report}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Xuất Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={!report}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              In
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {report && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P - CHI NHÁNH ĐỐNG ĐA</h1>
            <h2 className="text-lg font-bold">CỬA HÀNG XĂNG DẦU: {report.shift.store.name}</h2>
            <h3 className="text-lg font-bold mt-2">SỔ GIAO CA BÁN HÀNG</h3>
            <p className="text-sm text-gray-600">
              Từ {dayjs(report.shift.openedAt).format('DD/MM/YYYY HH:mm')} - Đến {dayjs(report.shift.closedAt).format('DD/MM/YYYY HH:mm')}
            </p>
          </div>

          {/* Nhân viên */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
            <div>
              <p className="font-medium">Nhân viên bán hàng: <span className="font-normal">{report.shift.handoverName || '-'}</span></p>
            </div>
            <div>
              <p className="font-medium">Nhân viên nhận ca: <span className="font-normal">{report.shift.receiverName || '-'}</span></p>
            </div>
          </div>

          {/* Tab 1: Pump Readings */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4 p-2 bg-yellow-100 border-l-4 border-yellow-400">I. PHẦN BÁN HÀNG</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="border p-2 text-left">Với</th>
                    <th className="border p-2 text-left">Mặt hàng</th>
                    <th className="border p-2 text-left">Diễn giải</th>
                    <th className="border p-2 text-right">Số đầu ca</th>
                    <th className="border p-2 text-right">Số cuối ca</th>
                    <th className="border p-2 text-right">Lượng qua vòi</th>
                    <th className="border p-2 text-right">Lượng xuất bán</th>
                    <th className="border p-2 text-right">Đơn giá</th>
                    <th className="border p-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {report.pumpReadings.map((reading, idx) => (
                    <tr key={idx}>
                      <td className="border p-2">{idx + 1}</td>
                      <td className="border p-2">{reading.productName}</td>
                      <td className="border p-2">Số điện tử / Số cơ</td>
                      <td className="border p-2 text-right">{reading.startValue.toFixed(2)}</td>
                      <td className="border p-2 text-right">{reading.endValue.toFixed(2)}</td>
                      <td className="border p-2 text-right">{reading.quantity.toFixed(3)}</td>
                      <td className="border p-2 text-right">{(reading.quantity - reading.testExport).toFixed(3)}</td>
                      <td className="border p-2 text-right">{reading.unitPrice.toLocaleString('vi-VN')}</td>
                      <td className="border p-2 text-right font-medium">{reading.amount.toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-yellow-50">
                    <td colSpan={8} className="border p-2 text-right">
                      TỔNG BÁN LẺ
                    </td>
                    <td className="border p-2 text-right">{report.summary.totalRetailAmount.toLocaleString('vi-VN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tab 2: Debt Sales */}
          {report.debtSales.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 p-2 bg-yellow-100 border-l-4 border-yellow-400">II. CÔNG NỢ KHÁCH HÀNG</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-yellow-100">
                    <tr>
                      <th className="border p-2 text-left">TT</th>
                      <th className="border p-2 text-left">Khách hàng</th>
                      <th className="border p-2 text-right">Số tiền</th>
                      <th className="border p-2 text-left">Xuất Hóm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.debtSales.map((debt, idx) => (
                      <tr key={debt.id}>
                        <td className="border p-2">{idx + 1}</td>
                        <td className="border p-2">{debt.customerName}</td>
                        <td className="border p-2 text-right">{debt.amount.toLocaleString('vi-VN')}</td>
                        <td className="border p-2"></td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-yellow-50">
                      <td colSpan={2} className="border p-2 text-right">
                        CÔNG NỢ TRONG CA
                      </td>
                      <td className="border p-2 text-right">{report.summary.totalDebtAmount.toLocaleString('vi-VN')}</td>
                      <td className="border p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Receipts */}
          {report.receipts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 p-2 bg-yellow-100 border-l-4 border-yellow-400">III. THU NỢ KHÁCH HÀNG</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-yellow-100">
                    <tr>
                      <th className="border p-2 text-left">TT</th>
                      <th className="border p-2 text-left">Khách hàng </th>
                      <th className="border p-2 text-right">Số tiền</th>
                      <th className="border p-2 text-left">Xuất Hóm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.receipts.map((receipt, idx) => (
                      <tr key={receipt.id}>
                        <td className="border p-2">{idx + 1}</td>
                        <td className="border p-2">{receipt.details.map((d) => d.customerName).join(', ')}</td>
                        <td className="border p-2 text-right">{receipt.amount.toLocaleString('vi-VN')}</td>
                        <td className="border p-2"></td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-yellow-50">
                      <td colSpan={2} className="border p-2 text-right">
                        CỘNG THU CÓ NGÀY
                      </td>
                      <td className="border p-2 text-right">{report.summary.totalReceiptAmount.toLocaleString('vi-VN')}</td>
                      <td className="border p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Cash within shift */}
          {(
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 p-2 bg-red-100 border-l-4 border-red-400">
                IV. TIỀN HÀNG TRONG NGÀY
              </h3>
              <div className="p-3 bg-red-50 border border-red-200 rounded mb-4">
                <p className="text-sm text-gray-600 font-semibold">Tiền ca trước chuyển sang</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(report.carryOverCash)}</p>
                <p className="text-xs text-gray-500 mt-1">(Tiền bán lẻ ca trước chưa nộp về công ty)</p>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded">
                <div>
                  <p className="text-sm text-gray-600">Tổng bán lẻ</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(report.summary.totalRetailAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tổng công nợ</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(report.summary.totalDebtAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Thu tiền nợ</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(report.summary.totalReceiptAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tồn quỹ</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(report.summary.cashBalance)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Inventory Summary */}
          {report.inventoryByProduct && report.inventoryByProduct.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 p-2 bg-green-100 border-l-4 border-green-400">
                V. NHẬP XUẤT TỒN TRONG CA
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="border p-2 text-left">Mặt hàng</th>
                      <th className="border p-2 text-right">Tồn đầu ca</th>
                      <th className="border p-2 text-right">Nhập trong ca</th>
                      <th className="border p-2 text-right">Xuất trong ca</th>
                      <th className="border p-2 text-right">Tồn cuối ca</th>
                      <th className="border p-2 text-left">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.inventoryByProduct.map((item) => (
                      <tr key={item.productId}>
                        <td className="border p-2">{item.productName}</td>
                        <td className="border p-2 text-right">
                          {item.openingStock ? item.openingStock.toFixed(3) : '0.000'}
                        </td>
                        <td className="border p-2 text-right">
                          {item.importQuantity ? item.importQuantity.toFixed(3) : '0.000'}
                        </td>
                        <td className="border p-2 text-right">
                          {item.exportQuantity ? item.exportQuantity.toFixed(3) : '0.000'}
                        </td>
                        <td className="border p-2 text-right font-bold">
                          {item.closingStock ? item.closingStock.toFixed(3) : '0.000'}
                        </td>
                        <td className="border p-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShiftHandoverReportPage;
