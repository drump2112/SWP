import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { customersApi, type CreditStatus } from '../api/customers';
import { BanknotesIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import './DebtNotificationBanner.css';

interface DebtNotification {
  customerId: number;
  customerName: string;
  currentDebt: number;
  creditLimit: number;
  status: 'overlimit' | 'warning'; // overlimit: vượt hạn | warning: gần vượt (70-90%)
}

const DebtNotificationBanner: React.FC = () => {
  const { user } = useAuth();
  const [debtNotifications, setDebtNotifications] = useState<DebtNotification[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [overLimitCount, setOverLimitCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    const fetchDebtData = async () => {
      try {
        // Lấy thông tin tín dụng của tất cả khách hàng trong hệ thống (toàn hệ thống)
        const creditStatuses = await customersApi.getAllCreditStatus();

        // Phân loại khách hàng: vượt hạn + gần vượt hạn
        const overLimitCustomers: DebtNotification[] = [];
        const warningCustomers: DebtNotification[] = [];

        creditStatuses.forEach((status: CreditStatus) => {
          if (status.currentDebt > 0) {
            if (status.isOverLimit) {
              // Vượt hạn mức
              overLimitCustomers.push({
                customerId: status.customerId,
                customerName: status.customerName,
                currentDebt: status.currentDebt,
                creditLimit: status.creditLimit,
                status: 'overlimit',
              });
            } else if (status.creditUsagePercent >= 70) {
              // Gần vượt hạn (70-90%)
              warningCustomers.push({
                customerId: status.customerId,
                customerName: status.customerName,
                currentDebt: status.currentDebt,
                creditLimit: status.creditLimit,
                status: 'warning',
              });
            }
          }
        });

        // Sắp xếp theo nợ cao nhất
        overLimitCustomers.sort((a, b) => b.currentDebt - a.currentDebt);
        warningCustomers.sort((a, b) => b.currentDebt - a.currentDebt);

        // Lấy top 10 vượt hạn + top 5 cảnh báo
        const topOverLimit = overLimitCustomers.slice(0, 10);
        const topWarning = warningCustomers.slice(0, 5);

        // Kết hợp và tính tổng nợ
        const allNotifications = [...topOverLimit, ...topWarning];
        const total = allNotifications.reduce((sum, debt) => sum + debt.currentDebt, 0);

        setDebtNotifications(allNotifications);
        setTotalDebt(total);
        setOverLimitCount(overLimitCustomers.length);
        setWarningCount(warningCustomers.length);
      } catch (error) {
        console.error('Error fetching debt data:', error);
      }
    };

    fetchDebtData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchDebtData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (debtNotifications.length === 0) {
    return null;
  }

  // Tạo chuỗi thông báo chạy - tách biệt vượt hạn và cảnh báo
  const overLimitText = debtNotifications
    .filter(d => d.status === 'overlimit')
    .map((debt) => `🔴 VƯỢT HẠN: ${debt.customerName}: ${debt.currentDebt.toLocaleString('vi-VN')}đ`)
    .join(' • ');

  const warningText = debtNotifications
    .filter(d => d.status === 'warning')
    .map((debt) => `⚠️ CẢnh báo: ${debt.customerName}: ${debt.currentDebt.toLocaleString('vi-VN')}đ`)
    .join(' • ');

  const notificationText = [overLimitText, warningText].filter(Boolean).join(' • ');

  return (
    <div className="debt-notification-banner">
      <div className="banner-content">
        {/* Left section - Header info */}
        <div className="banner-header">
          <div className="flex items-center gap-2">
            {overLimitCount > 0 && (
              <>
                <XCircleIcon className="debt-icon text-red-400" />
                <div className="header-text">
                  <p className="header-label">VƯỢT HẠN</p>
                  <p className="header-count text-red-200">{overLimitCount} khách</p>
                </div>
              </>
            )}
            {warningCount > 0 && (
              <>
                <ExclamationTriangleIcon className="debt-icon text-yellow-300" />
                <div className="header-text">
                  <p className="header-label">CẢNH BÁO</p>
                  <p className="header-count text-yellow-100">{warningCount} khách</p>
                </div>
              </>
            )}
          </div>
          <div className="header-divider">
            <BanknotesIcon className="debt-icon" />
            <p className="header-label">TỔNG NỢ</p>
            <p className="header-count">{totalDebt.toLocaleString('vi-VN')}đ</p>
          </div>
        </div>

        {/* Right section - Scrolling text */}
        <div className="banner-scrolling">
          <div className="scrolling-text-container">
            <div className="scrolling-text">
              <span>{notificationText}</span>
              <span className="separator">|</span>
              <span>{notificationText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtNotificationBanner;
