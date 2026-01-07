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

interface RevenueChartProps {
  data: {
    month: string;
    revenue: number;
  }[];
  title?: string;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, title }) => {
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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#315eac"
            strokeWidth={2}
            name="Doanh thu"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
