import React, { useState, useEffect, useRef } from "react";

interface MoneyInputProps {
  name: string;
  defaultValue?: number | string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  min?: number;
  onChange?: (value: number) => void;
}

/**
 * Input component for money with thousand separator formatting (e.g., 1.000.000)
 * Displays formatted value but stores actual numeric value
 */
const MoneyInput: React.FC<MoneyInputProps> = ({
  name,
  defaultValue = "",
  placeholder = "VD: 50.000.000",
  required = false,
  className = "block w-full px-4 py-2 border border-gray-300 rounded-lg",
  min = 0,
  onChange,
}) => {
  // Format number with dots as thousand separators
  const formatNumber = (num: number | string): string => {
    if (num === "" || num === null || num === undefined) return "";
    const numValue = typeof num === "string" ? parseFloat(num.replace(/\./g, "")) : num;
    if (isNaN(numValue)) return "";
    return numValue.toLocaleString("de-DE"); // German locale uses dots for thousands
  };

  // Parse formatted string back to number
  const parseNumber = (str: string): number => {
    if (!str) return 0;
    // Remove all dots (thousand separators)
    const cleaned = str.replace(/\./g, "");
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  };

  const [displayValue, setDisplayValue] = useState<string>(formatNumber(defaultValue));
  const [actualValue, setActualValue] = useState<number>(
    typeof defaultValue === "number" ? defaultValue : parseNumber(String(defaultValue))
  );
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Update when defaultValue changes
  useEffect(() => {
    const newActualValue = typeof defaultValue === "number" ? defaultValue : parseNumber(String(defaultValue));
    setActualValue(newActualValue);
    setDisplayValue(formatNumber(defaultValue));
  }, [defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Only allow digits and dots
    const cleaned = input.replace(/[^\d]/g, "");

    if (cleaned === "") {
      setDisplayValue("");
      setActualValue(0);
      onChange?.(0);
      return;
    }

    const numValue = parseInt(cleaned, 10);
    if (!isNaN(numValue)) {
      setActualValue(numValue);
      setDisplayValue(formatNumber(numValue));
      onChange?.(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    const allowedKeys = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];

    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) {
      return;
    }

    // Only allow digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <>
      {/* Hidden input for form submission with actual numeric value */}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        value={actualValue}
      />
      {/* Visible input with formatted display */}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className={className}
        min={min}
      />
    </>
  );
};

export default MoneyInput;
