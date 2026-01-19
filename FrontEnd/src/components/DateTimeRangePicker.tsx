import React, { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";
import { CalendarIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface DateTimeRangePickerProps {
  startDate: string; // Format: YYYY-MM-DDTHH:mm
  endDate: string; // Format: YYYY-MM-DDTHH:mm
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  label?: string;
}

const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = "Thời gian",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse dates
  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;

  // Format display text
  const formatDisplayDate = (date: string | null) => {
    if (!date) return "";
    return dayjs(date).format("DD/MM/YYYY HH:mm");
  };

  const displayText =
    startDate || endDate
      ? `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`
      : "Chọn khoảng thời gian";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CalendarIcon className="h-4 w-4 inline mr-1" />
          {label}
        </label>
      )}

      {/* Display Input */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between min-h-[42px]"
      >
        <span className={startDate ? "text-gray-900 text-sm" : "text-gray-400 text-sm"}>
          {displayText}
        </span>
        <CalendarIcon className="h-5 w-5 text-gray-400" />
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">
              Chọn khoảng thời gian
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="flex gap-6">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Từ ngày</label>
              <DatePicker
                selected={startDateObj}
                onChange={(date) => {
                  if (date) {
                    onStartDateChange(dayjs(date).format("YYYY-MM-DDTHH:mm"));
                  }
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                timeCaption="Giờ"
                selectsStart
                startDate={startDateObj}
                endDate={endDateObj}
                maxDate={endDateObj || undefined}
                inline
                className="border border-gray-300 rounded-md px-2 py-1"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Đến ngày</label>
              <DatePicker
                selected={endDateObj}
                onChange={(date) => {
                  if (date) {
                    onEndDateChange(dayjs(date).format("YYYY-MM-DDTHH:mm"));
                  }
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                timeCaption="Giờ"
                selectsEnd
                startDate={startDateObj}
                endDate={endDateObj}
                minDate={startDateObj || undefined}
                inline
                className="border border-gray-300 rounded-md px-2 py-1"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                onStartDateChange(dayjs().startOf("day").format("YYYY-MM-DDTHH:mm"));
                onEndDateChange(dayjs().endOf("day").format("YYYY-MM-DDTHH:mm"));
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors"
            >
              Hôm nay
            </button>
            <button
              onClick={() => {
                onStartDateChange(dayjs().subtract(1, "day").startOf("day").format("YYYY-MM-DDTHH:mm"));
                onEndDateChange(dayjs().subtract(1, "day").endOf("day").format("YYYY-MM-DDTHH:mm"));
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors"
            >
              Hôm qua
            </button>
            <button
              onClick={() => {
                onStartDateChange(dayjs().startOf("week").format("YYYY-MM-DDTHH:mm"));
                onEndDateChange(dayjs().format("YYYY-MM-DDTHH:mm"));
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors"
            >
              Tuần này
            </button>
            <button
              onClick={() => {
                onStartDateChange(dayjs().startOf("month").format("YYYY-MM-DDTHH:mm"));
                onEndDateChange(dayjs().format("YYYY-MM-DDTHH:mm"));
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors"
            >
              Tháng này
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="ml-auto px-4 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimeRangePicker;
