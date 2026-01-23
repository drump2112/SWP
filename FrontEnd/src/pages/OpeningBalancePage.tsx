import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { usePageTitle } from '../hooks/usePageTitle';
import * as XLSX from 'xlsx';
import { customersApi } from '../api/customers';
import { storesApi } from '../api/stores';
import SearchableSelect from '../components/SearchableSelect';

interface OpeningBalanceRecord {
  id: number;
  customerId: number;
  customerCode: string;
  customerName: string;
  storeId: number;
  storeName: string;
  balance: number;
  notes: string;
  createdAt: string;
}

export const OpeningBalancePage: React.FC = () => {
  usePageTitle('Số dư đầu công nợ');
  const queryClient = useQueryClient();

  // State cho form thêm mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [addTransactionDate, setAddTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // State cho import Excel
  const [showImportSection, setShowImportSection] = useState(false);
  const [importStoreId, setImportStoreId] = useState<number | null>(null);
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: { row: number; customerCode: string; message: string }[];
  } | null>(null);

  // State cho chỉnh sửa inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesApi.getAll(),
  });

  // Fetch customers (tất cả khách hàng để chọn khi thêm mới)
  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
  });

  // Fetch opening balance records
  const { data: records = [], isLoading } = useQuery<OpeningBalanceRecord[]>({
    queryKey: ['customers', 'opening-balance'],
    queryFn: () => customersApi.getOpeningBalanceRecords(),
  });

  // Mutation: Thêm mới opening balance (thủ công)
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId || !selectedStoreId) {
        throw new Error('Vui lòng chọn khách hàng và cửa hàng');
      }

      const balanceNum = parseFloat(balance);
      if (isNaN(balanceNum) || balanceNum === 0) {
        throw new Error('Số dư không hợp lệ (không được bằng 0, âm được phép)');
      }

      const customer = allCustomers.find((c) => c.id === selectedCustomerId);
      if (!customer) {
        throw new Error('Không tìm thấy khách hàng');
      }

      // Gọi import API với 1 item
      return customersApi.importOpeningBalance({
        storeId: selectedStoreId,
        transactionDate: addTransactionDate,
        items: [
          {
            customerCode: customer.code,
            openingBalance: balanceNum,
            description: notes || 'Số dư đầu kỳ công nợ',
          },
        ],
      });
    },
    onSuccess: (response) => {
      if (response.success > 0) {
        toast.success('Thêm số dư đầu kỳ thành công!');
        queryClient.invalidateQueries({ queryKey: ['customers', 'opening-balance'] });
        // Reset form
        setSelectedCustomerId(null);
        setSelectedStoreId(null);
        setBalance('');
        setNotes('');
        setAddTransactionDate(new Date().toISOString().split('T')[0]);
        setShowAddForm(false);
      } else if (response.errors.length > 0) {
        toast.error(response.errors[0].message);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi thêm số dư đầu kỳ');
    },
  });

  // Mutation: Cập nhật opening balance
  const updateMutation = useMutation({
    mutationFn: async ({ id, balance, notes, createdAt }: { id: number; balance: number; notes?: string; createdAt?: string }) => {
      return customersApi.updateOpeningBalance(id, balance, notes, createdAt);
    },
    onSuccess: () => {
      toast.success('Cập nhật số dư thành công!');
      queryClient.invalidateQueries({ queryKey: ['customers', 'opening-balance'] });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật');
    },
  });

  // Mutation: Import Excel
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file || !importStoreId) {
        throw new Error('Vui lòng chọn file và cửa hàng');
      }

      // Đọc file Excel
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Parse data
      const items = jsonData.map((row: any) => ({
        customerCode: String(row['Mã KH'] || row['Ma KH'] || '').trim(),
        openingBalance: parseFloat(row['Số dư đầu kỳ'] || row['So du dau ky'] || 0),
        description: String(row['Ghi chú'] || row['Ghi chu'] || 'Số dư đầu kỳ công nợ').trim(),
      }));

      return customersApi.importOpeningBalance({
        storeId: importStoreId,
        transactionDate,
        items,
      });
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['customers', 'opening-balance'] });
      toast.success(`Import thành công ${data.success} bản ghi!`);
      setFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi import');
    },
  });

  const handleEdit = (record: OpeningBalanceRecord) => {
    setEditingId(record.id);
    setEditBalance(record.balance.toString());
    setEditNotes(record.notes || '');
    setEditDate(new Date(record.createdAt).toISOString().split('T')[0]);
  };

  const handleSaveEdit = (id: number) => {
    const balanceNum = parseFloat(editBalance);
    if (isNaN(balanceNum) || balanceNum === 0) {
      toast.error('Số dư không hợp lệ (không được bằng 0, âm được phép)');
      return;
    }

    updateMutation.mutate({
      id,
      balance: balanceNum,
      notes: editNotes,
      createdAt: editDate,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditBalance('');
    setEditNotes('');
    setEditDate('');
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Mã KH': 'KH001',
        'Tên KH': 'Nguyễn Văn A',
        'Số dư đầu kỳ': 1000000,
        'Ghi chú': 'Số dư đầu kỳ công nợ',
      },
      {
        'Mã KH': 'KH002',
        'Tên KH': 'Trần Thị B',
        'Số dư đầu kỳ': 2000000,
        'Ghi chú': 'Nợ cũ',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'Template_Nhap_So_Du_Dau_Ky_Cong_No.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    importMutation.mutate();
  };

  const handleAddSubmit = () => {
    addMutation.mutate();
  };

  // Tính tổng số dư
  const totalBalance = records.reduce((sum, r) => sum + Number(r.balance), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Nhập số dư đầu kỳ công nợ</h1>
          <p className="text-gray-600 mt-2">
            Nhập số dư đầu kỳ công nợ của khách hàng tại từng cửa hàng (Hỗ trợ nhập thủ công và import Excel)
          </p>
        </div>

        {/* Tổng số dư */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Tổng số dư đầu kỳ</p>
              <p className="text-3xl font-bold mt-1">
                {totalBalance.toLocaleString('vi-VN')} ₫
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">Tổng số bản ghi</p>
              <p className="text-2xl font-semibold">{records.length}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowImportSection(false);
            }}
            className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md shadow hover:shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center gap-2 font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showAddForm ? 'Đóng form' : 'Thêm thủ công'}
          </button>

          <button
            onClick={() => {
              setShowImportSection(!showImportSection);
              setShowAddForm(false);
            }}
            className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md shadow hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center gap-2 font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {showImportSection ? 'Đóng import' : 'Import Excel'}
          </button>
        </div>

        {/* Form thêm mới */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Thêm số dư đầu kỳ thủ công</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800">
                ℹ️ <strong>Lưu ý:</strong> Mỗi bản ghi được gán cho <strong>1 cặp (khách hàng, cửa hàng)</strong>.
                Nếu khách hàng nợ ở <strong>2 cửa hàng</strong>, bạn cần thêm <strong>2 lần</strong> (mỗi lần chọn cửa hàng khác nhau).
                Hệ thống sẽ tự động tạo liên kết customer-store nếu chưa có.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Khách hàng <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={selectedCustomerId}
                  onChange={(val) => setSelectedCustomerId(val as number | null)}
                  options={allCustomers.map((c) => ({
                    value: c.id,
                    label: `${c.code} - ${c.name}`,
                  }))}
                  placeholder="Chọn khách hàng..."
                  isClearable
                />
                <p className="text-xs text-gray-500 mt-1">
                  Chọn khách hàng cần nhập số dư đầu kỳ
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cửa hàng <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={selectedStoreId}
                  onChange={(val) => setSelectedStoreId(val as number | null)}
                  options={stores.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.code})`,
                  }))}
                  placeholder="Chọn cửa hàng..."
                  isClearable
                />
                <p className="text-xs text-gray-500 mt-1">
                  Chọn cửa hàng mà khách hàng nợ tại đó
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số dư đầu kỳ <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Nhập số dư (VND)"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Số dư công nợ của khách hàng <strong>tại cửa hàng này</strong> (cho phép âm, không được bằng 0)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ngày ghi nhận <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={addTransactionDate}
                  onChange={(e) => setAddTransactionDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ngày ghi nhận số dư đầu kỳ (dùng để tính báo cáo công nợ)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ghi chú (tùy chọn)"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddSubmit}
                disabled={addMutation.isPending}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md shadow hover:shadow-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {addMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>

              <button
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedCustomerId(null);
                  setSelectedStoreId(null);
                  setBalance('');
                  setNotes('');
                  setAddTransactionDate(new Date().toISOString().split('T')[0]);
                }}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-md shadow hover:shadow-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 flex items-center gap-2 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Import Excel Section */}
        {showImportSection && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Import từ Excel</h3>

            {/* Template Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">📥 Tải template Excel</h4>
              <p className="text-sm text-blue-700 mb-3">
                Tải file mẫu, nhập dữ liệu theo cấu trúc, sau đó upload lại
              </p>
              <button
                onClick={downloadTemplate}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                Tải template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Chọn cửa hàng <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={importStoreId}
                  onChange={(val) => setImportStoreId(val as number | null)}
                  options={stores.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.code})`,
                  }))}
                  placeholder="Chọn cửa hàng..."
                  isClearable
                />
              </div>

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
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Chọn file Excel
                </label>
                <input
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
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleImport}
                disabled={!file || !importStoreId || importMutation.isPending}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md shadow hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {importMutation.isPending ? 'Đang xử lý...' : '📤 Nhập dữ liệu'}
              </button>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className="mt-6 border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Kết quả nhập</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-700">{importResult.success}</div>
                    <div className="text-sm text-green-600 font-medium">Thành công</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-red-700">{importResult.failed}</div>
                    <div className="text-sm text-red-600 font-medium">Thất bại</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 className="font-semibold text-red-900 mb-2">Chi tiết lỗi:</h5>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {importResult.errors.map((error, index) => (
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
        )}

        {/* Bảng danh sách */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Danh sách số dư đầu kỳ đã nhập
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Đang tải...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Chưa có dữ liệu. Vui lòng thêm mới hoặc import từ Excel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Mã KH
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tên khách hàng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Cửa hàng
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Số dư (VND)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ngày nhập
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ghi chú
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {record.customerCode}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{record.customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.storeName}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {editingId === record.id ? (
                          <input
                            type="number"
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-right"
                            step="0.01"
                          />
                        ) : (
                          <span className="font-semibold text-blue-600">
                            {Number(record.balance).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {editingId === record.id ? (
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          new Date(record.createdAt).toLocaleDateString('vi-VN')
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {editingId === record.id ? (
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Ghi chú"
                          />
                        ) : (
                          record.notes
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === record.id ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleSaveEdit(record.id)}
                              disabled={updateMutation.isPending}
                              className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md shadow hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 flex items-center gap-1.5 font-medium"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Lưu
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 text-sm bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-md shadow hover:shadow-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 flex items-center gap-1.5 font-medium"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEdit(record)}
                              className="px-3 py-1.5 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md shadow hover:shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 flex items-center gap-1.5 font-medium"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Sửa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">📌 Lưu ý quan trọng</h3>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>
              <strong>Công nợ được gán theo từng cửa hàng:</strong> Mỗi bản ghi lưu công nợ cho <strong>1 cặp (khách hàng, cửa hàng)</strong>
            </li>
            <li>
              <strong>Khách nợ ở nhiều cửa hàng:</strong> Nếu khách hàng nợ ở 2 cửa hàng, cần thêm 2 bản ghi riêng biệt (mỗi cửa hàng 1 bản ghi)
            </li>
            <li>
              <strong>Tự động tạo liên kết:</strong> Nếu khách hàng chưa được liên kết với cửa hàng, hệ thống sẽ tự động tạo liên kết customer-store
            </li>
            <li>Mã khách hàng phải tồn tại trong hệ thống trước khi nhập</li>
            <li>Số dư đầu kỳ có thể âm hoặc dương (dương = khách nợ, âm = khách được nợ), không được bằng 0</li>
            <li>Dữ liệu sẽ được ghi vào sổ cái công nợ với loại <strong>OPENING_BALANCE</strong></li>
            <li>File Excel phải có các cột: <strong>Mã KH</strong>, <strong>Tên KH</strong>, <strong>Số dư đầu kỳ</strong>, <strong>Ghi chú</strong></li>
            <li><strong className="text-red-700">Chức năng này chỉ dành cho ADMIN và ACCOUNTING</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
