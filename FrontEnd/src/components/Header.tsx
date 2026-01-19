import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightOnRectangleIcon, UserCircleIcon, Bars3Icon } from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Debug: Log user data to check store info
  console.log('🔍 User data:', user);

  return (
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

          <h1 className="text-base sm:text-2xl font-bold truncate">
            <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">TÂY NAM</span>
            <span className="text-gray-400 mx-1 sm:mx-2 hidden xs:inline">-</span>
            <span className="bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent hidden sm:inline">CHI NHÁNH ĐỐNG ĐA</span>
          </h1>
        </div>

        {/* User info + Logout */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
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
  );
};

export default Header;
