/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
  children?: NavItem[];
}

interface DrawerNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

const DrawerNavigation: React.FC<DrawerNavigationProps> = ({ isOpen, onClose, navItems }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = location.pathname === item.path;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <li key={item.id} className={`${depth > 0 ? 'ml-4' : ''}`}>
        <div className={`
          flex items-center justify-between rounded-lg p-2 
          ${isActive ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}
          transition-colors duration-200
        `}>
          <div 
            className="flex items-center flex-1 cursor-pointer"
            onClick={() => item.path ? handleNavigation(item.path) : toggleExpanded(item.id)}
          >
            <span className={`text-xl mr-3 ${item.icon}`} />
            <span className="text-sm font-medium">{item.label}</span>
            {item.badge && (
              <div className="badge badge-primary badge-sm ml-auto mr-2">
                {item.badge}
              </div>
            )}
          </div>
          
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
              className="btn btn-ghost btn-xs"
            >
              <span className={`transform transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`}>
                ▶
              </span>
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <ul className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="drawer">
      <input 
        id="drawer-toggle" 
        type="checkbox" 
        className="drawer-toggle" 
        checked={isOpen}
        onChange={() => {}}
      />
      
      <div className="drawer-content">
        {/* Main content goes here */}
      </div>
      
      <div className="drawer-side">
        <label 
          htmlFor="drawer-toggle" 
          aria-label="close sidebar" 
          className="drawer-overlay"
          onClick={onClose}
        />
        
        <aside className="min-h-full w-80 bg-base-100 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="avatar">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-content font-bold text-sm">H</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-bold">Hivemind</h1>
                <p className="text-xs text-base-content/60">Admin Dashboard</p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Close navigation"
            >
              ✕
            </button>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm flex-1">
                <span className="📱">📱</span>
                New Bot
              </button>
              <button className="btn btn-secondary btn-sm flex-1">
                <span className="⚙️">⚙️</span>
                Settings
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav>
            <ul className="space-y-1">
              {navItems.map(item => renderNavItem(item))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="divider"></div>
            <div className="flex items-center justify-between text-xs text-base-content/60">
              <span>Version 1.0.0</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

// Default navigation items for Hivemind
export const defaultNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/admin',
  },
  {
    id: 'bots',
    label: 'Bot Management',
    icon: '🤖',
    path: '/admin/bots',
    badge: '3',
    children: [
      {
        id: 'bots-list',
        label: 'All Bots',
        icon: '📋',
        path: '/admin/bots',
      },
      {
        id: 'bots-create',
        label: 'Create Bot',
        icon: '➕',
        path: '/admin/bots/create',
      },
      {
        id: 'bots-templates',
        label: 'Templates',
        icon: '📝',
        path: '/admin/bots/templates',
      },
    ],
  },
  {
    id: 'mcp',
    label: 'MCP Servers',
    icon: '🔧',
    path: '/admin/mcp',
    children: [
      {
        id: 'mcp-servers',
        label: 'Servers',
        icon: '🖥️',
        path: '/admin/mcp/servers',
      },
      {
        id: 'mcp-tools',
        label: 'Tools',
        icon: '🛠️',
        path: '/admin/mcp/tools',
      },
    ],
  },
  {
    id: 'activity',
    label: 'Activity Monitor',
    icon: '📈',
    path: '/admin/activity',
    badge: 'NEW',
  },
  {
    id: 'personas',
    label: 'Personas',
    icon: '🎭',
    path: '/admin/personas',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    path: '/admin/settings',
    children: [
      {
        id: 'settings-general',
        label: 'General',
        icon: '🔧',
        path: '/admin/settings/general',
      },
      {
        id: 'settings-security',
        label: 'Security',
        icon: '🔒',
        path: '/admin/settings/security',
      },
      {
        id: 'settings-integrations',
        label: 'Integrations',
        icon: '🔗',
        path: '/admin/settings/integrations',
      },
    ],
  },
];

export default DrawerNavigation;