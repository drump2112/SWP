import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportMultiSheetExcel = (sheets: { data: any[], sheetName: string }[], fileName: string) => {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(sheet => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
  });
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// ===================== BIÊN BẢN KIỂM KÊ TỒN KHO XĂNG DẦU =====================
export interface InventoryCheckRow {
  stt: number | string;
  productName: string;
  tankName: string;
  heightTotal: number | string;      // Chiều cao chung (mm)
  heightWater: number | string;      // Chiều cao nước (mm)
  actualStock: number | string;      // Tồn thực tế (lít TT)
  bookStock: number | string;        // Tồn sổ sách (lít TT)
  difference: number | string;       // Chênh lệch (lít TT)
  pumpElectronic: string;            // Số máy điện tử (các vòi)
  pumpMechanical: string;            // Số máy cơ
}

export interface InventoryCheckExportData {
  companyName: string;
  branchName: string;
  storeName: string;
  checkTime: string;             // Thời gian kiểm kê
  members: { name: string; department: string }[];  // Thành phần tổ kiểm kê
  rows: InventoryCheckRow[];
  reason: string;                // Nguyên nhân
  conclusion: string;            // Kiến nghị / kết luận
}

// Style helpers
const thinBorder: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: '000000' } };
const allBorders: Partial<ExcelJS.Borders> = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder
};

