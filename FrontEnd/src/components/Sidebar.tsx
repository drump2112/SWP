import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ClockIcon,
  UserGroupIcon,
  CubeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  CircleStackIcon,
  WrenchScrewdriverIcon,
  TagIcon,
  DocumentChartBarIcon,
  BanknotesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  roles?: string[]; // Các role được phép truy cập
}

const navigation: NavItem[] = [
  { name: 'Trang chủ', href: '/', icon: HomeIcon },
  {
    name: 'Quản lý ca',
    href: '/shifts',
    icon: ClockIcon,
    roles: ['ADMIN', 'DIRECTOR', 'STORE']
  },
  {
    name: 'Cửa hàng',
    href: '/stores',
    icon: BuildingStorefrontIcon,
    roles: ['ADMIN', 'DIRECTOR']
  },
  {
    name: 'Tài khoản',
    href: '/users',
    icon: UsersIcon,
    roles: ['ADMIN', 'DIRECTOR']
  },
  {
    name: 'Khách hàng',
    href: '/customers',
    icon: UserGroupIcon,
    roles: ['ADMIN', 'DIRECTOR', 'SALES', 'ACCOUNTING']
  },
  {
    name: 'Quản lý sản phẩm',
    href: '/products',
    icon: CubeIcon,
    roles: ['ADMIN', 'DIRECTOR', 'SALES'],
    children: [
      { name: 'Sản phẩm', href: '/products', icon: CubeIcon, roles: ['ADMIN', 'DIRECTOR', 'SALES'] },
      { name: 'Quản lý giá', href: '/prices', icon: TagIcon, roles: ['ADMIN', 'DIRECTOR', 'SALES'] },
    ],
  },
  {
    name: 'Quản lý kho',
    href: '/inventory',
    icon: CircleStackIcon,
    roles: ['ADMIN', 'DIRECTOR', 'STORE'],
    children: [
      { name: 'Nhập kho', href: '/inventory/import', icon: CircleStackIcon, roles: ['ADMIN', 'DIRECTOR', 'STORE'] },
      { name: 'Bồn bể', href: '/tanks', icon: CircleStackIcon, roles: ['ADMIN', 'DIRECTOR'] },
      { name: 'Vòi bơm', href: '/pumps', icon: WrenchScrewdriverIcon, roles: ['ADMIN', 'DIRECTOR'] },
    ],
  },
  {
    name: 'Báo cáo',
    href: '/reports',
    icon: ChartBarIcon,
    roles: ['ADMIN', 'DIRECTOR', 'STORE', 'SALES', 'ACCOUNTING'],
    children: [
      { name: 'Báo cáo công nợ', href: '/reports/debt', icon: DocumentChartBarIcon, roles: ['ADMIN', 'DIRECTOR', 'STORE', 'SALES', 'ACCOUNTING'] },
      { name: 'Hạn mức công nợ', href: '/customers/credit', icon: BanknotesIcon, roles: ['ADMIN', 'DIRECTOR', 'STORE', 'SALES', 'ACCOUNTING'] },
      { name: 'Báo cáo doanh thu', href: '/reports/sales', icon: BanknotesIcon, roles: ['ADMIN', 'DIRECTOR', 'STORE', 'SALES', 'ACCOUNTING'] },
      { name: 'Báo cáo quỹ', href: '/reports/cash', icon: BanknotesIcon, roles: ['ADMIN', 'DIRECTOR', 'STORE', 'ACCOUNTING'] },
    ],
  },
  {
    name: 'Hóa đơn',
    href: '/receipts',
    icon: DocumentTextIcon,
    roles: ['ADMIN', 'DIRECTOR', 'ACCOUNTING']
  },
  {
    name: 'Cài đặt',
    href: '/settings',
    icon: Cog6ToothIcon,
    roles: ['ADMIN']
  },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Hàm kiểm tra xem route hiện tại có thuộc menu không
  const getInitialOpenMenus = () => {
    const openMenus: string[] = [];
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => location.pathname === child.href || location.pathname.startsWith(child.href + '/')
        );
        if (hasActiveChild) {
          openMenus.push(item.name);
        }
      }
    });
    return openMenus;
  };

  const [openMenus, setOpenMenus] = useState<string[]>(getInitialOpenMenus());

  // Hàm kiểm tra quyền truy cập
  const hasPermission = (item: NavItem): boolean => {
    if (!item.roles || item.roles.length === 0) return true; // Nếu không có roles thì mọi người đều truy cập được
    if (!user?.roleCode) return false;
    return item.roles.includes(user.roleCode);
  };

  // Lọc navigation dựa trên quyền
  const filteredNavigation = navigation.filter((item) => {
    if (!hasPermission(item)) return false;

    // Nếu có children, filter children
    if (item.children) {
      item.children = item.children.filter(child => hasPermission(child));
      // Nếu tất cả children đều bị filter, ẩn parent
      if (item.children.length === 0) return false;
    }

    return true;
  });

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const isActive = (href: string, hasChildren: boolean = false) => {
    if (href === '/') {
      return location.pathname === '/';
    }

    // Nếu là menu có children, chỉ active khi exact match với href chính
    if (hasChildren) {
      return location.pathname === href;
    }

    // Kiểm tra xem có item con nào của navigation match với current path không
    const hasChildRoute = navigation.some((nav) => {
      if (nav.children) {
        return nav.children.some(
          (child) => child.href !== href &&
                     (location.pathname === child.href || location.pathname.startsWith(child.href + '/'))
        );
      }
      return false;
    });

    // Nếu có child route match, thì parent không active
    if (hasChildRoute && location.pathname.startsWith(href + '/')) {
      return false;
    }

    // Exact match hoặc starts with + '/'
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div
      className="flex flex-col w-64 min-h-screen shadow-2xl"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #e0f2fe 100%)',
      }}
    >
      {/* Logo Section */}
      <div
        className="flex items-center justify-center px-4 py-3 relative overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 -1px 0 rgba(49, 94, 172, 0.2)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-60" />
        <img src="/logo.png" alt="QLXD System" className="h-10 w-auto drop-shadow-xl relative z-10" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {filteredNavigation.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isMenuOpen = openMenus.includes(item.name);
          const itemActive = isActive(item.href, hasChildren);
          const Icon = item.icon;

          return (
            <div key={item.name}>
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`
                      w-full group flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-lg
                      transition-all duration-200 ease-in-out relative overflow-hidden
                      ${itemActive
                        ? 'text-blue-900 shadow-lg transform scale-[1.02]'
                        : 'text-gray-700 hover:text-blue-900 hover:shadow-md'
                      }
                    `}
                    style={{
                      background: itemActive
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 197, 253, 0.1) 100%)'
                        : 'transparent',
                      backdropFilter: itemActive ? 'blur(10px)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!itemActive) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!itemActive) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {itemActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                    )}
                    <div className="flex items-center">
                      <Icon
                        className={`mr-3 h-6 w-6 transition-transform duration-200 ${
                          itemActive ? 'text-blue-700 scale-110' : 'text-gray-600 group-hover:text-blue-700 group-hover:scale-110'
                        }`}
                      />
                      <span className="tracking-wide">{item.name}</span>
                    </div>
                    <div className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-0' : '-rotate-90'}`}>
                      <ChevronDownIcon className="h-5 w-5" />
                    </div>
                  </button>

                  {/* Submenu with animation */}
                  <div
                    className={`
                      ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out
                      ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                    `}
                  >
                    {item.children && item.children.map((child) => {
                      const childActive = isActive(child.href);
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.name}
                          to={child.href}
                          className={`
                            group flex items-center px-4 py-2.5 text-sm font-medium rounded-lg
                            transition-all duration-200 ease-in-out relative
                            ${childActive
                              ? 'text-blue-900 shadow-md transform translate-x-1'
                              : 'text-gray-600 hover:text-blue-900 hover:translate-x-1'
                            }
                          `}
                          style={{
                            background: childActive
                              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 197, 253, 0.1) 100%)'
                              : 'transparent',
                            borderLeft: childActive ? '3px solid rgba(59, 130, 246, 0.9)' : '3px solid transparent',
                            backdropFilter: childActive ? 'blur(10px)' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.06)';
                              e.currentTarget.style.borderLeft = '3px solid rgba(59, 130, 246, 0.5)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderLeft = '3px solid transparent';
                            }
                          }}
                        >
                          <ChildIcon
                            className={`mr-3 h-5 w-5 transition-transform duration-200 ${
                              childActive ? 'text-blue-700 scale-110' : 'text-gray-600 group-hover:text-blue-700 group-hover:scale-105'
                            }`}
                          />
                          <span className="tracking-wide">{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Link
                  to={item.href}
                  className={`
                    group flex items-center px-4 py-3 text-sm font-semibold rounded-lg
                    transition-all duration-200 ease-in-out relative overflow-hidden
                    ${itemActive
                      ? 'text-blue-900 shadow-lg transform scale-[1.02]'
                      : 'text-gray-700 hover:text-blue-900 hover:shadow-md'
                    }
                  `}
                  style={{
                    background: itemActive
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 197, 253, 0.1) 100%)'
                      : 'transparent',
                    backdropFilter: itemActive ? 'blur(10px)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!itemActive) {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!itemActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {itemActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                  )}
                  <Icon
                    className={`mr-3 h-6 w-6 transition-transform duration-200 ${
                      itemActive ? 'text-blue-700 scale-110' : 'text-gray-600 group-hover:text-blue-700 group-hover:scale-110'
                    }`}
                  />
                  <span className="tracking-wide">{item.name}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer decoration */}
      <div className="h-1" style={{
        background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.6) 50%, rgba(59, 130, 246, 0.3) 100%)',
        boxShadow: '0 -2px 10px rgba(59, 130, 246, 0.2)'
      }} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.6);
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
