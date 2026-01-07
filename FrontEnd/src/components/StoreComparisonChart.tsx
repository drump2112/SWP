import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StoreComparisonChartProps {
  data: {
    storeName: string;
    revenue: number;
  }[];
  title?: string;
}

const StoreComparisonChart: React.FC<StoreComparisonChartProps> = ({
  data,
  title,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="storeName"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
            style={{ fontSize: '12px' }}
          />
          <Tooltip formatter={(value) => value !== undefined ? formatCurrency(Number(value)) : ''} />
          <Legend />
          <Bar dataKey="revenue" fill="#315eac" name="Doanh thu" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StoreComparisonChart;
