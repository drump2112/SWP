import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { customersApi } from '../api/customers';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import './DebtNotificationBanner.css';

interface DebtNotification {
  customerId: number;
  customerName: string;
  currentDebt: number;
}

const DebtNotificationBanner: React.FC = () => {
  const { user } = useAuth();
  const [debtNotifications, setDebtNotifications] = useState<DebtNotification[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);

  useEffect(() => {
    const fetchDebtData = async () => {
      try {
        if (!user?.store?.id) return;

        // Lấy thông tin tín dụng của khách hàng tại store hiện tại
        const creditStatuses = await customersApi.getAllCreditStatus(user.store.id);

        // Lọc khách hàng có nợ (currentDebt > 0) của store hiện tại - sắp xếp theo nợ cao nhất
        const debtCustomers = creditStatuses
          .filter((status) => status.currentDebt > 0)
          .sort((a, b) => b.currentDebt - a.currentDebt)
          .slice(0, 15) // Lấy 15 khách hàng nợ nhiều nhất
          .map((status) => ({
            customerId: status.customerId,
            customerName: status.customerName,
            currentDebt: status.currentDebt,
          }));

        // Tính tổng công nợ
        const total = debtCustomers.reduce((sum, debt) => sum + debt.currentDebt, 0);

        setDebtNotifications(debtCustomers);
        setTotalDebt(total);
      } catch (error) {
        console.error('Error fetching debt data:', error);
      }
    };

    fetchDebtData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchDebtData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.store?.id]);

  if (debtNotifications.length === 0) {
    return null;
  }

  // Tạo chuỗi thông báo chạy
  const notificationText = debtNotifications
    .map(
      (debt) =>
        `${debt.customerName}: ${debt.currentDebt.toLocaleString('vi-VN')}đ`
    )
    .join(' • ');

  return (
    <div className="debt-notification-banner">
      <div className="banner-content">
        {/* Left section - Header info */}
        <div className="banner-header">
          <BanknotesIcon className="debt-icon" />
          <div className="header-text">
            <p className="header-label">Thu hồi công nợ</p>
            <p className="header-count">{debtNotifications.length} khách - Tổng: <span className="font-bold">{totalDebt.toLocaleString('vi-VN')}đ</span></p>
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
