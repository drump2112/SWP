import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';

dayjs.extend(minMax);
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { storesApi } from '../api/stores';
import { inventoryClosingApi, formatPeriodName, type InventoryClosingPreview, type InventoryClosing } from '../api/inventory-closing';
import SearchableSelect from '../components/SearchableSelect';
import DateRangePicker from '../components/DateRangePicker';
import {
  createReportWorkbook,
  addReportHeader,
  addReportFooter,
  downloadExcel,
  STYLES,
} from '../utils/report-exporter';
import { printReport, formatNumber } from '../utils/report-printer';
import { showConfirm } from '../utils/sweetalert';
import {
  ArchiveBoxIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  EyeIcon,
  DocumentCheckIcon,
  LockClosedIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

const InventoryClosingPage: React.FC = () => {
  usePageTitle('Chốt Tồn Kho');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = user?.roleCode === 'SUPER_ADMIN' || user?.roleCode === 'ADMIN';

  // Kiểm tra quyền - chỉ Admin mới được phép sử dụng
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20">
          <LockClosedIcon className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-500">Chức năng Chốt Tồn Kho chỉ dành cho Admin.</p>
        </div>
      </div>
    );
  }

  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);
  const [periodFrom, setPeriodFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [periodTo, setPeriodTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<InventoryClosingPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showNewClosingModal, setShowNewClosingModal] = useState(false);

  // Fetch stores
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  // Fetch closed periods
  const { data: closedPeriods, isLoading: isLoadingPeriods } = useQuery({
    queryKey: ['closing-periods', selectedStoreId],
    queryFn: () => inventoryClosingApi.getPeriods(selectedStoreId!),
    enabled: !!selectedStoreId,
  });

  // Fetch closed data for display
  const { data: closedData, isLoading: isLoadingData } = useQuery({
    queryKey: ['closing-data', selectedStoreId],
    queryFn: () => inventoryClosingApi.getByStore(selectedStoreId!),
    enabled: !!selectedStoreId,
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () => inventoryClosingApi.preview(selectedStoreId!, periodFrom, periodTo),
    onSuccess: (data) => {
      setPreview(data);
      setShowPreview(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi khi xem trước');
    },
  });

  // Execute closing mutation
  const executeMutation = useMutation({
    mutationFn: () => inventoryClosingApi.execute({
      storeId: selectedStoreId!,
      periodFrom,
      periodTo,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Đã chốt kỳ thành công');
      setShowPreview(false);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ['closing-periods', selectedStoreId] });
      queryClient.invalidateQueries({ queryKey: ['closing-data', selectedStoreId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi khi chốt kỳ');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ({ periodFrom, periodTo }: { periodFrom: string; periodTo: string }) =>
      inventoryClosingApi.delete(selectedStoreId!, periodFrom, periodTo),
    onSuccess: () => {
      toast.success('Đã xóa kỳ chốt');
      queryClient.invalidateQueries({ queryKey: ['closing-periods', selectedStoreId] });
      queryClient.invalidateQueries({ queryKey: ['closing-data', selectedStoreId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi khi xóa');
    },
  });

  // Group closed data by period
  const groupedByPeriod = React.useMemo(() => {
    if (!closedData) return {};
    const grouped: Record<string, InventoryClosing[]> = {};
    closedData.forEach((item) => {
      // Normalize dates to YYYY-MM-DD string format
      const pFrom = dayjs(item.periodFrom).format('YYYY-MM-DD');
      const pTo = dayjs(item.periodTo).format('YYYY-MM-DD');
      const key = `${pFrom}_${pTo}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  }, [closedData]);

  const handlePreview = () => {
    if (!selectedStoreId) {
      toast.error('Vui lòng chọn cửa hàng');
      return;
    }
    previewMutation.mutate();
  };

  const handleExecute = async () => {
    const confirmed = await showConfirm(
      'Dữ liệu sau khi chốt sẽ được lưu lại. Tồn cuối kỳ này sẽ thành tồn đầu kỳ tiếp theo.',
      'Xác nhận chốt kỳ?',
      'question',
      'Chốt kỳ',
      'Hủy'
    );
    if (confirmed) {
      executeMutation.mutate();
    }
  };

  const handleDelete = async (periodFrom: string, periodTo: string) => {
    const confirmed = await showConfirm(
      'Sau khi xóa, số liệu tồn đầu kỳ tiếp theo sẽ được tính lại từ ledger.',
      'Xóa kỳ chốt này?',
      'warning',
      'Xóa',
      'Hủy'
    );
    if (confirmed) {
      deleteMutation.mutate({ periodFrom, periodTo });
    }
  };

  // Calculate totals for preview
  const previewTotals = React.useMemo(() => {
    if (!preview) return null;
    return {
      openingBalance: preview.items.reduce((sum, i) => sum + Number(i.openingBalance), 0),
      importQuantity: preview.items.reduce((sum, i) => sum + Number(i.importQuantity), 0),
      exportQuantity: preview.items.reduce((sum, i) => sum + Number(i.exportQuantity), 0),
      lossAmount: preview.items.reduce((sum, i) => sum + Number(i.lossAmount), 0),
      closingBalance: preview.items.reduce((sum, i) => sum + Number(i.closingBalance), 0),
    };
  }, [preview]);

  // Tính tổng theo mặt hàng và tổng cộng cho một kỳ
  const calculatePeriodTotals = (periodData: InventoryClosing[]) => {
    // Group by product
    const byProduct: Record<string, {
      productName: string;
      openingBalance: number;
      importQuantity: number;
      exportQuantity: number;
      lossAmount: number;
      closingBalance: number;
    }> = {};

    periodData.forEach((item) => {
      const productName = item.tank?.product?.name || 'Không xác định';
      if (!byProduct[productName]) {
        byProduct[productName] = {
          productName,
          openingBalance: 0,
          importQuantity: 0,
          exportQuantity: 0,
          lossAmount: 0,
          closingBalance: 0,
        };
      }
      byProduct[productName].openingBalance += Number(item.openingBalance);
      byProduct[productName].importQuantity += Number(item.importQuantity);
      byProduct[productName].exportQuantity += Number(item.exportQuantity);
      byProduct[productName].lossAmount += Number(item.lossAmount);
      byProduct[productName].closingBalance += Number(item.closingBalance);
    });

    // Grand total
    const grandTotal = {
      openingBalance: periodData.reduce((sum, i) => sum + Number(i.openingBalance), 0),
      importQuantity: periodData.reduce((sum, i) => sum + Number(i.importQuantity), 0),
      exportQuantity: periodData.reduce((sum, i) => sum + Number(i.exportQuantity), 0),
      lossAmount: periodData.reduce((sum, i) => sum + Number(i.lossAmount), 0),
      closingBalance: periodData.reduce((sum, i) => sum + Number(i.closingBalance), 0),
    };

    return { byProduct: Object.values(byProduct), grandTotal };
  };

  // Export Excel cho một kỳ
  const handleExportPeriod = async (periodFrom: string, periodTo: string, periodData: InventoryClosing[]) => {
    if (!periodData.length) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const storeName = stores?.find((s) => s.id === selectedStoreId)?.name || 'Cửa hàng';
    const { workbook, worksheet } = createReportWorkbook('Chốt Tồn Kho');

    addReportHeader(worksheet, {
      storeName,
      title: 'CHỐT TỒN KHO',
      fromDate: periodFrom,
      toDate: periodTo,
    });

    // Columns
    worksheet.columns = [
      { key: 'stt', width: 6 },
      { key: 'tankCode', width: 12 },
      { key: 'productName', width: 25 },
      { key: 'opening', width: 15 },
      { key: 'import', width: 15 },
      { key: 'export', width: 15 },
      { key: 'loss', width: 15 },
      { key: 'closing', width: 15 },
    ];

    // Header row
    const headerRow = worksheet.getRow(7);
    headerRow.values = ['STT', 'Mã bể', 'Mặt hàng', 'Tồn đầu', 'Nhập', 'Xuất', 'Hao hụt', 'Tồn cuối'];
    headerRow.font = STYLES.headerFont;
    headerRow.alignment = STYLES.centerAlign;
    headerRow.eachCell((cell) => { cell.border = STYLES.borderStyle; });

    // Data rows
    let rowNum = 8;
    periodData.forEach((item, index) => {
      const row = worksheet.getRow(rowNum++);
      row.values = [
        index + 1,
        item.tank?.tankCode || '',
        item.tank?.product?.name || '',
        Number(item.openingBalance),
        Number(item.importQuantity),
        Number(item.exportQuantity),
        Number(item.lossAmount),
        Number(item.closingBalance),
      ];
      row.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        if (colNumber >= 4) cell.alignment = { horizontal: 'right' };
      });
    });

    // Subtotals by product
    const { byProduct, grandTotal } = calculatePeriodTotals(periodData);
    byProduct.forEach((prod) => {
      const row = worksheet.getRow(rowNum++);
      row.values = ['', '', ` ${prod.productName}`, prod.openingBalance, prod.importQuantity, prod.exportQuantity, prod.lossAmount, prod.closingBalance];
      row.font = { bold: true };
      row.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        if (colNumber >= 4) cell.alignment = { horizontal: 'right' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E0' } };
      });
    });

    // Grand total
    const totalRow = worksheet.getRow(rowNum++);
    totalRow.values = ['', '', 'TỔNG CỘNG', grandTotal.openingBalance, grandTotal.importQuantity, grandTotal.exportQuantity, grandTotal.lossAmount, grandTotal.closingBalance];
    totalRow.font = { bold: true };
    totalRow.eachCell((cell, colNumber) => {
      cell.border = STYLES.borderStyle;
      if (colNumber >= 4) cell.alignment = { horizontal: 'right' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E3F2FD' } };
    });

    addReportFooter(worksheet, {});
    downloadExcel(workbook, `Chot_Ton_Kho_${formatPeriodName(periodFrom, periodTo).replace(/\//g, '-')}.xlsx`);
  };

  // Print cho một kỳ
  const handlePrintPeriod = (periodFrom: string, periodTo: string, periodData: InventoryClosing[]) => {
    if (!periodData.length) {
      toast.error('Không có dữ liệu để in');
      return;
    }

    const storeName = stores?.find((s) => s.id === selectedStoreId)?.name || 'Cửa hàng';
    const { byProduct, grandTotal } = calculatePeriodTotals(periodData);

    let tableRows = periodData.map((item, index) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td class="text-center">${item.tank?.tankCode || ''}</td>
        <td class="text-left">${item.tank?.product?.name || ''}</td>
        <td class="text-right">${formatNumber(item.openingBalance)}</td>
        <td class="text-right">${formatNumber(item.importQuantity)}</td>
        <td class="text-right">${formatNumber(item.exportQuantity)}</td>
        <td class="text-right">${formatNumber(item.lossAmount)}</td>
        <td class="text-right">${formatNumber(item.closingBalance)}</td>
      </tr>
    `).join('');

    // Subtotals by product
    tableRows += byProduct.map((prod) => `
      <tr style="background-color: #FFF3E0; font-weight: bold;">
        <td colspan="3" class="text-right"> ${prod.productName}</td>
        <td class="text-right">${formatNumber(prod.openingBalance)}</td>
        <td class="text-right">${formatNumber(prod.importQuantity)}</td>
        <td class="text-right">${formatNumber(prod.exportQuantity)}</td>
        <td class="text-right">${formatNumber(prod.lossAmount)}</td>
        <td class="text-right">${formatNumber(prod.closingBalance)}</td>
      </tr>
    `).join('');

    // Grand total
    tableRows += `
      <tr style="background-color: #E3F2FD; font-weight: bold;">
        <td colspan="3" class="text-right">TỔNG CỘNG</td>
        <td class="text-right">${formatNumber(grandTotal.openingBalance)}</td>
        <td class="text-right">${formatNumber(grandTotal.importQuantity)}</td>
        <td class="text-right">${formatNumber(grandTotal.exportQuantity)}</td>
        <td class="text-right">${formatNumber(grandTotal.lossAmount)}</td>
        <td class="text-right">${formatNumber(grandTotal.closingBalance)}</td>
      </tr>
    `;

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã bể</th>
            <th>Mặt hàng</th>
            <th>Tồn đầu</th>
            <th>Nhập</th>
            <th>Xuất</th>
            <th>Hao hụt</th>
            <th>Tồn cuối</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    printReport(tableHTML, {
      storeName,
      title: 'CHỐT TỒN KHO',
      fromDate: periodFrom,
      toDate: periodTo,
    });
  };

  // Export Excel tất cả các kỳ
  const handleExportAllPeriods = async () => {
    if (!closedPeriods || closedPeriods.length === 0 || !closedData || closedData.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const storeName = stores?.find((s) => s.id === selectedStoreId)?.name || 'Cửa hàng';
    const { workbook, worksheet } = createReportWorkbook('Chốt Tồn Kho');

    // Get date range from all periods
    const allFromDates = closedPeriods.map((p) => dayjs(p.periodFrom));
    const allToDates = closedPeriods.map((p) => dayjs(p.periodTo));
    const minFrom = dayjs.min(allFromDates)?.format('YYYY-MM-DD') || '';
    const maxTo = dayjs.max(allToDates)?.format('YYYY-MM-DD') || '';

    addReportHeader(worksheet, {
      storeName,
      title: 'CHỐT TỒN KHO - TẤT CẢ CÁC KỲ',
      fromDate: minFrom,
      toDate: maxTo,
    });

    // Columns
    worksheet.columns = [
      { key: 'stt', width: 6 },
      { key: 'tankCode', width: 12 },
      { key: 'productName', width: 25 },
      { key: 'opening', width: 15 },
      { key: 'import', width: 15 },
      { key: 'export', width: 15 },
      { key: 'loss', width: 15 },
      { key: 'closing', width: 15 },
    ];

    // Header row
    const headerRow = worksheet.getRow(7);
    headerRow.values = ['STT', 'Mã bể', 'Mặt hàng', 'Tồn đầu', 'Nhập', 'Xuất', 'Hao hụt', 'Tồn cuối'];
    headerRow.font = STYLES.headerFont;
    headerRow.alignment = STYLES.centerAlign;
    headerRow.eachCell((cell) => { cell.border = STYLES.borderStyle; });

    let rowNum = 8;

    // Loop through each period
    closedPeriods.forEach((period) => {
      const pFrom = dayjs(period.periodFrom).format('YYYY-MM-DD');
      const pTo = dayjs(period.periodTo).format('YYYY-MM-DD');
      const key = `${pFrom}_${pTo}`;
      const periodData = groupedByPeriod[key] || [];

      if (periodData.length === 0) return;

      // Period header row
      const periodHeaderRow = worksheet.getRow(rowNum++);
      periodHeaderRow.values = [`Kỳ: ${formatPeriodName(pFrom, pTo)}`, '', '', '', '', '', '', ''];
      periodHeaderRow.font = { bold: true, size: 12 };
      periodHeaderRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1C4E9' } };
        cell.border = STYLES.borderStyle;
      });
      worksheet.mergeCells(`A${periodHeaderRow.number}:H${periodHeaderRow.number}`);

      // Data rows
      periodData.forEach((item, index) => {
        const row = worksheet.getRow(rowNum++);
        row.values = [
          index + 1,
          item.tank?.tankCode || '',
          item.tank?.product?.name || '',
          Number(item.openingBalance),
          Number(item.importQuantity),
          Number(item.exportQuantity),
          Number(item.lossAmount),
          Number(item.closingBalance),
        ];
        row.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber >= 4) cell.alignment = { horizontal: 'right' };
        });
      });

      // Subtotals by product
      const { byProduct, grandTotal } = calculatePeriodTotals(periodData);
      byProduct.forEach((prod) => {
        const row = worksheet.getRow(rowNum++);
        row.values = ['', '', `Cộng ${prod.productName}`, prod.openingBalance, prod.importQuantity, prod.exportQuantity, prod.lossAmount, prod.closingBalance];
        row.font = { bold: true };
        row.eachCell((cell, colNumber) => {
          cell.border = STYLES.borderStyle;
          if (colNumber >= 4) cell.alignment = { horizontal: 'right' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E0' } };
        });
      });

      // Grand total for period
      const totalRow = worksheet.getRow(rowNum++);
      totalRow.values = ['', '', 'TỔNG CỘNG KỲ', grandTotal.openingBalance, grandTotal.importQuantity, grandTotal.exportQuantity, grandTotal.lossAmount, grandTotal.closingBalance];
      totalRow.font = { bold: true };
      totalRow.eachCell((cell, colNumber) => {
        cell.border = STYLES.borderStyle;
        if (colNumber >= 4) cell.alignment = { horizontal: 'right' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E3F2FD' } };
      });

      // Empty row between periods
      rowNum++;
    });

    addReportFooter(worksheet, {});
    downloadExcel(workbook, `Chot_Ton_Kho_Tat_Ca_Ky_${storeName.replace(/\s+/g, '_')}.xlsx`);
  };

  // Print tất cả các kỳ
  const handlePrintAllPeriods = () => {
    if (!closedPeriods || closedPeriods.length === 0 || !closedData || closedData.length === 0) {
      toast.error('Không có dữ liệu để in');
      return;
    }

    const storeName = stores?.find((s) => s.id === selectedStoreId)?.name || 'Cửa hàng';

    // Get date range from all periods
    const allFromDates = closedPeriods.map((p) => dayjs(p.periodFrom));
    const allToDates = closedPeriods.map((p) => dayjs(p.periodTo));
    const minFrom = dayjs.min(allFromDates)?.format('YYYY-MM-DD') || '';
    const maxTo = dayjs.max(allToDates)?.format('YYYY-MM-DD') || '';

    let tableRows = '';

    closedPeriods.forEach((period) => {
      const pFrom = dayjs(period.periodFrom).format('YYYY-MM-DD');
      const pTo = dayjs(period.periodTo).format('YYYY-MM-DD');
      const key = `${pFrom}_${pTo}`;
      const periodData = groupedByPeriod[key] || [];

      if (periodData.length === 0) return;

      // Period header
      tableRows += `
        <tr style="background-color: #D1C4E9; font-weight: bold;">
          <td colspan="8" class="text-left" style="padding: 10px; font-size: 14px;">Kỳ: ${formatPeriodName(pFrom, pTo)}</td>
        </tr>
      `;

      // Data rows
      tableRows += periodData.map((item, index) => `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td class="text-center">${item.tank?.tankCode || ''}</td>
          <td class="text-left">${item.tank?.product?.name || ''}</td>
          <td class="text-right">${formatNumber(item.openingBalance)}</td>
          <td class="text-right">${formatNumber(item.importQuantity)}</td>
          <td class="text-right">${formatNumber(item.exportQuantity)}</td>
          <td class="text-right">${formatNumber(item.lossAmount)}</td>
          <td class="text-right">${formatNumber(item.closingBalance)}</td>
        </tr>
      `).join('');

      // Subtotals by product
      const { byProduct, grandTotal } = calculatePeriodTotals(periodData);
      tableRows += byProduct.map((prod) => `
        <tr style="background-color: #FFF3E0; font-weight: bold;">
          <td colspan="3" class="text-right">Cộng ${prod.productName}</td>
          <td class="text-right">${formatNumber(prod.openingBalance)}</td>
          <td class="text-right">${formatNumber(prod.importQuantity)}</td>
          <td class="text-right">${formatNumber(prod.exportQuantity)}</td>
          <td class="text-right">${formatNumber(prod.lossAmount)}</td>
          <td class="text-right">${formatNumber(prod.closingBalance)}</td>
        </tr>
      `).join('');

      // Grand total for period
      tableRows += `
        <tr style="background-color: #E3F2FD; font-weight: bold;">
          <td colspan="3" class="text-right">TỔNG CỘNG KỲ</td>
          <td class="text-right">${formatNumber(grandTotal.openingBalance)}</td>
          <td class="text-right">${formatNumber(grandTotal.importQuantity)}</td>
          <td class="text-right">${formatNumber(grandTotal.exportQuantity)}</td>
          <td class="text-right">${formatNumber(grandTotal.lossAmount)}</td>
          <td class="text-right">${formatNumber(grandTotal.closingBalance)}</td>
        </tr>
      `;
    });

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã bể</th>
            <th>Mặt hàng</th>
            <th>Tồn đầu</th>
            <th>Nhập</th>
            <th>Xuất</th>
            <th>Hao hụt</th>
            <th>Tồn cuối</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    printReport(tableHTML, {
      storeName,
      title: 'CHỐT TỒN KHO - TẤT CẢ CÁC KỲ',
      fromDate: minFrom,
      toDate: maxTo,
    });
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <DocumentCheckIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Chốt Tồn Kho</h1>
              <p className="text-sm text-gray-600">Chốt số liệu tồn kho theo kỳ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAllPeriods}
              disabled={!selectedStoreId || !closedPeriods?.length}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Xuất Excel
            </button>
            <button
              onClick={handlePrintAllPeriods}
              disabled={!selectedStoreId || !closedPeriods?.length}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              <PrinterIcon className="h-4 w-4 mr-1" />
              In báo cáo
            </button>
            <button
              onClick={() => {
                if (!selectedStoreId) {
                  toast.error('Vui lòng chọn cửa hàng trước');
                  return;
                }
                setShowNewClosingModal(true);
              }}
              disabled={!selectedStoreId}
              className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Chốt kỳ mới
            </button>
          </div>
        </div>
      </div>

      {/* Filters - Chỉ có store selector */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Store selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cửa hàng</label>
            <SearchableSelect
              options={stores?.map((s) => ({ value: s.id, label: s.name })) || []}
              value={selectedStoreId || null}
              onChange={(val) => setSelectedStoreId(val ? Number(val) : undefined)}
              placeholder="Chọn cửa hàng để xem lịch sử chốt kỳ"
            />
          </div>

          {/* Info */}
          <div className="flex items-end">
            {selectedStoreId && closedPeriods && (
              <p className="text-sm text-gray-600">
                Đã chốt <span className="font-semibold text-purple-600">{closedPeriods.length}</span> kỳ
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Chốt Kỳ Mới */}
      {showNewClosingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mb-20">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-purple-700">Chốt Kỳ Mới</h2>
              <button onClick={() => setShowNewClosingModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>Cửa hàng:</strong> {stores?.find(s => s.id === selectedStoreId)?.name}
              </div>

              {/* Date Range Picker */}
              <div className="relative z-10">
                <DateRangePicker
                  fromDate={periodFrom}
                  toDate={periodTo}
                  onFromDateChange={setPeriodFrom}
                  onToDateChange={setPeriodTo}
                  label="Kỳ chốt"
                  showQuickSelect={true}
                />
              </div>

              {/* Notes */}
              <div className="pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nhập ghi chú cho kỳ chốt"
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowNewClosingModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowNewClosingModal(false);
                  handlePreview();
                }}
                disabled={previewMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <EyeIcon className="h-5 w-5" />
                {previewMutation.isPending ? 'Đang tải...' : 'Xem trước'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && preview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">
                Xem trước chốt kỳ: {formatPeriodName(preview.periodFrom, preview.periodTo)}
              </h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1">
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Lưu ý:</strong> Sau khi chốt, tồn cuối kỳ này sẽ thành tồn đầu kỳ tiếp theo.
                  Hao hụt được tính theo hệ số đang hiệu lực tại ngày cuối kỳ.
                </div>
              </div>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bể</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mặt hàng</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tồn đầu</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-green-600 uppercase">Nhập</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-red-600 uppercase">Xuất</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-orange-600 uppercase">Hệ số</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-orange-600 uppercase">Hao hụt</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-purple-600 uppercase">Tồn sau HH</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.items.map((item) => (
                    <tr key={item.tankId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{item.tankCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.productName}</td>
                      <td className="px-4 py-3 text-sm text-right">{Number(item.openingBalance).toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">{Number(item.importQuantity).toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">{Number(item.exportQuantity).toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600">{(Number(item.lossRate) * 100).toFixed(3)}%</td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600">{Number(item.lossAmount).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-purple-600">{Number(item.closingBalance).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  {previewTotals && (
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-4 py-3 text-sm" colSpan={2}>TỔNG CỘNG</td>
                      <td className="px-4 py-3 text-sm text-right">{previewTotals.openingBalance.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">{previewTotals.importQuantity.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">{previewTotals.exportQuantity.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-sm text-right">-</td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600">{previewTotals.lossAmount.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-sm text-right text-purple-600">{previewTotals.closingBalance.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleExecute}
                disabled={executeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-5 w-5" />
                {executeMutation.isPending ? 'Đang chốt...' : 'Xác nhận chốt kỳ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lịch sử chốt kỳ */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <ArchiveBoxIcon className="h-5 w-5 text-gray-600" />
          <h2 className="text-base font-semibold text-gray-800">Lịch sử chốt kỳ</h2>
        </div>

        {isLoadingPeriods || isLoadingData ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : !selectedStoreId ? (
          <div className="text-center py-16 text-gray-500">
            <ArchiveBoxIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>Vui lòng chọn cửa hàng để xem lịch sử chốt kỳ</p>
          </div>
        ) : closedPeriods && closedPeriods.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {closedPeriods.map((period, idx) => {
              // Normalize dates to match groupedByPeriod keys
              const pFrom = dayjs(period.periodFrom).format('YYYY-MM-DD');
              const pTo = dayjs(period.periodTo).format('YYYY-MM-DD');
              const key = `${pFrom}_${pTo}`;
              const periodData = groupedByPeriod[key] || [];
              const isLatest = idx === 0;

              return (
                <div key={key}>
                  <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        {formatPeriodName(period.periodFrom, period.periodTo)}
                      </span>
                      <span className="text-sm text-gray-500 ml-3">
                        Chốt lúc: {dayjs(period.closingDate).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Export & Print buttons */}
                      <button
                        onClick={() => handleExportPeriod(pFrom, pTo, periodData)}
                        className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                        title="Xuất Excel"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePrintPeriod(pFrom, pTo, periodData)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="In báo cáo"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        ✓ Đã chốt
                      </span>
                      {isLatest && isAdmin && (
                        <button
                          onClick={() => handleDelete(pFrom, pTo)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Xóa kỳ chốt"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Bể</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mặt hàng</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Tồn đầu</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-green-600">Nhập</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-red-600">Xuất</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-orange-600">Hao hụt</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-purple-600">Tồn cuối</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {periodData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{item.tank?.tankCode}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.tank?.product?.name}</td>
                          <td className="px-4 py-2 text-sm text-right">{Number(item.openingBalance).toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2 text-sm text-right text-green-600">{Number(item.importQuantity).toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2 text-sm text-right text-red-600">{Number(item.exportQuantity).toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2 text-sm text-right text-orange-600">{Number(item.lossAmount).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-sm text-right font-bold text-purple-600">{Number(item.closingBalance).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      {/* Subtotals by product */}
                      {(() => {
                        const { byProduct, grandTotal } = calculatePeriodTotals(periodData);
                        return (
                          <>
                            {byProduct.map((prod) => (
                              <tr key={prod.productName} className="bg-orange-50 font-medium">
                                <td className="px-4 py-2 text-sm text-right" colSpan={2}>Cộng {prod.productName}</td>
                                <td className="px-4 py-2 text-sm text-right">{prod.openingBalance.toLocaleString('vi-VN')}</td>
                                <td className="px-4 py-2 text-sm text-right text-green-600">{prod.importQuantity.toLocaleString('vi-VN')}</td>
                                <td className="px-4 py-2 text-sm text-right text-red-600">{prod.exportQuantity.toLocaleString('vi-VN')}</td>
                                <td className="px-4 py-2 text-sm text-right text-orange-600">{prod.lossAmount.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-2 text-sm text-right font-bold text-purple-600">{prod.closingBalance.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                            {/* Grand total */}
                            <tr className="bg-blue-50 font-bold">
                              <td className="px-4 py-2 text-sm text-right" colSpan={2}>TỔNG CỘNG</td>
                              <td className="px-4 py-2 text-sm text-right">{grandTotal.openingBalance.toLocaleString('vi-VN')}</td>
                              <td className="px-4 py-2 text-sm text-right text-green-600">{grandTotal.importQuantity.toLocaleString('vi-VN')}</td>
                              <td className="px-4 py-2 text-sm text-right text-red-600">{grandTotal.exportQuantity.toLocaleString('vi-VN')}</td>
                              <td className="px-4 py-2 text-sm text-right text-orange-600">{grandTotal.lossAmount.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2 text-sm text-right font-bold text-purple-600">{grandTotal.closingBalance.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <ArchiveBoxIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>Chưa có kỳ nào được chốt cho cửa hàng này</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryClosingPage;