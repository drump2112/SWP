import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Tổng doanh thu hôm nay',
      value: '125.500.000đ',
      icon: CurrencyDollarIcon,
      change: '+12.5%',
      changeType: 'increase',
    },
    {
      name: 'Số ca đã chốt',
      value: '8',
      icon: ChartBarIcon,
      change: '+2',
      changeType: 'increase',
    },
    {
      name: 'Số đơn hàng',
      value: '234',
      icon: ShoppingCartIcon,
      change: '+18',
      changeType: 'increase',
    },
    {
      name: 'Khách hàng công nợ',
      value: '12',
      icon: UserGroupIcon,
      change: '-2',
      changeType: 'decrease',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          Xin chào, {user?.fullName}!
        </h2>
        <p className="text-gray-600 mt-1">
          Đây là tổng quan hoạt động hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className="h-8 w-8" style={{ color: '#315eac' }} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stat.value}
                        </div>
                        <div
                          className={`ml-2 flex items-baseline text-sm font-semibold ${
                            stat.changeType === 'increase'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {stat.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Hoạt động gần đây
          </h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start space-x-3 text-sm">
                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-gray-900">Ca {i} đã được chốt thành công</p>
                  <p className="text-gray-500 text-xs mt-1">{i} giờ trước</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Thông báo
          </h3>
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-700">
                Có 3 khách hàng nợ quá hạn cần thu hồi công nợ
              </p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-sm text-blue-700">
                Cập nhật giá xăng dầu mới có hiệu lực từ ngày mai
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
