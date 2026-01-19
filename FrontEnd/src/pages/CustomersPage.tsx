import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  customersApi,
  type Customer,
  type CreateCustomerDto,
  type UpdateCustomerDto,
  type CustomerStoreLimitsResponse,
} from "../api/customers";
import { storesApi } from "../api/stores";
import {
  showSuccess,
  showError,
  showConfirm,
  showWarning,
} from "../utils/sweetalert";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import SearchableSelect from "../components/SearchableSelect";
import * as XLSX from "xlsx";

const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<string>("");
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"EXTERNAL" | "INTERNAL">(
    "EXTERNAL",
  );
  const [isImporting, setIsImporting] = useState(false);
  const [isCreditLimitModalOpen, setIsCreditLimitModalOpen] = useState(false);
  const [selectedCustomerForLimit, setSelectedCustomerForLimit] =
    useState<Customer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.getAll(),
  });

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: storesApi.getAll,
    enabled: !user?.storeId, // Only fetch if user is not assigned to a store
  });

  // Query để lấy credit limits của customer được chọn
  const { data: creditLimits, refetch: refetchCreditLimits } = useQuery({
    queryKey: ["customerStoreLimits", selectedCustomerForLimit?.id],
    queryFn: () =>
      customersApi.getStoreCreditLimits(selectedCustomerForLimit!.id),
    enabled: !!selectedCustomerForLimit,
  });

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      showSuccess("Đã tạo khách hàng thành công!");
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || "Tạo khách hàng thất bại");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerDto }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      showSuccess("Đã cập nhật khách hàng thành công!");
    },
    onError: (error: any) => {
      showError(
        error.response?.data?.message || "Cập nhật khách hàng thất bại",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showSuccess("Đã xóa khách hàng thành công!");
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || "Xóa khách hàng thất bại");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: any = {
      code: (formData.get("code") as string) || undefined,
      name: formData.get("name") as string,
      taxCode: (formData.get("taxCode") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      type: (formData.get("type") as "EXTERNAL" | "INTERNAL") || "EXTERNAL",
      creditLimit: formData.get("creditLimit")
        ? Number(formData.get("creditLimit"))
        : undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    // Thêm storeId nếu user là STORE hoặc đã chọn từ dropdown
    if (user?.storeId) {
      data.storeId = user.storeId;
    } else if (selectedStoreId) {
      data.storeId = selectedStoreId;
    }

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data as CreateCustomerDto);
    }
  };

  const checkDuplicate = async (
    name: string,
    phone: string,
    taxCode: string,
  ) => {
    if (!name || (!phone && !taxCode)) return;

    try {
      const result = await customersApi.checkDuplicate({
        name,
        phone,
        taxCode,
      });
      if (result.hasDuplicate) {
        const warnings = result.duplicates
          .map(
            (d: any) => `• ${d.field}: ${d.customer.name} (${d.customer.code})`,
          )
          .join("\n");
        setDuplicateWarning(`Phát hiện trùng lặp:\n${warnings}`);
      } else {
        setDuplicateWarning("");
      }
    } catch (error) {
      console.error("Check duplicate error:", error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    if (customer.customerStores && customer.customerStores.length > 0) {
      setSelectedStoreId(customer.customerStores[0].storeId);
    } else {
      setSelectedStoreId(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setSelectedStoreId(null);
    setDuplicateWarning("");
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm(
      "Bạn có chắc chắn muốn xóa khách hàng này?",
      "Xác nhận xóa",
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showError("Vui lòng chọn file Excel");
      return;
    }

    setIsImporting(true);
    try {
      const result = await customersApi.importFromExcel(
        selectedFile,
        user?.storeId || undefined,
      );

      let message = `✓ Thành công: ${result.success} khách hàng\n`;
      if (result.failed > 0) {
        message += `✗ Thất bại: ${result.failed} dòng\n\n`;
        message += "Chi tiết lỗi:\n";
        result.errors.slice(0, 5).forEach((err) => {
          message += `• Dòng ${err.row}: ${err.error}\n`;
        });
        if (result.errors.length > 5) {
          message += `... và ${result.errors.length - 5} lỗi khác`;
        }
      }

      if (result.success > 0) {
        await showSuccess(message, "Import hoàn tất");
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        setIsImportModalOpen(false);
        setSelectedFile(null);
      } else {
        await showError(message, "Import thất bại");
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Import thất bại");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = (type: "EXTERNAL" | "INTERNAL") => {
    const isExternal = type === "EXTERNAL";
    const filename = isExternal ? "MauImportKhachCongNo.xlsx" : "MauImportKhachBo.xlsx";

    // Tạo workbook mới
    const wb = XLSX.utils.book_new();

    // Dữ liệu cho sheet
    const data: any[][] = [
      // Row 1: Tiêu đề
      [isExternal ? 'MẪU IMPORT KHÁCH HÀNG CÔNG NỢ (EXTERNAL)' : 'MẪU IMPORT KHÁCH HÀNG BỘ (INTERNAL)'],
      // Row 2: Hướng dẫn
      ['Hướng dẫn: Điền thông tin từ dòng 5 trở xuống. Các cột có dấu (*) là bắt buộc. Mã KH có thể bỏ trống để hệ thống tự sinh.'],
      // Row 3: Loại khách hàng (ẩn - dùng cho code parse)
      [type],
      // Row 4: Header
      isExternal
        ? ['Mã KH', 'Tên khách hàng (*)', 'Số điện thoại (*)', 'Mã số thuế', 'Địa chỉ', 'Hạn mức công nợ', 'Ghi chú']
        : ['Mã KH', 'Tên khách hàng (*)', 'Số điện thoại (*)', 'Mã số thuế', 'Địa chỉ', 'Ghi chú'],
      // Row 5-6: Ví dụ
      ...(isExternal ? [
        ['', 'Công ty TNHH ABC', '0912345678', '0123456789', '123 Đường ABC, Quận 1, TP.HCM', '50000000', 'Khách hàng VIP'],
        ['KH00999', 'Công ty XYZ', '0987654321', '9876543210', '456 Đường XYZ, Quận 2, TP.HCM', '30000000', 'Khách hàng thường xuyên'],
      ] : [
        ['', 'Nguyễn Văn A', '0901234567', '', '789 Đường DEF, Quận 3, TP.HCM', 'Khách bộ thường xuyên'],
        ['KH00888', 'Trần Thị B', '0911234567', '', '321 Đường GHI, Quận 4, TP.HCM', 'Khách quen'],
      ])
    ];

    // Tạo worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set độ rộng cột
    const colWidths = isExternal
      ? [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 25 }]
      : [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 25 }];
    ws['!cols'] = colWidths;

    // Merge cells cho tiêu đề và hướng dẫn
    const lastCol = isExternal ? 6 : 5;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }, // Instruction
    ];

    // Ẩn row 3 (type indicator)
    if (!ws['!rows']) ws['!rows'] = [];
    ws['!rows'][2] = { hidden: true };

    // Thêm sheet vào workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Khách hàng');

    // Download file
    XLSX.writeFile(wb, filename);
  };

  const handleManageCreditLimit = (customer: Customer) => {
    setSelectedCustomerForLimit(customer);
    setIsCreditLimitModalOpen(true);
  };

  const handleCloseCreditLimitModal = () => {
    setIsCreditLimitModalOpen(false);
    setSelectedCustomerForLimit(null);
  };

  const handleUpdateCreditLimit = async (
    storeId: number,
    creditLimit: number | null,
  ) => {
    if (!selectedCustomerForLimit) return;

    try {
      await customersApi.updateStoreCreditLimit(
        selectedCustomerForLimit.id,
        storeId,
        creditLimit,
      );
      await refetchCreditLimits();
      showSuccess("Đã cập nhật hạn mức thành công!");
    } catch (error: any) {
      showError(error.response?.data?.message || "Cập nhật hạn mức thất bại");
    }
  };

  const filteredCustomers = customers?.filter((customer) => {
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.taxCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.address?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <UserIcon className="h-8 w-8 text-blue-600" />
            Quản lý khách hàng
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Quản lý thông tin khách hàng và công nợ
          </p>
        </div>
        {user?.roleCode !== "STORE" && (
          <div className="mt-4 sm:mt-0 flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-indigo-600 rounded-lg shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
              Import Excel
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Thêm khách hàng
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã, tên, số điện thoại, địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 focus:border-transparent sm:text-sm transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Mã KH
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Tên khách hàng
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                SĐT
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Địa chỉ
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Hạn mức
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCustomers && filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                    {customer.code}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">
                    <div className="font-medium flex items-center justify-center gap-2">
                      {customer.name}
                      {customer.type === "INTERNAL" && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                          Nội bộ
                        </span>
                      )}
                    </div>
                    {customer.taxCode && (
                      <div className="text-xs text-gray-500">
                        MST: {customer.taxCode}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                    {customer.phone || "-"}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600 max-w-xs truncate">
                    {customer.address || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {customer.creditLimit !== null &&
                    customer.creditLimit !== undefined ? (
                      <span className="font-semibold text-blue-600">
                        {customer.creditLimit.toLocaleString("vi-VN")} ₫
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        Chưa thiết lập
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleManageCreditLimit(customer)}
                      className="inline-flex items-center px-3 py-1.5 border border-green-300 rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
                      title="Quản lý hạn mức công nợ"
                    >
                      <CreditCardIcon className="h-4 w-4 mr-1" />
                      Hạn mức
                    </button>
                    {user?.roleCode !== "STORE" && (
                      <button
                        onClick={() => handleEdit(customer)}
                        className="inline-flex items-center px-3 py-1.5 border border-indigo-300 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Sửa
                      </button>
                    )}
                    {user?.roleCode === "ADMIN" && (
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {searchTerm
                    ? "Không tìm thấy khách hàng nào"
                    : "Chưa có khách hàng nào"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-black bg-opacity-30 backdrop-blur-sm"
              onClick={handleCloseModal}
            ></div>

            <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 -m-6 mb-6 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingCustomer
                      ? "Cập nhật khách hàng"
                      : "Thêm khách hàng mới"}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Warning Banner */}
                {duplicateWarning && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 whitespace-pre-line">
                      {duplicateWarning}
                    </div>
                  </div>
                )}

                {/* Store Selection for Admin */}
                {!user?.storeId && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cửa hàng <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={
                        stores?.map((store) => ({
                          value: store.id,
                          label: store.name,
                        })) || []
                      }
                      value={selectedStoreId}
                      onChange={(value) => setSelectedStoreId(value as number)}
                      placeholder="Chọn cửa hàng quản lý khách hàng này"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Khách hàng/Nhân viên này sẽ thuộc về cửa hàng được chọn.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="code"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Mã khách hàng
                    </label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      defaultValue={editingCustomer?.code || ""}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                      placeholder="Để trống để tự sinh"
                      disabled={!!editingCustomer}
                    />
                    {!editingCustomer && (
                      <p className="mt-1 text-xs text-gray-500">
                        Tự động sinh mã nếu để trống
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      defaultValue={editingCustomer?.phone || ""}
                      onBlur={(e) => {
                        const name = (
                          document.getElementById("name") as HTMLInputElement
                        )?.value;
                        const taxCode = (
                          document.getElementById("taxCode") as HTMLInputElement
                        )?.value;
                        if (!editingCustomer)
                          checkDuplicate(name, e.target.value, taxCode);
                      }}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                      placeholder="VD: 0123456789"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Loại khách hàng
                  </label>
                  <select
                    id="type"
                    name="type"
                    defaultValue={editingCustomer?.type || "EXTERNAL"}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                  >
                    <option value="EXTERNAL">
                      Khách hàng thường (Bên ngoài)
                    </option>
                    <option value="INTERNAL">
                      Nội bộ (Nhân viên/Cửa hàng trưởng)
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    defaultValue={editingCustomer?.name || ""}
                    onBlur={(e) => {
                      const phone = (
                        document.getElementById("phone") as HTMLInputElement
                      )?.value;
                      const taxCode = (
                        document.getElementById("taxCode") as HTMLInputElement
                      )?.value;
                      if (!editingCustomer)
                        checkDuplicate(e.target.value, phone, taxCode);
                    }}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                    placeholder="VD: Công ty ABC"
                  />
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    defaultValue={editingCustomer?.address || ""}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                    placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="taxCode"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Mã số thuế
                    </label>
                    <input
                      type="text"
                      id="taxCode"
                      name="taxCode"
                      defaultValue={editingCustomer?.taxCode || ""}
                      onBlur={(e) => {
                        const name = (
                          document.getElementById("name") as HTMLInputElement
                        )?.value;
                        const phone = (
                          document.getElementById("phone") as HTMLInputElement
                        )?.value;
                        if (!editingCustomer)
                          checkDuplicate(name, phone, e.target.value);
                      }}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                      placeholder="VD: 0123456789"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="creditLimit"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Hạn mức công nợ (₫)
                    </label>
                    <input
                      type="number"
                      id="creditLimit"
                      name="creditLimit"
                      min="0"
                      step="1000"
                      defaultValue={editingCustomer?.creditLimit || ""}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                      placeholder="VD: 50000000"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Ghi chú
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={editingCustomer?.notes || ""}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all resize-none"
                    placeholder="Ghi chú thêm về khách hàng..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Đang xử lý..."
                      : editingCustomer
                        ? "Cập nhật"
                        : "Tạo mới"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsImportModalOpen(false)}
            />

            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Import khách hàng từ Excel
                </h3>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Step 1: Download template */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    Bước 1: Tải file mẫu
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleDownloadTemplate("EXTERNAL")}
                      className="px-4 py-3 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-all text-sm font-medium text-blue-700"
                    >
                      📊 Khách công nợ (EXTERNAL)
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate("INTERNAL")}
                      className="px-4 py-3 bg-white border-2 border-green-300 rounded-lg hover:bg-green-50 transition-all text-sm font-medium text-green-700"
                    >
                      💵 Khách nội bộ (INTERNAL)
                    </button>
                  </div>
                </div>

                {/* Step 2: Upload file */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    Bước 2: Tải file đã điền
                  </h4>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-all">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="text-green-600 font-medium">
                          ✓ {selectedFile.name}
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Chọn file khác
                        </button>
                      </div>
                    ) : (
                      <div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Nhấn để chọn file Excel
                        </button>
                        <p className="text-sm text-gray-500 mt-1">
                          Hỗ trợ file .xlsx và .xls
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || isImporting}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? "Đang import..." : "Import ngay"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Limit Management Modal */}
      {isCreditLimitModalOpen && selectedCustomerForLimit && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseCreditLimitModal}
            />

            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Quản lý hạn mức công nợ
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCustomerForLimit.name} (
                    {selectedCustomerForLimit.code})
                  </p>
                </div>
                <button
                  onClick={handleCloseCreditLimitModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Loading State */}
              {!creditLimits && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-sm text-gray-600">
                      Đang tải dữ liệu...
                    </p>
                  </div>
                </div>
              )}

              {/* Content */}
              {creditLimits && (
                <div className="space-y-4">
                  {/* Default Credit Limit */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Hạn mức mặc định (áp dụng cho tất cả cửa hàng)
                    </h4>
                    <div className="text-2xl font-bold text-blue-700">
                      {creditLimits.defaultCreditLimit !== null &&
                      creditLimits.defaultCreditLimit !== undefined
                        ? `${creditLimits.defaultCreditLimit.toLocaleString("vi-VN")} ₫`
                        : "Chưa thiết lập"}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Có thể thiết lập hạn mức riêng cho từng cửa hàng ở bên
                      dưới
                    </p>
                  </div>

                  {/* Store-specific Limits */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                      <span>Hạn mức theo từng cửa hàng</span>
                      <span className="text-xs text-gray-500">
                        ({creditLimits.storeLimits?.length || 0} cửa hàng)
                      </span>
                    </h4>

                    {creditLimits.storeLimits &&
                    creditLimits.storeLimits.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Cửa hàng
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                                Hạn mức riêng
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                                Hạn mức hiệu lực
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                                Nợ hiện tại
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                                Còn lại
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                Sử dụng
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                Thao tác
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {creditLimits.storeLimits.map((limit) => (
                              <CreditLimitRow
                                key={limit.storeId}
                                limit={limit}
                                defaultLimit={creditLimits.defaultCreditLimit}
                                onUpdate={handleUpdateCreditLimit}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Không có cửa hàng nào trong hệ thống
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Lưu ý:</strong> Hạn mức riêng sẽ được ưu tiên sử
                      dụng. Nếu để trống, hệ thống sẽ dùng hạn mức mặc định (
                      {creditLimits.defaultCreditLimit?.toLocaleString(
                        "vi-VN",
                      ) || 0}{" "}
                      ₫).
                    </p>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <button
                      onClick={handleCloseCreditLimitModal}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component riêng để quản lý từng row của credit limit
const CreditLimitRow: React.FC<{
  limit: any;
  defaultLimit: number | null;
  onUpdate: (storeId: number, creditLimit: number | null) => Promise<void>;
}> = ({ limit, defaultLimit, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditValue(limit.creditLimit !== null ? String(limit.creditLimit) : "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const value = editValue.trim() === "" ? null : Number(editValue);
      await onUpdate(limit.storeId, value);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update credit limit:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const getStatusColor = () => {
    if (limit.isOverLimit) return "text-red-600 bg-red-100";
    if (limit.creditUsagePercent >= 90) return "text-orange-600 bg-orange-100";
    if (limit.creditUsagePercent >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {limit.storeName}
      </td>
      <td className="px-4 py-3 text-sm text-right">
        {isEditing ? (
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Để trống = dùng mặc định"
            className="w-full px-2 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 text-right"
            min="0"
            step="1000"
          />
        ) : (
          <span className="text-gray-700">
            {limit.creditLimit !== null ? (
              `${limit.creditLimit.toLocaleString("vi-VN")} ₫`
            ) : (
              <span className="text-gray-400 text-xs">Dùng mặc định</span>
            )}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
        {limit.effectiveLimit.toLocaleString("vi-VN")} ₫
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
        {limit.currentDebt.toLocaleString("vi-VN")} ₫
      </td>
      <td className="px-4 py-3 text-sm text-right">
        <span
          className={
            limit.isOverLimit
              ? "text-red-600 font-semibold"
              : "text-green-600 font-semibold"
          }
        >
          {limit.availableCredit.toLocaleString("vi-VN")} ₫
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}
        >
          {limit.creditUsagePercent.toFixed(1)}%
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {isEditing ? (
          <div className="flex justify-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? "Lưu..." : "Lưu"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Hủy
            </button>
          </div>
        ) : (
          <button
            onClick={handleEdit}
            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
          >
            Sửa
          </button>
        )}
      </td>
    </tr>
  );
};

export default CustomersPage;
