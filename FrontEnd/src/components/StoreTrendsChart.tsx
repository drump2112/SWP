import React from 'react';
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
];

const StoreTrendsChart: React.FC<StoreTrendsChartProps> = ({ data, title }) => {
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
      <ResponsiveContainer width="100%" height={350}>
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
          <Legend />
          {data.stores.map((store, index) => (
            <Line
              key={store.storeId}
              type="monotone"
              dataKey={store.storeName}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StoreTrendsChart;
