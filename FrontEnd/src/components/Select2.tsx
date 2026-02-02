import React from 'react';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';

export interface Option {
  value: number | string;
  label: string;
}

interface Select2Props {
  options: Option[];
  value?: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  className?: string;
}

const Select2: React.FC<Select2Props> = ({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  isSearchable = true,
  isClearable = false,
  isDisabled = false,
  className = '',
}) => {
  const customStyles: StylesConfig<Option, false> = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '42px',
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      },
      borderRadius: '0.5rem',
      backgroundColor: isDisabled ? '#f9fafb' : 'white',
      cursor: isDisabled ? 'not-allowed' : 'default',
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      zIndex: 9999,
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '0.25rem',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? '#3b82f6'
        : state.isFocused
        ? '#eff6ff'
        : 'transparent',
      color: state.isSelected ? 'white' : '#111827',
      cursor: 'pointer',
      borderRadius: '0.375rem',
      margin: '0.125rem 0',
      '&:active': {
        backgroundColor: '#3b82f6',
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9ca3af',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#111827',
    }),
    input: (provided) => ({
      ...provided,
      color: '#111827',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: '#6b7280',
      '&:hover': {
        color: '#3b82f6',
      },
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: '#6b7280',
      '&:hover': {
        color: '#ef4444',
      },
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: '#d1d5db',
    }),
  };

  const selectedOption = options.find((opt) => {
    // Handle both number and string comparisons
    if (opt.value === value) return true;
    if (String(opt.value) === String(value)) return true;
    return false;
  }) || null;

  const handleChange = (newValue: Option | null) => {
    onChange(newValue ? newValue.value : null);
  };

  return (
    <div className={className}>
      <Select<Option, false>
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isSearchable={isSearchable}
        isClearable={isClearable}
        isDisabled={isDisabled}
        styles={customStyles}
        noOptionsMessage={() => 'Không có dữ liệu'}
        loadingMessage={() => 'Đang tải...'}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
    </div>
  );
};

export default Select2;
