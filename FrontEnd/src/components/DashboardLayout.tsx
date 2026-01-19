import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ScrollToTop from './ScrollToTop';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, shown when menu is open */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <div className="w-full px-2 sm:px-4 py-4 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Scroll to top button */}
      <ScrollToTop />
    </div>
  );
};

export default DashboardLayout;
