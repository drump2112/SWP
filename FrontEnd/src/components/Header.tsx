import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightOnRectangleIcon, UserCircleIcon, Bars3Icon, XCircleIcon, ExclamationTriangleIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import { customersApi, type CreditStatus } from '../api/customers';
import './Header.css';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [overLimitCount, setOverLimitCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [debtNotifications, setDebtNotifications] = useState<any[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);

  useEffect(() => {
    const fetchDebtData = async () => {
      try {
        // Nếu user là tài khoản cửa hàng, chỉ lấy khách hàng của cửa hàng đó
        const storeId = user?.store?.id;
        const creditStatuses = await customersApi.getAllCreditStatus(storeId);

        // Ensure creditStatuses is an array (API might return HTML on error)
        if (!Array.isArray(creditStatuses)) {
          console.error('API returned invalid data. Backend may not be running or endpoint not found.');
          return;
        }

        let overLimitCounter = 0;
        let warningCounter = 0;
        const overLimitCustomers: any[] = [];
        const warningCustomers: any[] = [];

        creditStatuses.forEach((status: CreditStatus) => {
          if (status.currentDebt > 0) {
            if (status.isOverLimit) {
              overLimitCounter++;
              overLimitCustomers.push({
                customerId: status.customerId,
                customerName: status.customerName,
                currentDebt: status.currentDebt,
                creditLimit: status.creditLimit,
                status: 'overlimit',
              });
            } else if (status.creditUsagePercent >= 70) {
              warningCounter++;
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

        overLimitCustomers.sort((a, b) => b.currentDebt - a.currentDebt);
        warningCustomers.sort((a, b) => b.currentDebt - a.currentDebt);

        const topOverLimit = overLimitCustomers.slice(0, 10);
        const topWarning = warningCustomers.slice(0, 5);
        const allNotifications = [...topOverLimit, ...topWarning];
        const total = allNotifications.reduce((sum, debt) => sum + debt.currentDebt, 0);

        setOverLimitCount(overLimitCounter);
        setWarningCount(warningCounter);
        setDebtNotifications(allNotifications);
        setTotalDebt(total);
      } catch (error) {
        console.error('Error fetching debt data:', error);
      }
    };

    fetchDebtData();
    const interval = setInterval(fetchDebtData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Xác nhận đăng xuất',
      text: 'Bạn có chắc chắn muốn đăng xuất?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Đăng xuất',
      cancelButtonText: 'Hủy',
    });

    if (result.isConfirmed) {
      logout();
      navigate('/login');
    }
  };

  // Debug: Log user data to check store info
  console.log('🔍 User data:', user);

  // Tạo chuỗi thông báo chạy - tách biệt vượt hạn và cảnh báo
  const overLimitText = debtNotifications
    .filter(d => d.status === 'overlimit')
    .map((debt) => `🔴 VƯỢT HẠN: ${debt.customerName}: ${debt.currentDebt.toLocaleString('vi-VN')}đ`)
    .join(' • ');

  const warningText = debtNotifications
    .filter(d => d.status === 'warning')
    .map((debt) => `⚠️ CẢNH BÁO: ${debt.customerName}: ${debt.currentDebt.toLocaleString('vi-VN')}đ`)
    .join(' • ');

  const notificationText = [overLimitText, warningText].filter(Boolean).join(' • ');

  return (
    <>
      <header className="bg-white border-b-2 border-gray-200 shadow-md relative z-20">
        <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6">
          {/* Mobile menu button + Title */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {/* Hamburger menu - only on mobile */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Mở menu"
            >
              <Bars3Icon className="h-6 w-6 text-gray-600" />
            </button>

            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-base sm:text-2xl font-bold truncate">
                <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">TÂY NAM</span>
                <span className="text-gray-400 mx-1 sm:mx-2 hidden xs:inline">-</span>
                <span className="bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent hidden sm:inline"> - CHI NHÁNH ĐỐNG ĐA</span>
              </h1>
            </div>
          </div>

          {/* User info + Logout */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Scrolling notification text */}
            {debtNotifications.length > 0 && (
              <div className="header-scrolling-container">
                <div className="header-scrolling-text">
                  <span>{notificationText}</span>
                  <span className="separator">|</span>
                  <span>{notificationText}</span>
                </div>
              </div>
            )}

            {/* Debt notifications - moved to right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {overLimitCount > 0 && (
                <div className="debt-badge debt-badge-overLimit">
                  <XCircleIcon className="debt-badge-icon" />
                  <div className="hidden sm:block">
                    <p className="debt-badge-label">VƯỢT HẠN</p>
                    <p className="debt-badge-count">{overLimitCount} khách</p>
                  </div>
                  <p className="sm:hidden debt-badge-label">{overLimitCount}</p>
                </div>
              )}
              {warningCount > 0 && (
                <div className="debt-badge debt-badge-warning">
                  <ExclamationTriangleIcon className="debt-badge-icon" />
                  <div className="hidden sm:block">
                    <p className="debt-badge-label">CẢNH BÁO</p>
                    <p className="debt-badge-count">{warningCount} khách</p>
                  </div>
                  <p className="sm:hidden debt-badge-label">{warningCount}</p>
                </div>
              )}
            </div>

            {/* User info - simplified on mobile */}
            <div className="hidden sm:flex items-center text-sm bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 shadow-sm">
              <UserCircleIcon className="h-9 w-9 text-gray-600 mr-3" />
              <div>
                <p className="font-semibold text-gray-800">{user?.fullName}</p>
                <p className="text-gray-500 text-xs font-medium">
                  {user?.store ? user.store.name : user?.roleCode}
                </p>
              </div>
            </div>

            {/* Mobile: just icon */}
            <div className="sm:hidden flex items-center">
              <UserCircleIcon className="h-8 w-8 text-gray-600" />
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg shadow-md transition-all duration-200"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile notification banner - shown only on mobile */}
      {debtNotifications.length > 0 && (
        <div className="mobile-notification-banner">
          <div className="mobile-notification-content">
            <div className="mobile-scrolling-container">
              <div className="mobile-scrolling-text">
                <span>{notificationText}</span>
                <span className="separator">|</span>
                <span>{notificationText}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
