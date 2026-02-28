/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Hexagon, Sun, Moon } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string | number;
  children?: NavItem[];
  disabled?: boolean;
  divider?: boolean;
}

interface EnhancedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  variant?: 'sidebar' | 'mobile' | 'overlay';
  className?: string;
}

const EnhancedDrawer: React.FC<EnhancedDrawerProps> = ({
  isOpen,
  onClose,
  navItems,
  variant = 'sidebar',
  className = '',
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const findAndExpandParents = (items: NavItem[], path: string, parentIds: string[] = []): string[] => {
      for (const item of items) {
        if (item.path === path) {return parentIds;}
        if (item.children) {
          const result = findAndExpandParents(item.children, path, [...parentIds, item.id]);
          if (result.length > 0) {return result;}
        }
      }
      return [];
    };
    const parentsToExpand = findAndExpandParents(navItems, location.pathname);
    if (parentsToExpand.length > 0) {
      setExpandedItems(new Set(parentsToExpand));
    }
  }, [location.pathname, navItems]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {newSet.delete(itemId);}
      else {newSet.add(itemId);}
      return newSet;
    });
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (variant === 'mobile') {onClose();}
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = item.path && (
      location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path + '/'))
    );
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    if (item.divider) {
      return (
        <div key={item.id} className="pt-4 pb-2 px-4 mt-2">
          {item.label && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
              {item.label}
            </span>
          )}
        </div>
      );
    }

    return (
      <li key={item.id} style={{ marginLeft: depth > 0 ? '12px' : 0 }}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.disabled) {return;}
            if (item.path && item.path.length > 0) {
              handleNavigation(item.path);
            } else if (hasChildren) {
              toggleExpanded(item.id);
            }
          }}
          disabled={item.disabled}
          className={`flex items-center w-full px-3 py-2.5 rounded-lg border-none text-[14px] font-medium text-left transition-colors duration-150 ease-in-out ${
            isActive
              ? 'bg-primary text-primary-content'
              : 'bg-transparent text-base-content hover:bg-base-content/10'
          } ${item.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <span className={`mr-3 ${isActive ? 'text-primary-content' : 'text-base-content/60'}`}>
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ml-2 ${
              isActive ? 'bg-primary-content/20 text-primary-content' : 'bg-primary text-primary-content'
            }`}>
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <span className={`ml-2 ${isActive ? 'text-primary-content' : 'text-base-content/60'}`}>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
        </button>
        {hasChildren && isExpanded && (
          <ul className="list-none m-0 mt-1 p-0">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className={`h-full flex flex-col bg-base-300 text-base-content ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-base-content/10 flex items-center gap-3">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
          <Hexagon size={20} className="text-primary-content" />
        </div>
        <div>
          <div className="font-semibold text-[16px]">Hivemind</div>
          <div className="text-[12px] text-base-content/60">Admin Dashboard</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="list-none m-0 p-0">
          {navItems.map(item => renderNavItem(item))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="py-3 px-4 border-t border-base-content/10 text-[12px] text-base-content/60 flex items-center justify-between">
        <span>v1.0.0</span>
        
        {/* Theme Toggle */}
        <button
          onClick={() => {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('hivemind-theme', newTheme);
          }}
          className="bg-base-content/5 border-none rounded-md py-1.5 px-2.5 cursor-pointer flex items-center gap-1 text-base-content transition-colors duration-150 hover:bg-base-content/10"
          title="Toggle theme"
        >
          <Sun size={14} className="theme-sun hidden" />
          <Moon size={14} />
          <span className="text-[11px]">Theme</span>
        </button>
        
        <span className="flex items-center gap-1.5 text-success">
          <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
          Online
        </span>
      </div>
    </div>
  );
};

export default EnhancedDrawer;
