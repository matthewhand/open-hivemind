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
        <div key={item.id} style={{ padding: '16px 16px 8px', marginTop: '8px' }}>
          {item.label && (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
            }}>
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
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            background: isActive ? '#3b82f6' : 'transparent',
            color: isActive ? '#ffffff' : '#e2e8f0',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            opacity: item.disabled ? 0.5 : 1,
            fontSize: '14px',
            fontWeight: 500,
            textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {e.currentTarget.style.background = 'rgba(255,255,255,0.1)';}
          }}
          onMouseLeave={(e) => {
            if (!isActive) {e.currentTarget.style.background = 'transparent';}
          }}
        >
          <span style={{ marginRight: '12px', color: isActive ? '#ffffff' : '#94a3b8' }}>
            {item.icon}
          </span>
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge && (
            <span style={{
              background: isActive ? 'rgba(255,255,255,0.2)' : '#3b82f6',
              color: '#ffffff',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '10px',
              marginLeft: '8px',
            }}>
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <span style={{ marginLeft: '8px', color: '#94a3b8' }}>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
        </button>
        {hasChildren && isExpanded && (
          <ul style={{ listStyle: 'none', margin: '4px 0 0 0', padding: 0 }}>
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1e293b',
      color: '#f1f5f9',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: '#3b82f6',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Hexagon size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '16px' }}>Hivemind</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Admin Dashboard</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {navItems.map(item => renderNavItem(item))}
        </ul>
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #334155',
        fontSize: '12px',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
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
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#e2e8f0',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          title="Toggle theme"
        >
          <Sun size={14} style={{ display: 'none' }} className="theme-sun" />
          <Moon size={14} />
          <span style={{ fontSize: '11px' }}>Theme</span>
        </button>
        
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#22c55e',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            background: '#22c55e',
            borderRadius: '50%',
          }}></span>
          Online
        </span>
      </div>
    </div>
  );
};

export default EnhancedDrawer;
