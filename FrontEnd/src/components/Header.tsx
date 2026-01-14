import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const Header: React.FC = () => {
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
      <div className="flex items-center justify-between h-16 px-6">
        <h1 className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">TÂY NAM</span>
          <span className="text-gray-400 mx-2">-</span>
          <span className="bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent">CHI NHÁNH ĐỐNG ĐA</span>
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 shadow-sm">
            <UserCircleIcon className="h-9 w-9 text-gray-600 mr-3" />
            <div>
              <p className="font-semibold text-gray-800">{user?.fullName}</p>
              <p className="text-gray-500 text-xs font-medium">
                {user?.store ? user.store.name : user?.roleCode}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
