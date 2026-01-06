import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

/**
 * Service xuất file Excel cho phiếu nhập kho
 */
@Injectable()
export class InventoryExportService {
  /**
   * Xuất biên bản giao nhận xăng dầu ra Excel
   */
  async exportInventoryDocumentToExcel(
    documentData: any,
    response: Response,
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Biên bản giao nhận');

    // Thiết lập chiều rộng cột
    worksheet.columns = [
      { width: 5 },   // A - STT
      { width: 15 },  // B - Ngăn
      { width: 20 },  // C - Mặt hàng
      { width: 12 },  // D - Chiều cao téc xe
      { width: 12 },  // E - Nhiệt độ xe
      { width: 15 },  // F - Lít tại xe
      { width: 12 },  // G - Chiều cao téc kho
      { width: 12 },  // H - Nhiệt độ thực tế
      { width: 15 },  // I - Lít thực tế
      { width: 15 },  // J - Thực nhận
      { width: 15 },  // K - Hao hụt
    ];

    // TIÊU ĐỀ
    worksheet.mergeCells('A1:K1');
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'BIÊN BẢN GIAO NHẬN XĂNG DẦU';
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Thông tin phiếu
    worksheet.mergeCells('A3:K3');
    worksheet.getCell('A3').value = `Số phiếu: ${documentData.invoiceNumber || 'N/A'}`;
    worksheet.getCell('A3').font = { bold: true };

    worksheet.mergeCells('A4:K4');
    worksheet.getCell('A4').value = `Ngày: ${new Date(documentData.docDate).toLocaleDateString('vi-VN')}`;

    worksheet.mergeCells('A5:K5');
    worksheet.getCell('A5').value = `Nhà cung cấp: ${documentData.supplierName || 'N/A'}`;

    worksheet.mergeCells('A6:K6');
    worksheet.getCell('A6').value = `Biển số xe: ${documentData.licensePlate}`;
    worksheet.getCell('A6').font = { bold: true };

    // HEADER TABLE
    const headerRow = 8;
    const headers = [
      'STT',
      'Ngăn',
      'Mặt hàng',
      'Chiều cao\ntéc xe (cm)',
      'Nhiệt độ\nxe (°C)',
      'Lít tại\nnhiệt độ xe',
      'Chiều cao\ntéc kho (cm)',
      'Nhiệt độ\nthực tế (°C)',
      'Lít tại\nnhiệt độ\nthực tế',
      'Thực nhận\n(lít)',
      'Hao hụt\n(lít)',
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(headerRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // DATA ROWS
    let currentRow = headerRow + 1;
    documentData.compartments.forEach((comp: any, index: number) => {
      const row = worksheet.getRow(currentRow);
      row.values = [
        index + 1,
        `Ngăn ${comp.compartmentNumber}`,
        `${comp.productCode} - ${comp.productName}`,
        comp.compartmentHeight,
        comp.truckTemperature,
        comp.truckVolume,
        comp.warehouseHeight,
        comp.actualTemperature,
        comp.actualVolume,
        comp.receivedVolume,
        comp.lossVolume,
      ];

      // Format số
      for (let col = 4; col <= 11; col++) {
        const cell = row.getCell(col);
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      // Border
      for (let col = 1; col <= 11; col++) {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      currentRow++;
    });

    // TỔNG CỘNG
    currentRow++;
    const summaryRow = currentRow;
    worksheet.mergeCells(`A${summaryRow}:E${summaryRow}`);
    const summaryCell = worksheet.getCell(`A${summaryRow}`);
    summaryCell.value = 'TỔNG CỘNG';
    summaryCell.font = { bold: true };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const calc = documentData.calculation;
    worksheet.getCell(`F${summaryRow}`).value = calc.totalTruckVolume;
    worksheet.getCell(`I${summaryRow}`).value = calc.totalActualVolume;
    worksheet.getCell(`J${summaryRow}`).value = calc.totalReceivedVolume;
    worksheet.getCell(`K${summaryRow}`).value = calc.totalLossVolume;

    for (let col = 6; col <= 11; col++) {
      const cell = worksheet.getCell(summaryRow, col);
      cell.font = { bold: true };
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB3B' },
      };
    }

    // TÍNH TOÁN HẠO HỤT
    currentRow += 2;
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'KẾT QUẢ TÍNH TOÁN';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };

    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Hệ số giãn nở (β):';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = calc.expansionCoefficient;

    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Hệ số hao hụt vận chuyển (α):';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = calc.lossCoefficient;

    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Hao hụt cho phép (lít):';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = calc.allowedLossVolume;
    worksheet.getCell(`B${currentRow}`).numFmt = '#,##0.00';

    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Hao hụt thực tế (lít):';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = calc.totalLossVolume;
    worksheet.getCell(`B${currentRow}`).numFmt = '#,##0.00';

    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Lượng thừa/thiếu (lít):';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    const excessCell = worksheet.getCell(`B${currentRow}`);
    excessCell.value = calc.excessShortageVolume;
    excessCell.numFmt = '#,##0.00';

    // Tô màu theo trạng thái
    if (calc.status === 'EXCESS') {
      excessCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' }, // Xanh lá - Thừa
      };
    } else if (calc.status === 'SHORTAGE') {
      excessCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF44336' }, // Đỏ - Thiếu
      };
    }

    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Trạng thái:';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    const statusCell = worksheet.getCell(`B${currentRow}`);
    statusCell.value = calc.status === 'EXCESS' ? 'THỪA' : calc.status === 'SHORTAGE' ? 'THIẾU' : 'BÌNH THƯỜNG';
    statusCell.font = { bold: true };

    // CHỮ KÝ
    currentRow += 3;
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'Người giao hàng';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
    worksheet.getCell(`E${currentRow}`).value = 'Người nhận hàng';
    worksheet.getCell(`E${currentRow}`).font = { bold: true };
    worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`I${currentRow}:K${currentRow}`);
    worksheet.getCell(`I${currentRow}`).value = 'Thủ kho';
    worksheet.getCell(`I${currentRow}`).font = { bold: true };
    worksheet.getCell(`I${currentRow}`).alignment = { horizontal: 'center' };

    currentRow++;
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`A${currentRow}`).font = { italic: true };

    worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
    worksheet.getCell(`E${currentRow}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`E${currentRow}`).font = { italic: true };

    worksheet.mergeCells(`I${currentRow}:K${currentRow}`);
    worksheet.getCell(`I${currentRow}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`I${currentRow}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`I${currentRow}`).font = { italic: true };

    // Xuất file
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename=Bien_ban_giao_nhan_${documentData.invoiceNumber || documentData.id}.xlsx`,
    );

    await workbook.xlsx.write(response);
    response.end();
  }
}
