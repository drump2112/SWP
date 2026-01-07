import React from 'react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/solid';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor = '#315eac',
}) => {
  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8" style={{ color: iconColor }} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {value}
                </div>
                {change !== undefined && (
                  <div
                    className={`ml-2 flex items-baseline text-sm font-semibold ${
                      change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {change >= 0 ? (
                      <ArrowUpIcon className="h-4 w-4 mr-0.5" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 mr-0.5" />
                    )}
                    {formatChange(change)}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
