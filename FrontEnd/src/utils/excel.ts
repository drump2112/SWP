import * as XLSX from 'xlsx';

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

export const exportInventoryCheckExcel = (data: InventoryCheckExportData, fileName: string) => {
  const workbook = XLSX.utils.book_new();

  // Tạo array of arrays cho sheet
  const rows: any[][] = [];

  // Row 1-2: Header công ty
  rows.push([data.companyName, '', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
  rows.push([data.branchName, '', '', '', '', 'ĐỘC LẬP - TỰ DO - HẠNH PHÚC', '', '', '', '', 'Mẫu M01']);
  rows.push([]); // Empty row

  // Row 4: Title
  rows.push(['', '', '', 'BIÊN BẢN KIỂM KÊ TỒN KHO XĂNG DẦU']);
  rows.push(['', '', '', `Thời gian: ${data.checkTime}`]);
  rows.push([]); // Empty row

  // Thành phần tổ kiểm kê
  rows.push(['Thành phần Tổ kiểm kê gồm:']);
  data.members.forEach((member, idx) => {
    rows.push([`- Ông (Bà): ${member.name}`, '', '', '', `Đơn vị: ${member.department}`]);
  });
  rows.push(['Cùng nhau tiến hành kiểm kê hàng hóa tồn kho và đã thống nhất kết quả kiểm kê như sau:']);
  rows.push([]); // Empty row

  // Table Header
  rows.push([
    'STT',
    'TÊN HÀNG HÓA',
    'BỂ CHỨA',
    'SỐ ĐO BỂ',
    '',
    'TỒN KHO',
    '',
    'CHÊNH LỆCH',
    'SỐ MÁY',
    ''
  ]);
  rows.push([
    '',
    '',
    '',
    'Chiều cao chung (mm)',
    'Chiều cao nước (mm)',
    'Thực tế (Lít TT)',
    'Số sách (Lít TT)',
    'Thừa (+)/Thiếu(-) (Lít TT)',
    'Số máy điện tử',
    'Số máy cơ'
  ]);

  // Data rows
  data.rows.forEach(row => {
    rows.push([
      row.stt,
      row.productName,
      row.tankName,
      row.heightTotal,
      row.heightWater,
      row.actualStock,
      row.bookStock,
      row.difference,
      row.pumpElectronic,
      row.pumpMechanical
    ]);
  });

  rows.push([]); // Empty row

  // Nguyên nhân & Kiến nghị
  rows.push(['Nguyên nhân:', data.reason || '']);
  rows.push([]);
  rows.push(['Kiến nghị (hoặc kết luận):', data.conclusion || '']);
  rows.push([]);
  rows.push([]);

  // Chữ ký
  rows.push(['', '', 'CN ĐỐNG ĐA', '', '', '', 'PHỤ TRÁCH CỬA HÀNG']);
  rows.push(['', '', '', '', '', '', '(Ký, ghi rõ họ tên)']);
  rows.push(['', 'PHÒNG KD', '', 'PHÒNG KT']);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },   // STT
    { wch: 25 },  // Tên hàng hóa
    { wch: 12 },  // Bể chứa
    { wch: 18 },  // Chiều cao chung
    { wch: 18 },  // Chiều cao nước
    { wch: 15 },  // Thực tế
    { wch: 15 },  // Số sách
    { wch: 18 },  // Chênh lệch
    { wch: 15 },  // Số máy điện tử
    { wch: 12 }   // Số máy cơ
  ];

  // Merge cells cho header
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },   // Company name
    { s: { r: 0, c: 5 }, e: { r: 0, c: 9 } },   // CHXHCNVN
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },   // Branch name
    { s: { r: 1, c: 5 }, e: { r: 1, c: 8 } },   // Độc lập - Tự do
    { s: { r: 3, c: 3 }, e: { r: 3, c: 7 } },   // Title
    { s: { r: 4, c: 3 }, e: { r: 4, c: 7 } },   // Thời gian
    // Table header merges
    { s: { r: rows.length - data.rows.length - 10, c: 3 }, e: { r: rows.length - data.rows.length - 10, c: 4 } }, // Số đo bể
    { s: { r: rows.length - data.rows.length - 10, c: 5 }, e: { r: rows.length - data.rows.length - 10, c: 6 } }, // Tồn kho
    { s: { r: rows.length - data.rows.length - 10, c: 8 }, e: { r: rows.length - data.rows.length - 10, c: 9 } }, // Số máy
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kiem_Ke');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
