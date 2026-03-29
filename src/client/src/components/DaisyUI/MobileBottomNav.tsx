/**
 * MobileBottomNav - Bottom tab bar navigation for mobile devices
 * Provides quick access to main sections with touch-friendly targets
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Bot, Settings, Activity, LayoutGrid } from 'lucide-react';

interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

interface MobileBottomNavProps {
  items?: MobileNavItem[];
  className?: string;
}

const defaultNavItems: MobileNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <Home className="w-5 h-5" />,
    path: '/admin/overview',
  },
  {
    id: 'bots',
    label: 'Bots',
    icon: <Bot className="w-5 h-5" />,
    path: '/admin/bots',
  },
  {
    id: 'providers',
    label: 'Providers',
    icon: <LayoutGrid className="w-5 h-5" />,
    path: '/admin/providers',
  },
  {
    id: 'monitoring',
    label: 'Activity',
    icon: <Activity className="w-5 h-5" />,
    path: '/admin/monitoring',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    path: '/admin/settings',
  },
];

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  items = defaultNavItems,
  className = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 bg-base-300 border-t border-base-content/10 safe-area-inset-bottom ${className}`}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] min-w-[44px] relative ${
                active
                  ? 'text-primary bg-primary/10'
                  : 'text-base-content/60 hover:text-base-content hover:bg-base-content/5'
              }`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1/4 badge badge-xs badge-primary">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              <span className="flex items-center justify-center">{item.icon}</span>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
