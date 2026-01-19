import React from 'react';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ResponsiveTable wrapper component
 * Provides horizontal scroll on mobile for tables
 *
 * Usage:
 * <ResponsiveTable>
 *   <table className="min-w-full">
 *     ...
 *   </table>
 * </ResponsiveTable>
 */
const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ children, className = '' }) => {
  return (
    <div className={`overflow-x-auto -mx-2 sm:mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        {children}
      </div>
    </div>
  );
};

/**
 * MobileCard component - Alternative display for table rows on mobile
 * Shows data as cards instead of table on small screens
 */
interface MobileCardProps {
  title: string;
  subtitle?: string;
  fields: { label: string; value: React.ReactNode }[];
  actions?: React.ReactNode;
  className?: string;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  title,
  subtitle,
  fields,
  actions,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-500">{field.label}:</span>
            <span className="text-gray-900 font-medium">{field.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * HybridTable component - Shows table on desktop, cards on mobile
 */
interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
  mobileLabel?: string;
}

interface HybridTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  title?: (item: T) => string;
  subtitle?: (item: T) => string;
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function HybridTable<T>({
  data,
  columns,
  keyField,
  title,
  subtitle,
  actions,
  emptyMessage = 'Không có dữ liệu',
  isLoading = false,
}: HybridTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const getValue = (item: T, key: string): React.ReactNode => {
    const keys = key.split('.');
    let value: any = item;
    for (const k of keys) {
      value = value?.[k];
    }
    return value ?? '-';
  };

  return (
    <>
      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Thao tác
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={String(item[keyField])} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-center text-sm text-gray-900">
                    {col.render ? col.render(item) : getValue(item, String(col.key))}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-center">
                    {actions(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - hidden on desktop */}
      <div className="md:hidden space-y-3 px-2">
        {data.map((item) => {
          const mobileColumns = columns.filter(col => !col.hideOnMobile);
          const fields = mobileColumns.map(col => ({
            label: col.mobileLabel || col.header,
            value: col.render ? col.render(item) : getValue(item, String(col.key)),
          }));

          return (
            <MobileCard
              key={String(item[keyField])}
              title={title ? title(item) : String(getValue(item, String(columns[0]?.key)))}
              subtitle={subtitle ? subtitle(item) : undefined}
              fields={fields.slice(1)} // Skip first field as it's used as title
              actions={actions ? actions(item) : undefined}
            />
          );
        })}
      </div>
    </>
  );
}

export default ResponsiveTable;
