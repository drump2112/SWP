import React, { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";
import { CalendarIcon, XMarkIcon } from "@heroicons/react/24/outline";
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

interface DateTimeRangePickerProps {
  startDate: string; // Format: YYYY-MM-DDTHH:mm
  endDate: string; // Format: YYYY-MM-DDTHH:mm
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  label?: string;
  showQuickSelect?: boolean;
}

const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = "Thời gian",
  showQuickSelect = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local time inputs
  const [startHour, setStartHour] = useState("00");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("23");
  const [endMinute, setEndMinute] = useState("59");

  // Parse dates
  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;

  // Initialize time inputs from props
  useEffect(() => {
    if (startDate) {
      const d = dayjs(startDate);
      setStartHour(d.format("HH"));
      setStartMinute(d.format("mm"));
    }
    if (endDate) {
      const d = dayjs(endDate);
      setEndHour(d.format("HH"));
      setEndMinute(d.format("mm"));
    }
  }, [startDate, endDate]);

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

  const quickSelectOptions = [
    {
      label: 'Hôm nay',
      getRange: () => ({
        from: dayjs().startOf('day').format('YYYY-MM-DDTHH:mm'),
        to: dayjs().endOf('day').format('YYYY-MM-DDTHH:mm'),
      }),
    },
    {
      label: 'Tuần này',
      getRange: () => ({
        from: dayjs().startOf('week').format('YYYY-MM-DDTHH:mm'),
        to: dayjs().endOf('week').format('YYYY-MM-DDTHH:mm'),
      }),
    },
    {
      label: 'Tháng này',
      getRange: () => ({
        from: dayjs().startOf('month').format('YYYY-MM-DDTHH:mm'),
        to: dayjs().endOf('month').format('YYYY-MM-DDTHH:mm'),
      }),
    },
    {
      label: 'Tháng trước',
      getRange: () => {
        const today = new Date();
        const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
        const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;

        const firstDay = new Date(year, month, 1, 0, 0, 0);
        const lastDay = new Date(year, month + 1, 0, 23, 59, 59);

        return {
          from: dayjs(firstDay).format('YYYY-MM-DDTHH:mm'),
          to: dayjs(lastDay).format('YYYY-MM-DDTHH:mm'),
        };
      },
    },
    {
      label: 'Quý này',
      getRange: () => ({
        from: dayjs().startOf('quarter').format('YYYY-MM-DDTHH:mm'),
        to: dayjs().endOf('quarter').format('YYYY-MM-DDTHH:mm'),
      }),
    },
    {
      label: 'Năm nay',
      getRange: () => ({
        from: dayjs().startOf('year').format('YYYY-MM-DDTHH:mm'),
        to: dayjs().endOf('year').format('YYYY-MM-DDTHH:mm'),
      }),
    },
  ];

  const handleQuickSelect = (option: typeof quickSelectOptions[0]) => {
    const { from, to } = option.getRange();
    onStartDateChange(from);
    onEndDateChange(to);
  };

  const handleDateChange = (date: Date | null, isStart: boolean) => {
    if (!date) return;

    const hour = isStart ? startHour : endHour;
    const minute = isStart ? startMinute : endMinute;
    const formatted = dayjs(date).format('YYYY-MM-DD') + `T${hour}:${minute}`;

    if (isStart) {
      onStartDateChange(formatted);
    } else {
      onEndDateChange(formatted);
    }
  };

  const handleTimeChange = (value: string, type: 'startHour' | 'startMinute' | 'endHour' | 'endMinute') => {
    const numValue = value.replace(/\D/g, '');
    let clampedValue = numValue;

    if (type.includes('Hour')) {
      const hour = parseInt(numValue) || 0;
      clampedValue = Math.min(23, Math.max(0, hour)).toString().padStart(2, '0');
    } else {
      const minute = parseInt(numValue) || 0;
      clampedValue = Math.min(59, Math.max(0, minute)).toString().padStart(2, '0');
    }

    // Update local state
    if (type === 'startHour') setStartHour(clampedValue);
    else if (type === 'startMinute') setStartMinute(clampedValue);
    else if (type === 'endHour') setEndHour(clampedValue);
    else if (type === 'endMinute') setEndMinute(clampedValue);

    // Update parent state
    if (type.startsWith('start') && startDateObj) {
      const hour = type === 'startHour' ? clampedValue : startHour;
      const minute = type === 'startMinute' ? clampedValue : startMinute;
      const formatted = dayjs(startDateObj).format('YYYY-MM-DD') + `T${hour}:${minute}`;
      onStartDateChange(formatted);
    } else if (type.startsWith('end') && endDateObj) {
      const hour = type === 'endHour' ? clampedValue : endHour;
      const minute = type === 'endMinute' ? clampedValue : endMinute;
      const formatted = dayjs(endDateObj).format('YYYY-MM-DD') + `T${hour}:${minute}`;
      onEndDateChange(formatted);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Display Input */}
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 focus:outline-none text-sm min-h-[42px] text-left"
        >
          <span className={startDate && endDate ? "text-gray-900" : "text-gray-500"}>
            {displayText}
          </span>
        </div>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl p-5">
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

          {/* Quick select buttons */}
          {showQuickSelect && (
            <div className="pb-4 mb-4 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-2">
                {quickSelectOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleQuickSelect(option)}
                    className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-700 border border-gray-200 transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Pickers */}
          <div className="flex gap-6">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                Từ ngày
              </label>
              <DatePicker
                selected={startDateObj}
                onChange={(date) => handleDateChange(date, true)}
                dateFormat="dd/MM/yyyy"
                selectsStart
                startDate={startDateObj}
                endDate={endDateObj}
                maxDate={endDateObj || undefined}
                inline
              />
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={startHour}
                  onChange={(e) => handleTimeChange(e.target.value, 'startHour')}
                  onBlur={(e) => {
                    const val = e.target.value.padStart(2, '0');
                    setStartHour(val);
                  }}
                  className="w-14 px-2 py-1.5 text-center border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="00"
                  maxLength={2}
                />
                <span className="text-gray-600 font-medium">:</span>
                <input
                  type="text"
                  value={startMinute}
                  onChange={(e) => handleTimeChange(e.target.value, 'startMinute')}
                  onBlur={(e) => {
                    const val = e.target.value.padStart(2, '0');
                    setStartMinute(val);
                  }}
                  className="w-14 px-2 py-1.5 text-center border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="00"
                  maxLength={2}
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                Đến ngày
              </label>
              <DatePicker
                selected={endDateObj}
                onChange={(date) => handleDateChange(date, false)}
                dateFormat="dd/MM/yyyy"
                selectsEnd
                startDate={startDateObj}
                endDate={endDateObj}
                minDate={startDateObj || undefined}
                inline
              />
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={endHour}
                  onChange={(e) => handleTimeChange(e.target.value, 'endHour')}
                  onBlur={(e) => {
                    const val = e.target.value.padStart(2, '0');
                    setEndHour(val);
                  }}
                  className="w-14 px-2 py-1.5 text-center border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="23"
                  maxLength={2}
                />
                <span className="text-gray-600 font-medium">:</span>
                <input
                  type="text"
                  value={endMinute}
                  onChange={(e) => handleTimeChange(e.target.value, 'endMinute')}
                  onBlur={(e) => {
                    const val = e.target.value.padStart(2, '0');
                    setEndMinute(val);
                  }}
                  className="w-14 px-2 py-1.5 text-center border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="59"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Apply button */}
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
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
