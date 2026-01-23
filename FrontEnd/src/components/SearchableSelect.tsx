import React from 'react';
import Select, { type MultiValue, type SingleValue, components, type ValueContainerProps } from 'react-select';
import type { StylesConfig, GroupBase } from 'react-select';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string | number | null | (string | number)[];
  onChange: (value: string | number | null | (string | number)[]) => void;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  isMulti?: boolean;
  name?: string;
  required?: boolean;
  hideSelectedValues?: boolean; // New prop to hide selected values in multi-select
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  className = '',
  isDisabled = false,
  isClearable = false,
  isMulti = false,
  name,
  required = false,
  hideSelectedValues = false,
}) => {
  // Custom ValueContainer to show count instead of all selected values
  const ValueContainer = ({ children, ...props }: ValueContainerProps<Option, boolean>) => {
    const { getValue, hasValue } = props;
    const selectedCount = getValue().length;

    if (isMulti && hideSelectedValues && hasValue && selectedCount > 0) {
      return (
        <components.ValueContainer {...props}>
          <div className="text-sm text-gray-700">
            Đã chọn {selectedCount} mục
          </div>
          {React.Children.map(children, (child) =>
            child && typeof child === 'object' && 'type' in child && child.type !== components.MultiValue
              ? child
              : null
          )}
        </components.ValueContainer>
      );
    }

    return <components.ValueContainer {...props}>{children}</components.ValueContainer>;
  };

  // Handle value for both single and multi select
  const getValue = () => {
    if (isMulti) {
      if (Array.isArray(value)) {
        return options.filter((opt) => value.includes(opt.value));
      }
      return [];
    }
    return options.find((opt) => opt.value === value) || null;
  };

  const handleChange = (
    newValue: SingleValue<Option> | MultiValue<Option>
  ) => {
    if (isMulti) {
      const multiValue = newValue as MultiValue<Option>;
      onChange(multiValue.map((opt) => opt.value));
    } else {
      const singleValue = newValue as SingleValue<Option>;
      onChange(singleValue ? singleValue.value : null);
    }
  };

  const customStyles: StylesConfig<Option, boolean, GroupBase<Option>> = {
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
      zIndex: 9999,
      maxWidth: 'calc(100vw - 32px)',
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
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#eff6ff',
      borderRadius: '0.375rem',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#1d4ed8',
      fontSize: '0.875rem',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#1d4ed8',
      ':hover': {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
      },
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
    <div className={`relative ${className}`}>
      <Select
        value={getValue()}
        onChange={handleChange}
        options={options}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isMulti={isMulti}
        isSearchable
        name={name}
        required={required}
        noOptionsMessage={() => 'Không tìm thấy kết quả'}
        loadingMessage={() => 'Đang tải...'}
        menuPortalTarget={document.body}
        styles={{
          ...customStyles,
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        }}
        components={hideSelectedValues ? { ValueContainer } : undefined}
      />
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{
            opacity: 0,
            width: '100%',
            height: 1,
            position: 'absolute',
            bottom: 0,
          }}
          value={value ? (Array.isArray(value) ? (value.length ? 'valid' : '') : value) : ''}
          onChange={() => {}}
          required={true}
        />
      )}
    </div>
  );
};

export default SearchableSelect;
