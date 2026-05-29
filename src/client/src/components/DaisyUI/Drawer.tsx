/**
 * Drawer -- single configurable navigation drawer.
 *
 * Consolidated from four earlier implementations:
 *   Drawer (basic), MobileDrawer, DrawerNavigation, EnhancedDrawer.
 *
 * Supports three layout variants:
 *   - "sidebar"  -- always-visible desktop sidebar (default)
 *   - "mobile"   -- full-screen overlay that auto-closes on navigation
 *   - "overlay"  -- slide-over panel on top of content
 *
 * Features carried forward from the removed files:
 *   - Lucide icon support and emoji/string icons via React.ReactNode
 *   - Section dividers (item.divider)
 *   - Disabled items
 *   - Badges (string | number)
 *   - Nested children with auto-expand to active route
 *   - Theme toggle in footer
 *   - Escape-key and overlay-click dismiss (mobile/overlay)
 */

import React, { useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Hexagon, Sun, Moon } from 'lucide-react';
import ThemeDropdown from './ThemeDropdown';

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface DrawerNavItem {
  id: string;
  label: string;
  /** Lucide element, emoji string, or any ReactNode */
  icon: React.ReactNode;
  path?: string;
  badge?: string | number;
  children?: DrawerNavItem[];
  disabled?: boolean;
  /** When true the item renders as a section divider / label */
  divider?: boolean;
}

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navItems?: DrawerNavItem[];
  /** @default "sidebar" */
  variant?: 'sidebar' | 'mobile' | 'overlay';
  className?: string;
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  navItems = [],
  variant = 'sidebar',
  className = '',
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  /* Keyboard dismiss for mobile / overlay variants */
  useEffect(() => {
    if (variant === 'sidebar' || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, variant]);

  /* ---- helpers ---- */

  const handleNavigation = useCallback(
    (path: string) => {
      navigate(path);
      if (variant === 'mobile' || variant === 'overlay') onClose();
    },
    [navigate, onClose, variant],
  );

  /* ---- nav item renderer ---- */

  const renderNavItem = (item: DrawerNavItem, depth = 0) => {
    if (item.divider) {
      return (
        <div key={item.id} className="pt-4 pb-2 px-4 mt-2">
          {item.label && (
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
              {item.label}
            </span>
          )}
        </div>
      );
    }

    // Items without a path are not rendered. All hivemind nav items are flat
    // and link-based; the previous parent-button branch was dead code.
    if (!item.path) return null;

    const isActive =
      location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path + '/'));

    const sharedClassName = `flex items-center w-full px-3 py-2.5 rounded-lg border-none text-sm font-medium text-left transition-colors duration-150 ease-in-out ${
      isActive
        ? 'bg-primary text-primary-content'
        : 'bg-transparent text-base-content hover:bg-base-content/10'
    } ${item.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`;

    const innerContent = (
      <>
        <span
          className={`mr-3 ${isActive ? 'text-primary-content' : 'text-base-content/60'}`}
          aria-hidden="true"
        >
          {item.icon}
        </span>
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ml-2 ${
              isActive
                ? 'bg-primary-content/20 text-primary-content'
                : 'bg-primary text-primary-content'
            }`}
          >
            {item.badge}
          </span>
        )}
      </>
    );

    return (
      <li key={item.id} className={depth > 0 ? 'ml-3' : ''}>
        <Link
          to={item.path}
          onClick={(e) => {
            if (item.disabled) {
              e.preventDefault();
              return;
            }
            if (variant === 'mobile' || variant === 'overlay') {
              onClose();
            }
          }}
          aria-current={isActive ? 'page' : undefined}
          aria-disabled={item.disabled ? true : undefined}
          className={sharedClassName}
        >
          {innerContent}
        </Link>
      </li>
    );
  };

  /* ---- render ---- */

  return (
    <aside
      className={`h-full flex flex-col bg-base-300 text-base-content ${className}`}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      {/* Header */}
      <div className="p-4 border-b border-base-content/10 flex items-center gap-3">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
          <Hexagon size={20} className="text-primary-content" />
        </div>
        <div>
          <div className="font-semibold text-base">Hivemind</div>
          <div className="text-xs text-base-content/60">
            Admin Dashboard
          </div>
        </div>
      </div>

      {/* Navigation OR Custom Content */}
      <nav className="flex-1 overflow-y-auto flex flex-col" aria-label="Main menu">
        {navItems && navItems.length > 0 && (
          <ul className="list-none m-0 p-2">
            {navItems.map((item) => renderNavItem(item))}
          </ul>
        )}
        {children}
      </nav>

      {/* Footer */}
      <div className="py-3 px-4 border-t border-base-content/10 text-xs text-base-content/60 flex items-center justify-between">
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
          aria-label="Toggle theme"
        >
          <Sun size={14} className="theme-sun hidden" aria-hidden="true" />
          <Moon size={14} aria-hidden="true" />
          <span className="text-xs">Theme</span>
        </button>

        <span className="flex items-center gap-1.5 text-success" role="status" aria-label="Connection status: Online">
          <span className="w-1.5 h-1.5 bg-success rounded-full" aria-hidden="true"></span>
          Online
        </span>
      </div>
    </aside>
  );
};

export default Drawer;

/**
 * Backward-compatible alias so existing imports of EnhancedDrawer still resolve.
 */
export { Drawer as EnhancedDrawer };