export const exportInventoryCheckExcel = async (data: InventoryCheckExportData, fileName: string) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Kiểm Kê');

  // Set column widths
  sheet.columns = [
    { width: 6 },   // A - STT
    { width: 22 },  // B - Tên hàng hóa
    { width: 12 },  // C - Bể chứa
    { width: 16 },  // D - Chiều cao chung
    { width: 16 },  // E - Chiều cao nước
    { width: 14 },  // F - Thực tế
    { width: 14 },  // G - Số sách
    { width: 18 },  // H - Chênh lệch
    { width: 18 },  // I - Số máy điện tử
    { width: 12 },  // J - Số máy cơ
  ];

  let rowNum = 1;

  // Row 1: Company name + CHXHCNVN
  sheet.mergeCells(`A${rowNum}:E${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = data.companyName;
  sheet.getCell(`A${rowNum}`).font = { bold: true, size: 11 };
  sheet.mergeCells(`F${rowNum}:J${rowNum}`);
  sheet.getCell(`F${rowNum}`).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  sheet.getCell(`F${rowNum}`).font = { bold: true, size: 12 };
  sheet.getCell(`F${rowNum}`).alignment = { horizontal: 'center' };
  rowNum++;

  // Row 2: Branch name + Độc lập
  sheet.mergeCells(`A${rowNum}:E${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = data.branchName;
  sheet.mergeCells(`F${rowNum}:J${rowNum}`);
  sheet.getCell(`F${rowNum}`).value = 'ĐỘC LẬP - TỰ DO - HẠNH PHÚC';
  sheet.getCell(`F${rowNum}`).font = { bold: true, size: 11 };
  sheet.getCell(`F${rowNum}`).alignment = { horizontal: 'center' };
  rowNum++;

  // Empty row
  rowNum++;

  // Row 4: Title
  sheet.mergeCells(`A${rowNum}:J${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = 'BIÊN BẢN KIỂM KÊ TỒN KHO XĂNG DẦU';
  sheet.getCell(`A${rowNum}`).font = { bold: true, size: 14 };
  sheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center' };
  rowNum++;

  // Row 5: Time
  sheet.mergeCells(`A${rowNum}:J${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = `Thời gian: ${data.checkTime}`;
  sheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${rowNum}`).font = { italic: true };
  rowNum++;

  // Empty row
  rowNum++;

  // Thành phần tổ kiểm kê
  sheet.getCell(`A${rowNum}`).value = 'Thành phần Tổ kiểm kê gồm:';
  sheet.getCell(`A${rowNum}`).font = { bold: true };
  rowNum++;

  data.members.forEach((member) => {
    sheet.mergeCells(`A${rowNum}:D${rowNum}`);
    sheet.getCell(`A${rowNum}`).value = `- Ông (Bà): ${member.name}`;
    sheet.mergeCells(`E${rowNum}:J${rowNum}`);
    sheet.getCell(`E${rowNum}`).value = member.department ? `Đơn vị: ${member.department}` : '';
    rowNum++;
  });

  sheet.mergeCells(`A${rowNum}:J${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = 'Cùng nhau tiến hành kiểm kê hàng hóa tồn kho và đã thống nhất kết quả kiểm kê như sau:';
  rowNum++;

  // Empty row
  rowNum++;

  // ============ TABLE HEADER ============
  const headerRow1 = rowNum;

  // Header Row 1 (merged cells)
  sheet.getCell(`A${rowNum}`).value = 'STT';
  sheet.mergeCells(`A${rowNum}:A${rowNum + 1}`);

  sheet.getCell(`B${rowNum}`).value = 'TÊN HÀNG HÓA';
  sheet.mergeCells(`B${rowNum}:B${rowNum + 1}`);

  sheet.getCell(`C${rowNum}`).value = 'BỂ CHỨA';
  sheet.mergeCells(`C${rowNum}:C${rowNum + 1}`);

  sheet.getCell(`D${rowNum}`).value = 'SỐ ĐO BỂ';
  sheet.mergeCells(`D${rowNum}:E${rowNum}`);

  sheet.getCell(`F${rowNum}`).value = 'TỒN KHO';
  sheet.mergeCells(`F${rowNum}:G${rowNum}`);

  sheet.getCell(`H${rowNum}`).value = 'CHÊNH LỆCH';
  sheet.mergeCells(`H${rowNum}:H${rowNum + 1}`);

  sheet.getCell(`I${rowNum}`).value = 'SỐ MÁY';
  sheet.mergeCells(`I${rowNum}:J${rowNum}`);

  rowNum++;

  // Header Row 2 (sub-headers)
  sheet.getCell(`D${rowNum}`).value = 'Chiều cao chung (mm)';
  sheet.getCell(`E${rowNum}`).value = 'Chiều cao nước (mm)';
  sheet.getCell(`F${rowNum}`).value = 'Thực tế (Lít TT)';
  sheet.getCell(`G${rowNum}`).value = 'Số sách (Lít TT)';
  sheet.getCell(`H${rowNum}`).value = 'Thừa (+)/Thiếu(-) (Lít TT)';
  sheet.getCell(`I${rowNum}`).value = 'Số máy điện tử';
  sheet.getCell(`J${rowNum}`).value = 'Số máy cơ';

  // Style header rows
  for (let r = headerRow1; r <= rowNum; r++) {
    for (let c = 1; c <= 10; c++) {
      const cell = sheet.getCell(r, c);
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.border = allBorders;
    }
  }
  sheet.getRow(headerRow1).height = 25;
  sheet.getRow(rowNum).height = 35;

  rowNum++;

  // ============ DATA ROWS ============
  const dataStartRow = rowNum;
  data.rows.forEach((row) => {
    sheet.getCell(`A${rowNum}`).value = row.stt;
    sheet.getCell(`B${rowNum}`).value = row.productName;
    sheet.getCell(`C${rowNum}`).value = row.tankName;
    sheet.getCell(`D${rowNum}`).value = row.heightTotal;
    sheet.getCell(`E${rowNum}`).value = row.heightWater;
    sheet.getCell(`F${rowNum}`).value = row.actualStock;
    sheet.getCell(`G${rowNum}`).value = row.bookStock;
    sheet.getCell(`H${rowNum}`).value = row.difference;
    sheet.getCell(`I${rowNum}`).value = row.pumpElectronic;
    sheet.getCell(`J${rowNum}`).value = row.pumpMechanical;

    // Style data rows
    for (let c = 1; c <= 10; c++) {
      const cell = sheet.getCell(rowNum, c);
      cell.border = allBorders;
      cell.alignment = { vertical: 'middle', wrapText: true };
      // Number columns center/right align
      if (c >= 4 && c <= 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      if (c === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // Color difference column
    const diffCell = sheet.getCell(`H${rowNum}`);
    if (typeof row.difference === 'number') {
      if (row.difference > 0) {
        diffCell.font = { color: { argb: 'FF008000' } }; // Green
      } else if (row.difference < 0) {
        diffCell.font = { color: { argb: 'FFFF0000' } }; // Red
      }
    }

    rowNum++;
  });

  // Add empty rows if no data
  if (data.rows.length === 0) {
    for (let i = 0; i < 5; i++) {
      for (let c = 1; c <= 10; c++) {
        sheet.getCell(rowNum, c).border = allBorders;
      }
      rowNum++;
    }
  }

  // Empty row
  rowNum++;

  // Nguyên nhân
  sheet.mergeCells(`A${rowNum}:J${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = `Nguyên nhân: ${data.reason || ''}`;
  rowNum++;

  // Empty row
  rowNum++;

  // Kiến nghị
  sheet.mergeCells(`A${rowNum}:J${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = `Kiến nghị (hoặc kết luận): ${data.conclusion || ''}`;
  rowNum++;

  // Empty rows
  rowNum += 2;

  // Signatures
  sheet.getCell(`C${rowNum}`).value = 'CN ĐỐNG ĐA';
  sheet.getCell(`C${rowNum}`).font = { bold: true };
  sheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' };

  sheet.getCell(`H${rowNum}`).value = 'PHỤ TRÁCH CỬA HÀNG';
  sheet.getCell(`H${rowNum}`).font = { bold: true };
  sheet.getCell(`H${rowNum}`).alignment = { horizontal: 'center' };
  rowNum++;

  sheet.getCell(`H${rowNum}`).value = '(Ký, ghi rõ họ tên)';
  sheet.getCell(`H${rowNum}`).font = { italic: true };
  sheet.getCell(`H${rowNum}`).alignment = { horizontal: 'center' };
  rowNum++;

  sheet.getCell(`B${rowNum}`).value = 'PHÒNG KD';
  sheet.getCell(`B${rowNum}`).font = { bold: true };
  sheet.getCell(`B${rowNum}`).alignment = { horizontal: 'center' };

  sheet.getCell(`D${rowNum}`).value = 'PHÒNG KT';
  sheet.getCell(`D${rowNum}`).font = { bold: true };
  sheet.getCell(`D${rowNum}`).alignment = { horizontal: 'center' };

  // Download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};
