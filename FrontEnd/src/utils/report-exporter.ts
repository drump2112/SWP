import ExcelJS from "exceljs";
import dayjs from "dayjs";

export const STYLES = {
  titleFont: { name: "Times New Roman", size: 16, bold: true },
  headerFont: { name: "Times New Roman", size: 11, bold: true },
  normalFont: { name: "Times New Roman", size: 11 },
  boldFont: { name: "Times New Roman", size: 11, bold: true },
  italicFont: { name: "Times New Roman", size: 12, italic: true },
  centerAlign: { vertical: "middle", horizontal: "center", wrapText: true } as Partial<ExcelJS.Alignment>,
  leftAlign: { vertical: "middle", horizontal: "left", wrapText: true } as Partial<ExcelJS.Alignment>,
  rightAlign: { vertical: "middle", horizontal: "right", wrapText: true } as Partial<ExcelJS.Alignment>,
  borderStyle: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  } as Partial<ExcelJS.Borders>,
};

export const createReportWorkbook = (sheetName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });
  return { workbook, worksheet };
};

export const addReportHeader = (
  worksheet: ExcelJS.Worksheet,
  options: {
    storeName?: string;
    title: string;
    fromDate?: string;
    toDate?: string;
    reportDate?: string;
    customerName?: string;
  }
) => {
  // Company Name
  worksheet.mergeCells("A1:E1");
  const companyCell = worksheet.getCell("A1");
  companyCell.value = "S.W.P - CHI NHÁNH ĐỐNG ĐA";
  companyCell.font = STYLES.boldFont;
  companyCell.alignment = STYLES.leftAlign;

  // Store Name
  if (options.storeName) {
    worksheet.mergeCells("A2:E2");
    const storeCell = worksheet.getCell("A2");
    storeCell.value = `Cửa hàng: ${options.storeName}`;
    storeCell.font = STYLES.boldFont;
    storeCell.alignment = STYLES.leftAlign;
  }

  // Report Title
  worksheet.mergeCells("A3:H3");
  const titleCell = worksheet.getCell("A3");
  titleCell.value = options.title.toUpperCase();
  titleCell.font = STYLES.titleFont;
  titleCell.alignment = STYLES.centerAlign;

  // Date Information
  worksheet.mergeCells("A4:H4");
  const dateCell = worksheet.getCell("A4");
  if (options.fromDate && options.toDate) {
    dateCell.value = `Từ ngày ${dayjs(options.fromDate).format("DD/MM/YYYY")} đến ngày: ${dayjs(options.toDate).format(
      "DD/MM/YYYY"
    )}`;
  } else if (options.reportDate) {
    dateCell.value = `Ngày báo cáo: ${dayjs(options.reportDate).format("DD/MM/YYYY HH:mm")}`;
  }
  dateCell.font = STYLES.italicFont;
  dateCell.alignment = STYLES.centerAlign;

  // Customer Name (Optional)
  if (options.customerName) {
    worksheet.mergeCells("A5:H5");
    const customerCell = worksheet.getCell("A5");
    customerCell.value = options.customerName;
    customerCell.font = STYLES.normalFont;
    customerCell.alignment = STYLES.centerAlign;
  }

  worksheet.addRow([]); // Empty row 6
};

export const addReportFooter = (
  worksheet: ExcelJS.Worksheet,
  options: {
    signatures?: { left?: string; center?: string; right?: string };
  } = {}
) => {
  worksheet.addRow([]);
  worksheet.addRow([]);
  const dateRow = worksheet.addRow([
    "",
    "",
    "",
    "",
    "",
    "",
    `Ngày ${dayjs().date()} tháng ${dayjs().month() + 1} năm ${dayjs().year()}`,
  ]);
  dateRow.getCell(7).alignment = { horizontal: "center" };
  dateRow.getCell(7).font = { name: "Times New Roman", size: 11, italic: true };
  worksheet.mergeCells(`G${dateRow.number}:I${dateRow.number}`);

  const signatures = options.signatures || {
    left: "Khách hàng",
    center: "Cửa hàng trưởng",
    right: "Người lập",
  };

  const signTitleRow = worksheet.addRow([
    signatures.left || "",
    "",
    "",
    "",
    signatures.center || "",
    "",
    signatures.right || "",
  ]);
  signTitleRow.font = STYLES.boldFont;
  signTitleRow.getCell(1).alignment = STYLES.centerAlign;
  signTitleRow.getCell(5).alignment = STYLES.centerAlign;
  signTitleRow.getCell(7).alignment = STYLES.centerAlign;

  worksheet.mergeCells(`A${signTitleRow.number}:C${signTitleRow.number}`);
  worksheet.mergeCells(`E${signTitleRow.number}:F${signTitleRow.number}`);
  worksheet.mergeCells(`G${signTitleRow.number}:I${signTitleRow.number}`);
};

export const downloadExcel = async (workbook: ExcelJS.Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileName}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
