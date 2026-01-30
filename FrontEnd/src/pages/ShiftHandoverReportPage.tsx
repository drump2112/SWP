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

  // Helper function to add borders to cells - XLSX.js format
  const getBorderStyle = (position: 'all' | 'top' | 'bottom' | 'header' = 'all') => {
    const borderLine = { style: 'thin', color: 'FF000000' };
    const thickBorder = { style: 'medium', color: 'FF000000' };

    if (position === 'header') {
      return {
        left: borderLine,
        right: borderLine,
        top: borderLine,
        bottom: thickBorder,
      };
    } else if (position === 'top') {
      return {
        left: borderLine,
        right: borderLine,
        top: borderLine,
      };
    } else if (position === 'bottom') {
      return {
        left: borderLine,
        right: borderLine,
        bottom: borderLine,
      };
    }
    // 'all' - all borders
    return {
      left: borderLine,
      right: borderLine,
      top: borderLine,
      bottom: borderLine,
    };
  };

  const handleExportExcel = () => {
    if (!report) return;

    try {
      const ws: any = {};

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
      // Add logo - note: XLSX doesn't support embedded images directly, so we'll add text alternative
      // For a proper logo, you'd need to manually insert it or use a different library

      ws[`A${row}`] = { v: '[LOGO]', t: 's', s: { font: { bold: true, size: 10, color: { rgb: 'CCCCCC' } } } };
      row += 2;

      ws[`A${row}`] = { v: 'CÔNG TY TNHH XĂNG DẦU TÂY NAM S.W.P - CHI NHÁNH ĐỐNG ĐA', t: 's', s: { font: { bold: true, size: 12 } } };
      row++;

      ws[`A${row}`] = { v: 'CỬA HÀNG XĂNG DẦU: ' + report.shift.store.name, t: 's', s: { font: { bold: true, size: 11 } } };
      row++;

      ws[`A${row}`] = { v: 'SỔ GIAO CA BÁN HÀNG', t: 's', s: { font: { bold: true, size: 11 } } };
      row++;

      ws[`A${row}`] = { v: `Từ ${dayjs(report.shift.openedAt).format('DD/MM/YYYY HH:mm')} - Đến ${dayjs(report.shift.closedAt).format('DD/MM/YYYY HH:mm')}`, t: 's' };
      row += 2;

      // Nhân viên giao/nhận
      ws[`A${row}`] = { v: 'Nhân viên bán hàng:', t: 's' };
      ws[`C${row}`] = { v: report.shift.handoverName || '', t: 's' };
      row++;
      ws[`A${row}`] = { v: 'Nhân viên nhận ca:', t: 's' };
      ws[`C${row}`] = { v: report.shift.receiverName || '', t: 's' };
      row += 2;

      // PHẦN I: BẢNG GIAO
      ws[`A${row}`] = { v: 'I. PHẦN BÁN HÀNG', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } } } };
      row++;

      ws[`A${row}`] = { v: 'Với', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
      ws[`B${row}`] = { v: 'Mặt hàng', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
      ws[`C${row}`] = { v: 'Diễn giải', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
      ws[`D${row}`] = { v: 'Số đầu ca', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
      ws[`E${row}`] = { v: 'Số cuối ca', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
      ws[`F${row}`] = { v: 'Lượng qua vòi', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
      ws[`G${row}`] = { v: 'Lượng xuất bán', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
      ws[`H${row}`] = { v: 'Đơn giá', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
      ws[`I${row}`] = { v: 'Thành tiền', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
      row++;

      // Pump readings
      let stt = 1;
      report.pumpReadings.forEach((reading) => {
        ws[`A${row}`] = { v: stt, t: 'n', s: { border: getBorderStyle() } };
        ws[`B${row}`] = { v: reading.productName, t: 's', s: { border: getBorderStyle() } };
        ws[`C${row}`] = { v: `Số điện tử / Số cơ`, t: 's', s: { border: getBorderStyle() } };
        ws[`D${row}`] = { v: reading.startValue, t: 'n', s: { border: getBorderStyle() } };
        ws[`E${row}`] = { v: reading.endValue, t: 'n', s: { border: getBorderStyle() } };
        ws[`F${row}`] = { v: reading.quantity, t: 'n', s: { border: getBorderStyle() } };
        ws[`G${row}`] = { v: reading.quantity - reading.testExport, t: 'n', s: { border: getBorderStyle() } };
        ws[`H${row}`] = { v: reading.unitPrice, t: 'n', s: { border: getBorderStyle() } };
        ws[`I${row}`] = { v: reading.amount, t: 'n', s: { border: getBorderStyle() } };
        row++;

        ws[`A${row}`] = { v: '', t: 's', s: { border: getBorderStyle() } };
        ws[`B${row}`] = { v: reading.productName, t: 's', s: { border: getBorderStyle() } };
        ws[`C${row}`] = { v: `Số cơ`, t: 's', s: { border: getBorderStyle() } };
        ws[`D${row}`] = { v: '', t: 's', s: { border: getBorderStyle() } };
        ws[`E${row}`] = { v: '', t: 's', s: { border: getBorderStyle() } };
        ws[`F${row}`] = { v: '', t: 's', s: { border: getBorderStyle() } };
        ws[`G${row}`] = { v: '', t: 's', s: { border: getBorderStyle() } };
        ws[`H${row}`] = { v: '', t: 's', s: { border: getBorderStyle() } };
        ws[`I${row}`] = { v: '', t: 's', s: { border: getBorderStyle() } };
        row++;

        stt++;
      });

      // Total retail
      ws[`A${row}`] = { v: 'TỔNG BÁN LẺ', t: 's', s: { font: { bold: true }, border: getBorderStyle('bottom') } };
      ws[`I${row}`] = { v: report.summary.totalRetailAmount, t: 'n', s: { font: { bold: true }, border: getBorderStyle('bottom') } };
      row++;

      // Debt sales
      ws[`A${row}`] = { v: 'II. CÔNG NỢ KHÁCH HÀNG', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } } } };
      row++;

      if (report.debtSales.length > 0) {
        ws[`A${row}`] = { v: 'TT', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
        ws[`B${row}`] = { v: 'Khách hàng ', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
        ws[`C${row}`] = { v: 'Số tiền', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
        ws[`D${row}`] = { v: 'Xuất Hóm', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFF00' } }, border: getBorderStyle('header') } };
        row++;

        report.debtSales.forEach((debt, idx) => {
          ws[`A${row}`] = { v: idx + 1, t: 'n', s: { border: getBorderStyle() } };
          ws[`B${row}`] = { v: debt.customerName, t: 's', s: { border: getBorderStyle() } };
          ws[`C${row}`] = { v: debt.amount, t: 'n', s: { border: getBorderStyle() } };
          ws[`D${row}`] = { v: '', t: 's', s: { border: getBorderStyle() } };
          row++;
        });

        ws[`A${row}`] = { v: 'CÔNG NỢ TRONG CA', t: 's', s: { font: { bold: true }, border: getBorderStyle('bottom') } };
        ws[`C${row}`] = { v: report.summary.totalDebtAmount, t: 'n', s: { font: { bold: true }, border: getBorderStyle('bottom') } };
        row += 2;
      }

      // Summary (III. TIỀN HÀNG TRONG NGÀY)
      ws[`A${row}`] = { v: 'III. TIỀN HÀNG TRONG NGÀY', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFCCCC' } } } };
      row++;

      ws[`A${row}`] = { v: `Tiền ca trước chuyển sang: ${report.carryOverCash.toLocaleString('vi-VN')}`, t: 's' };
      row++;

      ws[`A${row}`] = { v: '', t: 's' };
      row++;

      // Summary grid
      ws[`A${row}`] = { v: 'Tổng bán lẻ', t: 's', s: { font: { bold: true } } };
      ws[`B${row}`] = { v: report.summary.totalRetailAmount, t: 'n', s: { font: { bold: true }, numFmt: '#,##0' } };
      row++;

      ws[`A${row}`] = { v: 'Tổng công nợ', t: 's', s: { font: { bold: true } } };
      ws[`B${row}`] = { v: report.summary.totalDebtAmount, t: 'n', s: { font: { bold: true }, numFmt: '#,##0' } };
      row++;

      ws[`A${row}`] = { v: 'Thu tiền nợ', t: 's', s: { font: { bold: true } } };
      ws[`B${row}`] = { v: report.summary.totalReceiptAmount, t: 'n', s: { font: { bold: true }, numFmt: '#,##0' } };
      row++;

      ws[`A${row}`] = { v: 'Tồn quỹ', t: 's', s: { font: { bold: true } } };
      ws[`B${row}`] = { v: report.summary.cashBalance, t: 'n', s: { font: { bold: true }, numFmt: '#,##0' } };
      row++;

      ws[`A${row}`] = { v: '', t: 's' };
      row++;

      ws[`A${row}`] = { v: 'IV. NHẬP XUẤT TỒN TRONG CA', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'CCFFCC' } } } };
      row++;

      ws[`A${row}`] = { v: 'Mặt hàng', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'CCFFCC' } }, border: getBorderStyle('header') } };
      ws[`B${row}`] = { v: 'Tồn đầu ca', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'CCFFCC' } }, border: getBorderStyle('header') } };
      ws[`C${row}`] = { v: 'Nhập trong ca', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'CCFFCC' } }, border: getBorderStyle('header') } };
      ws[`D${row}`] = { v: 'Xuất trong ca', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'CCFFCC' } }, border: getBorderStyle('header') } };
      ws[`E${row}`] = { v: 'Tồn cuối ca', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'CCFFCC' } }, border: getBorderStyle('header') } };
      ws[`F${row}`] = { v: 'Ghi chú', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'CCFFCC' } }, border: getBorderStyle('header') } };
      row++;

      // Inventory data
      if (report.inventoryByProduct && report.inventoryByProduct.length > 0) {
        report.inventoryByProduct.forEach((item, idx) => {
          ws[`A${row}`] = { v: item.productName, t: 's', s: { border: getBorderStyle() } };
          ws[`B${row}`] = { v: item.openingStock || 0, t: 'n', s: { border: getBorderStyle() } };
          ws[`C${row}`] = { v: item.importQuantity || 0, t: 'n', s: { border: getBorderStyle() } };
          ws[`D${row}`] = { v: item.exportQuantity || 0, t: 'n', s: { border: getBorderStyle() } };
          ws[`E${row}`] = { v: item.closingStock || 0, t: 'n', s: { border: getBorderStyle() } };
          ws[`F${row}`] = { v: '', t: 's', s: { border: getBorderStyle() } };
          row++;
        });
      }

      // Set the used range for the worksheet
      ws['!ref'] = `A1:I${row}`;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ws, 'Sổ Giao Ca');
      XLSX.writeFile(workbook, `SoGiaoCa_${report.shift.shiftNo}_${dayjs(report.shift.shiftDate).format('DDMMYYYY')}.xlsx`);
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
          <h3 class="pink-bg">III. TIỀN HÀNG TRONG NGÀY</h3>
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

          <h3 class="green-bg">IV. NHẬP XUẤT TỒN TRONG CA</h3>
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

          {/* Tab 3: Cash within shift */}
          {(
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 p-2 bg-red-100 border-l-4 border-red-400">
                III. TIỀN HÀNG TRONG NGÀY
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

          {/* Tab 4: Inventory Summary */}
          {report.inventoryByProduct && report.inventoryByProduct.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 p-2 bg-green-100 border-l-4 border-green-400">
                IV. NHẬP XUẤT TỒN TRONG CA
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
