import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100 relative">
      <Sidebar />
      <div className="flex-1 flex flex-col relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <div className="w-full px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
