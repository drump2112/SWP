import dayjs from 'dayjs';

// CSS cho print
const getPrintStyles = () => `
  <style>
    @media print {
      @page {
        size: A4;
        margin: 1cm;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      color: #000;
      background: white;
    }

    .print-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm;
      background: white;
    }

    .header-section {
      margin-bottom: 20px;
    }

    .company-name {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .store-name {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .report-title {
      font-size: 16pt;
      font-weight: bold;
      text-align: center;
      margin: 15px 0;
      text-transform: uppercase;
    }

    .report-date {
      font-size: 12pt;
      font-style: italic;
      text-align: center;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th, td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
      font-size: 11pt;
    }

    td {
      font-size: 11pt;
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .text-left {
      text-align: left;
    }

    .font-bold {
      font-weight: bold;
    }

    .total-row {
      background-color: #f5f5f5;
      font-weight: bold;
    }

    .footer-section {
      margin-top: 30px;
    }

    .signature-date {
      text-align: center;
      font-style: italic;
      margin-bottom: 15px;
    }

    .signature-row {
      display: flex;
      justify-content: space-around;
      margin-top: 10px;
    }

    .signature-box {
      text-align: center;
      flex: 1;
    }

    .signature-title {
      font-weight: bold;
      margin-bottom: 60px;
    }

    @media print {
      .no-print {
        display: none !important;
      }
    }
  </style>
`;

interface PrintOptions {
  storeName?: string;
  title: string;
  fromDate?: string;
  toDate?: string;
  reportDate?: string;
  customerName?: string;
  signatures?: {
    left?: string;
    center?: string;
    right?: string;
  };
}

const generateHeader = (options: PrintOptions): string => {
  return `
    <div class="header-section">
      <div class="company-name">S.W.P - CHI NHÁNH ĐỐNG ĐA</div>
      ${options.storeName ? `<div class="store-name">\t${options.storeName}</div>` : ''}
      <div class="report-title">${options.title}</div>
      <div class="report-date">
        ${
          options.fromDate && options.toDate
            ? `Từ ngày ${dayjs(options.fromDate).format('DD/MM/YYYY')} đến ngày ${dayjs(options.toDate).format('DD/MM/YYYY')}`
            : options.reportDate
            ? `Ngày báo cáo: ${dayjs(options.reportDate).format('DD/MM/YYYY HH:mm')}`
            : ''
        }
      </div>
      ${options.customerName ? `<div class="t ext-center" style="margin-bottom: 10px;">${options.customerName}</div>` : ''}
    </div>
  `;
};

const generateFooter = (options?: { signatures?: { left?: string; center?: string; right?: string } }): string => {
  const signatures = options?.signatures || {
    left: 'Khách hàng',
    center: 'Cửa hàng trưởng',
    right: 'Người lập',
  };

  return `
    <div class="footer-section">
      <div class="signature-date">
        Ngày ${dayjs().date()} tháng ${dayjs().month() + 1} năm ${dayjs().year()}
      </div>
      <div class="signature-row">
        ${signatures.left ? `<div class="signature-box"><div class="signature-title">${signatures.left}</div></div>` : ''}
        ${signatures.center ? `<div class="signature-box"><div class="signature-title">${signatures.center}</div></div>` : ''}
        ${signatures.right ? `<div class="signature-box"><div class="signature-title">${signatures.right}</div></div>` : ''}
      </div>
    </div>
  `;
};

export const printReport = (tableHTML: string, options: PrintOptions) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép popup để in báo cáo');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${options.title}</title>
        ${getPrintStyles()}
      </head>
      <body>
        <div class="print-container">
          ${generateHeader(options)}
          ${tableHTML}
          ${generateFooter({ signatures: options.signatures })}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };
};

// Helper để format số (không có ký tự tiền tệ)
export const formatNumber = (value: number): string => {
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

// Helper để format số tiền (có ký tự ₫)
export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
  });
};

// Helper để format ngày
export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('DD/MM/YYYY');
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};
