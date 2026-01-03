import React from 'react';
import Select from 'react-select';
import type { StylesConfig, GroupBase } from 'react-select';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  name?: string;
  required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  className = '',
  isDisabled = false,
  isClearable = false,
  name,
  required = false,
}) => {
  const selectedOption = options.find((opt) => opt.value === value) || null;

  const customStyles: StylesConfig<Option, false, GroupBase<Option>> = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '42px',
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
      '&:hover': {
        borderColor: '#3b82f6',
      },
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? '#3b82f6'
        : state.isFocused
        ? '#eff6ff'
        : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      cursor: 'pointer',
      fontSize: '0.875rem',
      padding: '10px 12px',
      '&:active': {
        backgroundColor: '#2563eb',
      },
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      marginTop: '4px',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '4px',
      maxHeight: '240px',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9ca3af',
      fontSize: '0.875rem',
    }),
    input: (provided) => ({
      ...provided,
      margin: '0',
      padding: '0',
      fontSize: '0.875rem',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#1f2937',
      fontSize: '0.875rem',
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
  };

  return (
    <div className={className}>
      <Select
        name={name}
        options={options}
        value={selectedOption}
        onChange={(option) => onChange(option ? option.value : null)}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isSearchable
        styles={customStyles}
        noOptionsMessage={() => 'Không tìm thấy kết quả'}
        loadingMessage={() => 'Đang tải...'}
        required={required}
      />
    </div>
  );
};

export default SearchableSelect;
