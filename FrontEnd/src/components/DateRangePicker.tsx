import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  label?: string;
  showQuickSelect?: boolean;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  label = 'Khoảng thời gian',
  showQuickSelect = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse dates
  const fromDateObj = fromDate ? new Date(fromDate) : null;
  const toDateObj = toDate ? new Date(toDate) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateDisplay = (from: string, to: string) => {
    if (!from && !to) return 'Chọn khoảng thời gian';
    const fromFormatted = from ? dayjs(from).format('DD/MM/YYYY') : '...';
    const toFormatted = to ? dayjs(to).format('DD/MM/YYYY') : '...';
    return `${fromFormatted} → ${toFormatted}`;
  };

  const quickSelectOptions = [
    {
      label: 'Hôm nay',
      getRange: () => ({
        from: dayjs().format('YYYY-MM-DD'),
        to: dayjs().format('YYYY-MM-DD'),
      }),
    },
    {
      label: 'Tuần này',
      getRange: () => ({
        from: dayjs().startOf('week').format('YYYY-MM-DD'),
        to: dayjs().endOf('week').format('YYYY-MM-DD'),
      }),
    },
    {
      label: 'Tháng này',
      getRange: () => ({
        from: dayjs().startOf('month').format('YYYY-MM-DD'),
        to: dayjs().endOf('month').format('YYYY-MM-DD'),
      }),
    },
    {
      label: 'Tháng trước',
      getRange: () => ({
        from: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
        to: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
      }),
    },
    {
      label: 'Quý này',
      getRange: () => ({
        from: dayjs().startOf('quarter').format('YYYY-MM-DD'),
        to: dayjs().endOf('quarter').format('YYYY-MM-DD'),
      }),
    },
    {
      label: 'Năm nay',
      getRange: () => ({
        from: dayjs().startOf('year').format('YYYY-MM-DD'),
        to: dayjs().endOf('year').format('YYYY-MM-DD'),
      }),
    },
  ];

  const handleQuickSelect = (option: typeof quickSelectOptions[0]) => {
    const { from, to } = option.getRange();
    onFromDateChange(from);
    onToDateChange(to);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white text-left cursor-pointer hover:border-blue-400 focus:outline-none text-sm min-h-[42px]"
        >
          <span className={fromDate && toDate ? 'text-gray-900' : 'text-gray-500'}>
            {formatDateDisplay(fromDate, toDate)}
          </span>
        </div>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white shadow-2xl rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Chọn khoảng thời gian</span>
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Từ ngày</label>
              <DatePicker
                selected={fromDateObj}
                onChange={(date) => {
                  if (date) {
                    onFromDateChange(dayjs(date).format('YYYY-MM-DD'));
                  }
                }}
                dateFormat="dd/MM/yyyy"
                selectsStart
                startDate={fromDateObj}
                endDate={toDateObj}
                maxDate={toDateObj || undefined}
                inline
                locale="vi"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Đến ngày</label>
              <DatePicker
                selected={toDateObj}
                onChange={(date) => {
                  if (date) {
                    onToDateChange(dayjs(date).format('YYYY-MM-DD'));
                  }
                }}
                dateFormat="dd/MM/yyyy"
                selectsEnd
                startDate={fromDateObj}
                endDate={toDateObj}
                minDate={fromDateObj || undefined}
                inline
                locale="vi"
              />
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

export default DateRangePicker;
