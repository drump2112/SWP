import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from '../hooks/usePageTitle';
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
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import SearchableSelect from "../components/SearchableSelect";
import * as XLSX from "xlsx";

const CustomersPage: React.FC = () => {
  usePageTitle('Khách hàng');
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
  const [storeLimitPage, setStoreLimitPage] = useState(1);
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

  const toggleActiveMutation = useMutation({
    mutationFn: customersApi.toggleActive,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showSuccess(data.isActive ? "Đã kích hoạt khách hàng!" : "Đã vô hiệu hóa khách hàng!");
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || "Thao tác thất bại");
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

  const handleToggleActive = async (customer: Customer) => {
    const action = customer.isActive ? "vô hiệu hóa" : "kích hoạt";
    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn ${action} khách hàng này?`,
      `Xác nhận ${action}`,
    );
    if (confirmed) {
      toggleActiveMutation.mutate(customer.id);
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
    setStoreLimitPage(1);
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

  // Toggle bypass cho toàn bộ (customer level)
  const handleToggleGlobalBypass = async (bypass: boolean, bypassUntil?: string | null) => {
    if (!selectedCustomerForLimit) return;

    try {
      await customersApi.toggleCustomerBypass(
        selectedCustomerForLimit.id,
        bypass,
        bypassUntil,
      );
      await refetchCreditLimits();
      showSuccess(bypass ? "Đã mở chặn hạn mức cho tất cả cửa hàng!" : "Đã bật lại chặn hạn mức!");
    } catch (error: any) {
      showError(error.response?.data?.message || "Thao tác thất bại");
    }
  };

  // Toggle bypass cho từng cửa hàng
  const handleToggleStoreBypass = async (
    storeId: number,
    bypass: boolean,
    bypassUntil?: string | null,
  ) => {
    if (!selectedCustomerForLimit) return;

    try {
      await customersApi.toggleStoreBypass(
        selectedCustomerForLimit.id,
        storeId,
        bypass,
        bypassUntil,
      );
      await refetchCreditLimits();
      showSuccess(bypass ? "Đã mở chặn hạn mức cho cửa hàng này!" : "Đã bật lại chặn hạn mức!");
    } catch (error: any) {
      showError(error.response?.data?.message || "Thao tác thất bại");
    }
  };

  // Xóa liên kết khách hàng - cửa hàng
  const handleRemoveCustomerFromStore = async (storeId: number, storeName: string) => {
    if (!selectedCustomerForLimit) return;

    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn xóa liên kết với cửa hàng "${storeName}"?\n\nChỉ có thể xóa nếu chưa có giao dịch nào.`,
      "Xác nhận xóa liên kết",
    );
    
    if (!confirmed) return;

    try {
      await customersApi.removeCustomerFromStore(
        selectedCustomerForLimit.id,
        storeId,
      );
      await refetchCreditLimits();
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      showSuccess("Đã xóa liên kết thành công!");
    } catch (error: any) {
      showError(error.response?.data?.message || "Xóa liên kết thất bại");
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

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination logic
  const totalItems = filteredCustomers?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers?.slice(startIndex, endIndex);

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
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
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
                Trạng thái
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
            {paginatedCustomers && paginatedCustomers.length > 0 ? (
              paginatedCustomers.map((customer) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      customer.isActive !== false
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}>
                      {customer.isActive !== false ? '● Hoạt động' : '○ Vô hiệu hóa'}
                    </span>
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
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleManageCreditLimit(customer)}
                        className="inline-flex items-center px-2 py-1 text-xs border border-green-300 rounded text-green-700 bg-green-50 hover:bg-green-100 transition-all"
                        title="Quản lý hạn mức công nợ"
                      >
                        <CreditCardIcon className="h-3.5 w-3.5" />
                      </button>
                      {user?.roleCode !== "STORE" && (
                        <button
                          onClick={() => handleEdit(customer)}
                          className="inline-flex items-center px-2 py-1 text-xs border border-indigo-300 rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all"
                          title="Chỉnh sửa"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {(user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "ADMIN") && (
                        <button
                          onClick={() => handleToggleActive(customer)}
                          className={`inline-flex items-center px-2 py-1 text-xs border rounded transition-all ${
                            customer.isActive !== false
                              ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                              : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                          }`}
                          title={customer.isActive !== false ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
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

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                Hiển thị <span className="font-semibold">{startIndex + 1}</span> đến{" "}
                <span className="font-semibold">{Math.min(endIndex, totalItems)}</span> trong tổng số{" "}
                <span className="font-semibold">{totalItems}</span> khách hàng
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={5}>5 / trang</option>
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Đầu
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, index, arr) => (
                    <React.Fragment key={page}>
                      {index > 0 && arr[index - 1] !== page - 1 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded-md ${
                          currentPage === page
                            ? "bg-indigo-600 text-white"
                            : "border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cuối
              </button>
            </div>
          </div>
        )}
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
                  {/* Global Bypass Toggle - Chỉ Admin mới thấy */}
                  {(user?.roleCode === 'SUPER_ADMIN' || user?.roleCode === 'ADMIN') && (
                    <GlobalBypassToggle
                      isActive={creditLimits.bypassCreditLimit}
                      bypassUntil={creditLimits.bypassUntil}
                      onToggle={handleToggleGlobalBypass}
                    />
                  )}

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

                    {creditLimits.storeLimits && creditLimits.storeLimits.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cửa hàng</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Hạn mức riêng</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Hạn mức hiệu lực</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Nợ hiện tại</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Còn lại</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Sử dụng</th>
                              {(user?.roleCode === 'SUPER_ADMIN' || user?.roleCode === 'ADMIN') && (
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Mở chặn</th>
                              )}
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                              // Pagination logic for store limits
                              const itemsPerPage = 5;
                              const total = creditLimits.storeLimits.length;
                              const totalPages = Math.ceil(total / itemsPerPage);
                              const start = (storeLimitPage - 1) * itemsPerPage;
                              const end = start + itemsPerPage;
                              const paginated = creditLimits.storeLimits.slice(start, end);
                              return paginated.map((limit) => (
                                <CreditLimitRow
                                  key={limit.storeId}
                                  limit={limit}
                                  defaultLimit={creditLimits.defaultCreditLimit}
                                  globalBypassActive={creditLimits.bypassCreditLimit}
                                  isAdmin={user?.roleCode === 'SUPER_ADMIN' || user?.roleCode === 'ADMIN'}
                                  onUpdate={handleUpdateCreditLimit}
                                  onToggleBypass={handleToggleStoreBypass}
                                  onRemove={handleRemoveCustomerFromStore}
                                />
                              ));
                            })()}
                          </tbody>
                        </table>
                        {/* Pagination controls */}
                        {creditLimits.storeLimits.length > 5 && (
                          <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
                            <button
                              className="flex items-center gap-1 px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              onClick={() => setStoreLimitPage(Math.max(1, storeLimitPage - 1))}
                              disabled={storeLimitPage === 1}
                            >
                              <ChevronLeftIcon className="h-4 w-4" />
                              Trước
                            </button>
                            <span className="text-sm text-gray-600">
                              Trang {storeLimitPage} / {Math.ceil(creditLimits.storeLimits.length / 5)}
                            </span>
                            <button
                              className="flex items-center gap-1 px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              onClick={() => setStoreLimitPage(Math.min(Math.ceil(creditLimits.storeLimits.length / 5), storeLimitPage + 1))}
                              disabled={storeLimitPage === Math.ceil(creditLimits.storeLimits.length / 5)}
                            >
                              Sau
                              <ChevronRightIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
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

// Component để toggle bypass toàn bộ (customer level)
const GlobalBypassToggle: React.FC<{
  isActive: boolean;
  bypassUntil: string | null;
  onToggle: (bypass: boolean, bypassUntil?: string | null) => Promise<void>;
}> = ({ isActive, bypassUntil, onToggle }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string>('unlimited');

  const handleToggle = async () => {
    if (isActive) {
      // Tắt bypass
      setIsLoading(true);
      try {
        await onToggle(false, null);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Hiện options để chọn thời hạn
      setShowOptions(true);
    }
  };

  const handleConfirmBypass = async () => {
    setIsLoading(true);
    try {
      let until: string | null = null;
      if (selectedDuration !== 'unlimited') {
        const hours = parseInt(selectedDuration);
        const date = new Date();
        date.setHours(date.getHours() + hours);
        until = date.toISOString();
      }
      await onToggle(true, until);
      setShowOptions(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${isActive ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-orange-500' : 'bg-gray-400'}`}>
            <span className="text-white text-lg">{isActive ? '🔓' : '🔒'}</span>
          </div>
          <div>
            <h4 className={`font-semibold ${isActive ? 'text-orange-900' : 'text-gray-900'}`}>
              {isActive ? 'Đang mở chặn hạn mức (Tất cả cửa hàng)' : 'Mở chặn hạn mức (Tất cả cửa hàng)'}
            </h4>
            <p className="text-sm text-gray-600">
              {isActive
                ? bypassUntil
                  ? `Hết hạn: ${new Date(bypassUntil).toLocaleString('vi-VN')}`
                  : 'Không giới hạn thời gian'
                : 'Cho phép khách hàng mua vượt hạn mức tại tất cả cửa hàng'}
            </p>
          </div>
        </div>

        {!showOptions && (
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isActive
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            } disabled:opacity-50`}
          >
            {isLoading ? 'Đang xử lý...' : isActive ? 'Tắt mở chặn' : 'Bật mở chặn'}
          </button>
        )}
      </div>

      {showOptions && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Chọn thời hạn mở chặn:</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { value: '24', label: '24 giờ' },
              { value: '48', label: '48 giờ' },
              { value: '72', label: '72 giờ' },
              { value: '168', label: '1 tuần' },
              { value: 'unlimited', label: 'Không giới hạn' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedDuration(option.value)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedDuration === option.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmBypass}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {isLoading ? 'Đang xử lý...' : 'Xác nhận mở chặn'}
            </button>
            <button
              onClick={() => setShowOptions(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Hủy
            </button>
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
  globalBypassActive?: boolean;
  isAdmin?: boolean;
  onUpdate: (storeId: number, creditLimit: number | null) => Promise<void>;
  onToggleBypass?: (storeId: number, bypass: boolean, bypassUntil?: string | null) => Promise<void>;
  onRemove?: (storeId: number, storeName: string) => Promise<void>;
}> = ({ limit, defaultLimit, globalBypassActive, isAdmin, onUpdate, onToggleBypass, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showBypassOptions, setShowBypassOptions] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string>('24');

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

  const handleToggleBypass = async () => {
    if (!onToggleBypass) return;

    if (limit.bypassCreditLimit) {
      // Tắt bypass
      setIsSaving(true);
      try {
        await onToggleBypass(limit.storeId, false, null);
      } finally {
        setIsSaving(false);
      }
    } else {
      setShowBypassOptions(true);
    }
  };

  const handleConfirmBypass = async () => {
    if (!onToggleBypass) return;

    setIsSaving(true);
    try {
      let until: string | null = null;
      if (selectedDuration !== 'unlimited') {
        const hours = parseInt(selectedDuration);
        const date = new Date();
        date.setHours(date.getHours() + hours);
        until = date.toISOString();
      }
      await onToggleBypass(limit.storeId, true, until);
      setShowBypassOptions(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = () => {
    if (limit.isBypassed) return "text-orange-600 bg-orange-100";
    if (limit.isOverLimit) return "text-red-600 bg-red-100";
    if (limit.creditUsagePercent >= 90) return "text-orange-600 bg-orange-100";
    if (limit.creditUsagePercent >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  return (
    <>
      <tr className={`hover:bg-gray-50 ${limit.isBypassed ? 'bg-orange-50' : ''}`}>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          <div className="flex items-center gap-2">
            {limit.storeName}
            {limit.isBypassed && (
              <span className="text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full">
                {limit.bypassLevel === 'global' ? '🔓 Toàn bộ' : '🔓 CH'}
              </span>
            )}
          </div>
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
                `${Number(limit.creditLimit).toLocaleString("vi-VN")} ₫`
              ) : (
                <span className="text-gray-400 text-xs">Dùng mặc định</span>
              )}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
          {Number(limit.effectiveLimit).toLocaleString("vi-VN")} ₫
        </td>
        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
          {Number(limit.currentDebt).toLocaleString("vi-VN")} ₫
        </td>
        <td className="px-4 py-3 text-sm text-right">
          <span
            className={
              limit.isOverLimit && !limit.isBypassed
                ? "text-red-600 font-semibold"
                : "text-green-600 font-semibold"
            }
          >
            {Number(limit.availableCredit).toLocaleString("vi-VN")} ₫
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}
          >
            {limit.isBypassed ? '∞' : `${limit.creditUsagePercent.toFixed(1)}%`}
          </span>
        </td>
        {isAdmin && (
          <td className="px-4 py-3 text-center">
            {globalBypassActive ? (
              <span className="text-xs text-orange-600">Đã mở toàn bộ</span>
            ) : (
              <button
                onClick={handleToggleBypass}
                disabled={isSaving}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  limit.bypassCreditLimit
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {isSaving ? '...' : limit.bypassCreditLimit ? 'Chặn' : 'Mở chặn'}
              </button>
            )}
          </td>
        )}
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
            <div className="flex justify-center gap-2">
              <button
                onClick={handleEdit}
                className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              >
                Sửa
              </button>
              {isAdmin && onRemove && (
                <button
                  onClick={() => onRemove(limit.storeId, limit.storeName)}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  title="Xóa liên kết"
                >
                  Xóa
                </button>
              )}
            </div>
          )}
        </td>
      </tr>
      {/* Bypass options row */}
      {showBypassOptions && (
        <tr className="bg-orange-50">
          <td colSpan={isAdmin ? 8 : 7} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Thời hạn:</span>
              {[
                { value: '24', label: '24h' },
                { value: '48', label: '48h' },
                { value: '72', label: '72h' },
                { value: 'unlimited', label: 'Không giới hạn' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDuration(option.value)}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    selectedDuration === option.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <button
                onClick={handleConfirmBypass}
                disabled={isSaving}
                className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                {isSaving ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
              <button
                onClick={() => setShowBypassOptions(false)}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default CustomersPage;
