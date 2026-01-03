import Swal from 'sweetalert2';

export const showSuccess = (message: string, title: string = 'Thành công!') => {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonColor: '#2563eb',
    confirmButtonText: 'OK',
  });
};

export const showError = (message: string, title: string = 'Lỗi!') => {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: '#dc2626',
    confirmButtonText: 'Đóng',
  });
};

export const showWarning = (message: string, title: string = 'Cảnh báo!') => {
  return Swal.fire({
    icon: 'warning',
    title,
    text: message,
    confirmButtonColor: '#f59e0b',
    confirmButtonText: 'OK',
  });
};

export const showInfo = (message: string, title: string = 'Thông báo') => {
  return Swal.fire({
    icon: 'info',
    title,
    text: message,
    confirmButtonColor: '#3b82f6',
    confirmButtonText: 'OK',
  });
};

export const showConfirm = async (
  message: string,
  title: string = 'Xác nhận',
  iconType: 'question' | 'warning' | 'info' = 'question',
  confirmButtonText: string = 'Xác nhận',
  cancelButtonText: string = 'Hủy'
) => {
  const result = await Swal.fire({
    icon: iconType,
    title,
    html: message, // Sử dụng html thay vì text để hiển thị HTML tags
    showCancelButton: true,
    confirmButtonColor: iconType === 'warning' ? '#f59e0b' : '#2563eb',
    cancelButtonColor: '#6b7280',
    confirmButtonText,
    cancelButtonText,
  });
  return result.isConfirmed;
};

export const showLoading = (message: string = 'Đang xử lý...') => {
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

export const closeLoading = () => {
  Swal.close();
};
