import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { customersApi } from '../api/customers';
import { storesApi } from '../api/stores';
import { useAuth } from '../contexts/AuthContext';

interface ExcelRow {
  'Mã KH': string;
  'Tên KH': string;
  'Số dư đầu kỳ': number;
  'Ghi chú'?: string;
}

export const OpeningBalancePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [storeId, setStoreId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: { row: number; customerCode: string; message: string }[];
  } | null>(null);

  // Lấy danh sách cửa hàng (chỉ cho admin)
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
    enabled: user?.roleCode === 'ADMIN',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Mã KH': 'KH001',
        'Tên KH': 'Nguyễn Văn A',
        'Số dư đầu kỳ': 10000000,
        'Ghi chú': 'Số dư đầu kỳ công nợ',
      },
      {
        'Mã KH': 'KH002',
        'Tên KH': 'Trần Thị B',
        'Số dư đầu kỳ': 5000000,
        'Ghi chú': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Số dư đầu kỳ');

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Mã KH
      { wch: 30 }, // Tên KH
      { wch: 20 }, // Số dư đầu kỳ
      { wch: 30 }, // Ghi chú
    ];

    XLSX.writeFile(wb, 'Template_So_Du_Dau_Ky_Cong_No.xlsx');
  };

  const handleImport = async () => {
    if (!file) {
      alert('Vui lòng chọn file Excel');
      return;
    }

    if (!storeId) {
      alert('Vui lòng chọn cửa hàng');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Đọc file Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

      if (jsonData.length === 0) {
        alert('File Excel không có dữ liệu');
        setLoading(false);
        return;
      }

      // Chuẩn bị dữ liệu
      const items = jsonData.map((row) => ({
        customerCode: String(row['Mã KH']).trim(),
        openingBalance: Number(row['Số dư đầu kỳ']) || 0,
        description: row['Ghi chú'] ? String(row['Ghi chú']).trim() : undefined,
      }));

      // Gọi API
      const response = await customersApi.importOpeningBalance({
        storeId: storeId,
        transactionDate,
        items,
      });

      setResult(response);

      if (response.failed === 0) {
        alert(`Nhập thành công ${response.success} khách hàng!`);
        setFile(null);
        if (document.getElementById('file-input')) {
          (document.getElementById('file-input') as HTMLInputElement).value = '';
        }
      } else {
        alert(
          `Hoàn tất: ${response.success} thành công, ${response.failed} thất bại. Xem chi tiết bên dưới.`
        );
      }
    } catch (error: any) {
      console.error('Import error:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi nhập dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Nhập số dư đầu kỳ công nợ</h1>
          <p className="text-gray-600 mt-2">
            Nhập số dư đầu kỳ công nợ của khách hàng tại cửa hàng của bạn
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📥 Tải template Excel</h3>
            <p className="text-sm text-blue-700 mb-3">
              Tải file mẫu, nhập dữ liệu theo cấu trúc, sau đó upload lại
            </p>
            <button
              onClick={downloadTemplate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Tải template
            </button>
          </div>

          {/* Store Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chọn cửa hàng <span className="text-red-500">*</span>
            </label>
            <select
              value={storeId || ''}
              onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Chọn cửa hàng --</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Chọn cửa hàng để nhập số dư đầu kỳ công nợ
            </p>
          </div>

          {/* Transaction Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ngày ghi nhận số dư
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ngày này sẽ được ghi vào sổ cái công nợ
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chọn file Excel
            </label>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {file && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                ✓ Đã chọn: {file.name}
              </p>
            )}
          </div>

          {/* Import Button */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={!file || !storeId || loading}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                !file || !storeId || loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? 'Đang xử lý...' : '📤 Nhập dữ liệu'}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Kết quả nhập</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{result.success}</div>
                  <div className="text-sm text-green-600 font-medium">Thành công</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-700">{result.failed}</div>
                  <div className="text-sm text-red-600 font-medium">Thất bại</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">Chi tiết lỗi:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm bg-white rounded p-2 border border-red-100">
                        <span className="font-semibold text-red-700">Dòng {error.row}:</span>{' '}
                        <span className="text-gray-700">Mã KH: {error.customerCode}</span>
                        <div className="text-red-600 ml-4">{error.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">📌 Lưu ý quan trọng</h3>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>File Excel phải có các cột: <strong>Mã KH</strong>, <strong>Tên KH</strong>, <strong>Số dư đầu kỳ</strong></li>
            <li>Mã khách hàng phải tồn tại trong hệ thống</li>
            <li>Nếu khách hàng chưa được liên kết với cửa hàng, hệ thống sẽ <strong>tự động tạo liên kết</strong></li>
            <li>Số dư đầu kỳ phải lớn hơn 0 (khách nợ)</li>
            <li>Dữ liệu sẽ được ghi vào sổ cái công nợ với loại <strong>OPENING_BALANCE</strong></li>
            <li>Nếu khách hàng nợ ở nhiều cửa hàng, phải nhập riêng cho từng cửa hàng</li>
            <li><strong className="text-red-700">Chức năng này chỉ dành cho ADMIN</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
