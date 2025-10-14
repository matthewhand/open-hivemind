import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import { useDefaultShortcuts } from '../../hooks/useKeyboardShortcuts';

interface NavItem {
  id: string;
  label: string;
  icon: string;
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
  className = ''
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const shortcuts = useDefaultShortcuts();

  // Auto-expand parent items when route changes
  useEffect(() => {
    const findAndExpandParents = (items: NavItem[], path: string, parentIds: string[] = []): string[] => {
      for (const item of items) {
        if (item.path === path) {
          return parentIds;
        }
        if (item.children) {
          const result = findAndExpandParents(item.children, path, [...parentIds, item.id]);
          if (result.length > 0) return result;
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
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (variant === 'mobile' || variant === 'overlay') {
      onClose();
    }
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = item.path ? (
      location.pathname === item.path || 
      (item.path !== '/' && location.pathname.startsWith(item.path + '/'))
    ) : false;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    
    if (item.divider) {
      return <div key={item.id} className="divider my-2" />;
    }

    return (
      <li key={item.id} className={`${depth > 0 ? 'ml-4' : ''}`}>
        <div className={`
          group flex items-center justify-between rounded-lg p-3 
          transition-all duration-200 ease-in-out
          ${isActive 
            ? 'bg-primary text-primary-content shadow-sm' 
            : item.disabled
              ? 'text-base-content/30 cursor-not-allowed'
              : 'hover:bg-base-200 cursor-pointer'
          }
          ${depth > 0 ? 'text-sm' : 'text-base'}
        `}>
          <div 
            className="flex items-center flex-1 min-w-0"
            onClick={() => {
              if (item.disabled) return;
              if (item.path) {
                handleNavigation(item.path);
              } else if (hasChildren) {
                toggleExpanded(item.id);
              }
            }}
          >
            <span className={`
              text-lg flex-shrink-0 mr-3
              ${isActive ? 'text-primary-content' : 'text-base-content/70'}
              ${item.disabled ? 'opacity-30' : ''}
            `}>
              {item.icon}
            </span>
            <span className="font-medium truncate">{item.label}</span>
            
            {item.badge && (
              <div className={`
                badge badge-sm ml-auto mr-2 flex-shrink-0
                ${isActive ? 'badge-primary-content' : 'badge-primary'}
              `}>
                {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
              </div>
            )}
          </div>
          
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled) {
                  toggleExpanded(item.id);
                }
              }}
              className={`
                btn btn-ghost btn-xs p-1 flex-shrink-0
                ${isActive ? 'text-primary-content hover:text-primary-content' : ''}
                ${item.disabled ? 'opacity-30 cursor-not-allowed' : ''}
              `}
              disabled={item.disabled}
            >
              <span className={`
                transform transition-transform duration-200 inline-block
                ${isExpanded ? 'rotate-90' : ''}
              `}>
                ▶
              </span>
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <ul className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const drawerContent = (
    <aside className={`
      min-h-full bg-base-100 border-r border-base-300
      ${variant === 'mobile' || variant === 'overlay' ? 'w-80' : 'w-72'}
      ${className}
    `}>
      {/* Header */}
      <div className="sticky top-0 bg-base-100 z-10 border-b border-base-300 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-10">
                <span className="text-lg font-bold">H</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold">Hivemind</h1>
              <p className="text-xs text-base-content/60">Admin Dashboard</p>
            </div>
          </div>
          
          {(variant === 'mobile' || variant === 'overlay') && (
            <button 
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Close navigation"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="p-4 border-b border-base-300 bg-base-200/50">
        <BreadcrumbNavigation />
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-base-300">
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => handleNavigation('/admin/bots/create')}
            className="btn btn-primary btn-sm"
            title="Ctrl+N"
          >
            <span className="mr-1">🤖</span>
            New Bot
            <kbd className="kbd kbd-xs ml-1">Ctrl+N</kbd>
          </button>
          <button 
            onClick={() => handleNavigation('/admin/settings')}
            className="btn btn-secondary btn-sm"
            title="Shift+G"
          >
            <span className="mr-1">⚙️</span>
            Settings
            <kbd className="kbd kbd-xs ml-1">Shift+G</kbd>
          </button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="mt-2">
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="btn btn-ghost btn-xs w-full text-left justify-start"
          >
            <span className="mr-1">⌨️</span>
            Keyboard Shortcuts
            <span className={`ml-auto transform transition-transform ${showShortcuts ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {showShortcuts && (
            <div className="mt-2 p-2 bg-base-200 rounded-lg text-xs space-y-1 animate-in slide-in-from-top-1">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-base-content/70">{shortcut.description}</span>
                  <div className="flex gap-1">
                    {shortcut.ctrlKey && <kbd className="kbd kbd-xs">Ctrl</kbd>}
                    {shortcut.shiftKey && <kbd className="kbd kbd-xs">Shift</kbd>}
                    {shortcut.altKey && <kbd className="kbd kbd-xs">Alt</kbd>}
                    <kbd className="kbd kbd-xs">{shortcut.key}</kbd>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(item => renderNavItem(item))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="sticky bottom-0 bg-base-100 border-t border-base-300 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-base-content/60">Version 1.0.0</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-base-content/60">Online</span>
            </div>
            <div className="tooltip tooltip-right" data-tip="Last sync: Just now">
              <div className="w-2 h-2 bg-info rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );

  if (variant === 'mobile' || variant === 'overlay') {
    return (
      <div className={`
        drawer drawer-end 
        ${isOpen ? 'drawer-open' : ''}
      `}>
        <input 
          id="enhanced-drawer-toggle" 
          type="checkbox" 
          className="drawer-toggle" 
          checked={isOpen}
          onChange={() => {}}
        />
        
        <div className="drawer-side">
          <label 
            htmlFor="enhanced-drawer-toggle" 
            aria-label="close sidebar" 
            className="drawer-overlay"
            onClick={onClose}
          />
          {drawerContent}
        </div>
      </div>
    );
  }

  return drawerContent;
};

export default EnhancedDrawer;