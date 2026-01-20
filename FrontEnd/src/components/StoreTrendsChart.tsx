import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StoreTrendsChartProps {
  data: {
    months: string[];
    stores: {
      storeId: number;
      storeName: string;
      storeCode: string;
      data: {
        month: string;
        revenue: number;
      }[];
    }[];
  };
  title?: string;
}

const COLORS = [
  '#315eac',
  '#e74c3c',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#34495e',
  '#e67e22',
  '#3498db',
  '#e91e63',
  '#00bcd4',
  '#8bc34a',
  '#ff5722',
  '#795548',
  '#607d8b',
];

// Custom Legend Component
const CustomLegend: React.FC<{
  stores: { storeId: number; storeName: string; storeCode: string }[];
  hiddenStores: Set<number>;
  onToggleStore: (storeId: number) => void;
}> = ({ stores, hiddenStores, onToggleStore }) => {
  return (
    <div className="mt-4 border-t pt-3">
      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto px-1">
        {stores.map((store, index) => {
          const isHidden = hiddenStores.has(store.storeId);
          return (
            <button
              key={store.storeId}
              onClick={() => onToggleStore(store.storeId)}
              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border transition-all duration-200 hover:shadow-sm ${
                isHidden
                  ? 'bg-gray-100 text-gray-400 border-gray-200'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
              title={isHidden ? `Hiện ${store.storeName}` : `Ẩn ${store.storeName}`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0 ${isHidden ? 'opacity-30' : ''}`}
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className={`truncate max-w-[100px] ${isHidden ? 'line-through' : ''}`}>
                {store.storeCode || store.storeName}
              </span>
            </button>
          );
        })}
      </div>
      {stores.length > 6 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          Click vào tên cửa hàng để ẩn/hiện
        </p>
      )}
    </div>
  );
};

const StoreTrendsChart: React.FC<StoreTrendsChartProps> = ({ data, title }) => {
  const [hiddenStores, setHiddenStores] = useState<Set<number>>(new Set());

  const toggleStore = (storeId: number) => {
    setHiddenStores((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(storeId)) {
        newSet.delete(storeId);
      } else {
        newSet.add(storeId);
      }
      return newSet;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    return `${monthNum}/${year.slice(2)}`;
  };

  // Transform data for recharts
  const chartData = data.months.map((month) => {
    const monthData: any = { month };
    data.stores.forEach((store) => {
      const storeMonthData = store.data.find((d) => d.month === month);
      monthData[store.storeName] = storeMonthData?.revenue || 0;
    });
    return monthData;
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            formatter={(value) => value !== undefined ? formatCurrency(Number(value)) : ''}
            labelFormatter={formatMonth}
          />
          {data.stores
            .filter((store) => !hiddenStores.has(store.storeId))
            .map((store, index) => {
              const originalIndex = data.stores.findIndex((s) => s.storeId === store.storeId);
              return (
                <Line
                  key={store.storeId}
                  type="monotone"
                  dataKey={store.storeName}
                  stroke={COLORS[originalIndex % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              );
            })}
        </LineChart>
      </ResponsiveContainer>
      <CustomLegend
        stores={data.stores}
        hiddenStores={hiddenStores}
        onToggleStore={toggleStore}
      />
    </div>
  );
};

export default StoreTrendsChart;
