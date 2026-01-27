import React, { useState, useEffect } from "react";
import type { UpdateShiftTimesDto } from "../api/shifts";

interface UpdateShiftTimesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateShiftTimesDto) => Promise<void>;
  shift: {
    id: number;
    shiftNo: number;
    shiftDate: string;
    openedAt?: string;
    closedAt?: string;
  };
}

const UpdateShiftTimesModal: React.FC<UpdateShiftTimesModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  shift,
}) => {
  // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState<UpdateShiftTimesDto>({
    openedAt: formatDateTimeLocal(shift.openedAt),
    closedAt: formatDateTimeLocal(shift.closedAt),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  // Update form data when shift changes
  useEffect(() => {
    setFormData({
      openedAt: formatDateTimeLocal(shift.openedAt),
      closedAt: formatDateTimeLocal(shift.closedAt),
    });
    setError("");
  }, [shift.id, shift.openedAt, shift.closedAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.openedAt || !formData.closedAt) {
      setError("Vui lòng nhập đầy đủ thời gian mở ca và đóng ca");
      return;
    }

    const openedAt = new Date(formData.openedAt);
    const closedAt = new Date(formData.closedAt);

    if (closedAt <= openedAt) {
      setError("Thời gian đóng ca phải sau thời gian mở ca");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Có lỗi xảy ra khi cập nhật thời gian");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Cập nhật thời gian ca {shift.shiftNo}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày ca
            </label>
            <input
              type="text"
              value={new Date(shift.shiftDate).toLocaleDateString("vi-VN")}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thời gian mở ca <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.openedAt}
              onChange={(e) =>
                setFormData({ ...formData, openedAt: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thời gian đóng ca <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.closedAt}
              onChange={(e) =>
                setFormData({ ...formData, closedAt: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang cập nhật...
                </>
              ) : (
                "Cập nhật"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateShiftTimesModal;
