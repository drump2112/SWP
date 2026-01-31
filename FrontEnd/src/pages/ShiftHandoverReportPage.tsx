import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
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

// Helper function to get base64 encoded logo
const getBase64Logo = async (): Promise<string> => {
  try {
    const response = await fetch('/logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    // Return empty string if logo fails to load
    return '';
  }
};

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

  const formatPaymentMethod = (method: string) => {
    if (method === 'CASH') return 'Tiền mặt';
    if (method === 'BANK_TRANSFER') return 'Chuyển khoản';
    return method;
  };

  const handleExportExcel = async () => {
    if (!report) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sổ Giao Ca', {
        pageSetup: {
          paperSize: 9,
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        },
      });

      // Set column widths
      worksheet.columns = [
        { width: 8 },
        { width: 12 },
        { width: 18 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 15 },
        { width: 12 },
        { width: 15 },
      ];

      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };

      const headerBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };

      let row = 1;

      // Company header
      worksheet.mergeCells(`A${row}:I${row}`);
      let cell = worksheet.getCell(`A${row}`);
      cell.value = 'CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P - CHI NHÁNH ĐỐNG ĐA';
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: 'center' };
      row++;

      worksheet.mergeCells(`A${row}:I${row}`);
      cell = worksheet.getCell(`A${row}`);
      cell.value = `CỬA HÀNG XĂNG DẦU: ${report.shift.store.name}`;
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center' };
      row++;

      worksheet.mergeCells(`A${row}:I${row}`);
      cell = worksheet.getCell(`A${row}`);
      cell.value = 'SỔ GIAO CA BÁN HÀNG';
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center' };
      row++;

      worksheet.mergeCells(`A${row}:I${row}`);
      cell = worksheet.getCell(`A${row}`);
      cell.value = `Từ ${dayjs(report.shift.openedAt).format('DD/MM/YYYY HH:mm')} - Đến ${dayjs(report.shift.closedAt).format('DD/MM/YYYY HH:mm')}`;
      cell.alignment = { horizontal: 'center' };
      row += 2;

      // Employee info
      cell = worksheet.getCell(`A${row}`);
      cell.value = 'Nhân viên bán hàng:';
      cell = worksheet.getCell(`C${row}`);
      cell.value = report.shift.handoverName || '';
      row++;

      cell = worksheet.getCell(`A${row}`);
      cell.value = 'Nhân viên nhận ca:';
      cell = worksheet.getCell(`C${row}`);
      cell.value = report.shift.receiverName || '';
      row += 2;

      // Section I: Sales
      worksheet.mergeCells(`A${row}:I${row}`);
      cell = worksheet.getCell(`A${row}`);
      cell.value = 'I. PHẦN BÁN HÀNG';
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      cell.alignment = { horizontal: 'left' };
      row++;

      // Headers for Section I
      const headerRow = row;
      const headers = ['TT', 'Mặt hàng', 'Diễn giải', 'Số đầu ca', 'Số cuối ca', 'Lượng qua vòi', 'Lượng xuất bán', 'Đơn giá', 'Thành tiền'];
      headers.forEach((h, idx) => {
        const col = String.fromCharCode(65 + idx);
        cell = worksheet.getCell(`${col}${row}`);
        cell.value = h;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        cell.border = headerBorder;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      row++;

      // Data rows for Section I
      let stt = 1;
      report.pumpReadings.forEach((reading) => {
        worksheet.getCell(`A${row}`).value = stt;
        worksheet.getCell(`B${row}`).value = reading.productName;
        worksheet.getCell(`C${row}`).value = 'Số điện tử / Số cơ';
        worksheet.getCell(`D${row}`).value = reading.startValue;
        worksheet.getCell(`E${row}`).value = reading.endValue;
        worksheet.getCell(`F${row}`).value = reading.quantity;
        worksheet.getCell(`G${row}`).value = reading.quantity - reading.testExport;
        worksheet.getCell(`H${row}`).value = reading.unitPrice;
        worksheet.getCell(`I${row}`).value = reading.amount;

        for (let i = 0; i < 9; i++) {
          const col = String.fromCharCode(65 + i);
          const c = worksheet.getCell(`${col}${row}`);
          c.border = borderStyle;
          if (i > 2) c.numFmt = '#,##0';
        }
        row++;

        worksheet.getCell(`B${row}`).value = reading.productName;
        worksheet.getCell(`C${row}`).value = 'Số cơ';
        for (let i = 0; i < 9; i++) {
          const col = String.fromCharCode(65 + i);
          worksheet.getCell(`${col}${row}`).border = borderStyle;
        }
        row++;

        stt++;
      });

      // Total row
      cell = worksheet.getCell(`A${row}`);
      cell.value = 'TỔNG BÁN LẺ';
      cell.font = { bold: true };
      cell.border = borderStyle;

      cell = worksheet.getCell(`I${row}`);
      cell.value = report.summary.totalRetailAmount;
      cell.font = { bold: true };
      cell.border = borderStyle;
      cell.numFmt = '#,##0';
      row += 2;

      // Section II: Debt
      worksheet.mergeCells(`A${row}:I${row}`);
      cell = worksheet.getCell(`A${row}`);
      cell.value = 'II. CÔNG NỢ KHÁCH HÀNG';
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      cell.alignment = { horizontal: 'left' };
      row++;

      if (report.debtSales.length > 0) {
        // Headers for Section II
        const debtHeaders = ['TT', 'Khách hàng', 'Số tiền', 'Xuất hóa đơn'];
        debtHeaders.forEach((h, idx) => {
          const col = String.fromCharCode(65 + idx);
          cell = worksheet.getCell(`${col}${row}`);
          cell.value = h;
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
          cell.border = headerBorder;
          cell.alignment = { horizontal: 'center' };
        });
        row++;

        // Data rows for Section II
        report.debtSales.forEach((debt, idx) => {
          worksheet.getCell(`A${row}`).value = idx + 1;
          worksheet.getCell(`B${row}`).value = debt.customerName;
          worksheet.getCell(`C${row}`).value = debt.amount;
          worksheet.getCell(`D${row}`).value = '';

          for (let i = 0; i < 4; i++) {
            const col = String.fromCharCode(65 + i);
            const c = worksheet.getCell(`${col}${row}`);
            c.border = borderStyle;
            if (i === 2) c.numFmt = '#,##0';
          }
          row++;
        });

        // Total debt row
        cell = worksheet.getCell(`A${row}`);
        cell.value = 'CÔNG NỢ TRONG CA';
        cell.font = { bold: true };
        cell.border = borderStyle;

        cell = worksheet.getCell(`C${row}`);
        cell.value = report.summary.totalDebtAmount;
        cell.font = { bold: true };
        cell.border = borderStyle;
        cell.numFmt = '#,##0';
        row += 2;
      }

      // Section III: Summary
      worksheet.mergeCells(`A${row}:I${row}`);
      cell = worksheet.getCell(`A${row}`);
      cell.value = 'IV. TIỀN HÀNG TRONG NGÀY';
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
      cell.alignment = { horizontal: 'left' };
      row++;

      worksheet.mergeCells(`A${row}:I${row}`);
      cell = worksheet.getCell(`A${row}`);
      cell.value = `Tiền ca trước chuyển sang: ${report.carryOverCash.toLocaleString('vi-VN')}`;
      row += 2;

      // Summary items with table borders
      const summaryItems = [
        { label: 'Tổng bán lẻ', value: report.summary.totalRetailAmount },
        { label: 'Tổng công nợ', value: report.summary.totalDebtAmount },
        { label: 'Thu tiền nợ', value: report.summary.totalReceiptAmount },
        { label: 'Tiền mặt thu trong ca', value: report.summary.totalRetailAmount - report.summary.totalDebtAmount },
        { label: 'Tồn quỹ', value: report.summary.cashBalance },
      ];

      summaryItems.forEach((item, idx) => {
        // Add header row for the table
        if (idx === 0) {
          cell = worksheet.getCell(`A${row}`);
          cell.value = 'Chỉ tiêu';
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
          cell.border = headerBorder;
          cell.alignment = { horizontal: 'center' };

          cell = worksheet.getCell(`B${row}`);
          cell.value = 'Số tiền';
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
          cell.border = headerBorder;
          cell.alignment = { horizontal: 'center' };
          row++;
        }

        cell = worksheet.getCell(`A${row}`);
        cell.value = item.label;
        cell.font = { bold: true };
        cell.border = borderStyle;

        cell = worksheet.getCell(`B${row}`);
        cell.value = item.value;
        cell.font = { bold: true };
        cell.numFmt = '#,##0';
        cell.border = borderStyle;
        row++;
      });

      row += 2;

      // Section V: Inventory
      worksheet.mergeCells(`A${row}:F${row}`);
      cell = worksheet.getCell(`A${row}`);
      cell.value = 'V. NHẬP XUẤT TỒN TRONG CA';
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
      cell.alignment = { horizontal: 'left' };
      row++;

      // Headers for Section IV
      const inventoryHeaders = ['Mặt hàng', 'Tồn đầu ca', 'Nhập trong ca', 'Xuất trong ca', 'Tồn cuối ca', 'Ghi chú'];
      inventoryHeaders.forEach((h, idx) => {
        const col = String.fromCharCode(65 + idx);
        cell = worksheet.getCell(`${col}${row}`);
        cell.value = h;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
        cell.border = headerBorder;
        cell.alignment = { horizontal: 'center' };
      });
      row++;

      // Data rows for Section IV
      if (report.inventoryByProduct && report.inventoryByProduct.length > 0) {
        report.inventoryByProduct.forEach((item) => {
          worksheet.getCell(`A${row}`).value = item.productName;
          worksheet.getCell(`B${row}`).value = item.openingStock || 0;
          worksheet.getCell(`C${row}`).value = item.importQuantity || 0;
          worksheet.getCell(`D${row}`).value = item.exportQuantity || 0;
          worksheet.getCell(`E${row}`).value = item.closingStock || 0;
          worksheet.getCell(`F${row}`).value = '';

          for (let i = 0; i < 6; i++) {
            const col = String.fromCharCode(65 + i);
            const c = worksheet.getCell(`${col}${row}`);
            c.border = borderStyle;
            if (i > 0 && i < 5) c.numFmt = '#,##0';
          }
          row++;
        });
      }

      // Save file using browser-compatible method
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SoGiaoCa_${report.shift.shiftNo}_${dayjs(report.shift.shiftDate).format('DDMMYYYY')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Lỗi khi xuất Excel. Vui lòng thử lại!');
    }
  };

  const handlePrint = async () => {
    if (!report) return;

    const logoBase64 = await getBase64Logo();
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
            .logo-container { display: flex; align-items: center; margin-bottom: 20px; gap: 15px; }
            .logo-container img { max-width: 80px; height: auto; }
            .header-text { display: flex; flex-direction: column; width: 100%; text-align: center; }
          </style>
        </head>
        <body>
          <div class="logo-container">
            <img src="${logoBase64}" alt="Logo" />
            <div class="header-text">
              <h1 style="margin: 0; font-size: 16px;">CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P - CHI NHÁNH ĐỐNG ĐA</h1>
            </div>
          </div>
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
              <th>Xuất hóa đơn</th>
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
              <th>Hình thức</th>
              <th>Xuất hóa đơn</th>
            </tr>
            ${report.receipts
              .map(
                (receipt, idx) => {
                  const paymentMethodLabel = receipt.paymentMethod === 'CASH' ? 'Tiền mặt' : receipt.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : receipt.paymentMethod;
                  return `
              <tr>
                <td>${idx + 1}</td>
                <td>${receipt.details.map((d) => d.customerName).join(', ')}</td>
                <td class="text-right">${receipt.amount.toLocaleString('vi-VN')}</td>
                <td>${paymentMethodLabel}</td>
                <td></td>
              </tr>
            `;
                }
              )
              .join('')}
            <tr class="font-bold">
              <td colspan="2">CỘNG THU CÓ NGÀY</td>
              <td class="text-right">${report.summary.totalReceiptAmount.toLocaleString('vi-VN')}</td>
              <td colspan="2"></td>
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

  // Check if user is a store account (not ADMIN, DIRECTOR, etc.)
  const isStoreAccount = user?.roleCode === 'STORE' || (user?.storeId && !['ADMIN', 'DIRECTOR', 'ACCOUNTING'].includes(user?.roleCode || ''));

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
              isDisabled={isStoreAccount}
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
          {/* Header with Logo */}
          <div className="flex items-start gap-4 mb-6 pb-4 border-b">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain" />
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold">CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P - CHI NHÁNH ĐỐNG ĐA</h1>
              <h2 className="text-lg font-bold">CỬA HÀNG XĂNG DẦU: {report.shift.store.name}</h2>
              <h3 className="text-lg font-bold mt-2">SỔ GIAO CA BÁN HÀNG</h3>
              <p className="text-sm text-gray-600">
                Từ {dayjs(report.shift.openedAt).format('DD/MM/YYYY HH:mm')} - Đến {dayjs(report.shift.closedAt).format('DD/MM/YYYY HH:mm')}
              </p>
            </div>
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
                      <th className="border p-2 text-left">Xuất Hóa Đơn </th>
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

          {/* Tab 3: Receipts (Thu nợ khách hàng) */}
          {report.receipts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 p-2 bg-yellow-100 border-l-4 border-yellow-400">
                III. THU NỢ KHÁCH HÀNG
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-yellow-100">
                    <tr>
                      <th className="border p-2 text-left">TT</th>
                      <th className="border p-2 text-left">Khách hàng</th>
                      <th className="border p-2 text-right">Số tiền</th>
                      <th className="border p-2 text-left">Hình thức</th>
                      <th className="border p-2 text-left">Xuất hóa đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.receipts.map((receipt, idx) => (
                      <tr key={receipt.id}>
                        <td className="border p-2">{idx + 1}</td>
                        <td className="border p-2">{receipt.details.map((d) => d.customerName).join(', ')}</td>
                        <td className="border p-2 text-right">{receipt.amount.toLocaleString('vi-VN')}</td>
                        <td className="border p-2">{formatPaymentMethod(receipt.paymentMethod)}</td>
                        <td className="border p-2"></td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-yellow-50">
                      <td colSpan={2} className="border p-2 text-right">
                        CỘNG THU CÓ NGÀY
                      </td>
                      <td className="border p-2 text-right">{report.summary.totalReceiptAmount.toLocaleString('vi-VN')}</td>
                      <td colSpan={2} className="border p-2"></td>
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
                  <p className="text-sm text-gray-600">Tiền mặt thu trong ca</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(report.summary.totalRetailAmount - report.summary.totalDebtAmount)}</p>
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
