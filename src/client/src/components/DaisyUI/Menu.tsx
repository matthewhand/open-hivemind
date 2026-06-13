import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label for the menu item */
  label: string;
  /** Optional icon to display (can be a string emoji or React element) */
  icon?: React.ReactNode;
  /** Optional badge text to display */
  badge?: string;
  /** Whether this item is currently active/selected */
  active?: boolean;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Optional click handler */
  onClick?: (item: MenuItem) => void;
  /** Optional href for navigation */
  href?: string;
  /** Nested submenu items */
  children?: MenuItem[];
  /** Additional CSS classes */
  className?: string;
}

export interface MenuProps {
  /** Array of menu items to display */
  items: MenuItem[];
  /** Menu layout style */
  variant?: 'vertical' | 'horizontal' | 'sidebar' | 'dropdown';
  /** Menu size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the menu is compact */
  compact?: boolean;
  /** Whether to show dividers between items */
  divided?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when a menu item is clicked */
  onItemClick?: (item: MenuItem) => void;
  /** Whether to allow multiple expanded submenus */
  allowMultipleExpanded?: boolean;
}

const Menu: React.FC<MenuProps> = ({
  items,
  variant = 'vertical',
  size = 'md',
  compact = false,
  divided = false,
  className = '',
  onItemClick,
  allowMultipleExpanded = false,
}) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const getMenuClasses = () => {
    const baseClasses = 'menu';
    const variantClasses = {
      vertical: 'menu-vertical',
      horizontal: 'menu-horizontal',
      sidebar: 'menu-vertical',
      dropdown: 'menu-vertical',
    };
    const sizeClasses = {
      sm: 'menu-sm',
      md: '',
      lg: 'menu-lg',
    };

    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${compact ? 'menu-compact' : ''} ${className}`.trim();
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const focusableItems = Array.from(
      e.currentTarget.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')
    ) as HTMLElement[];

    if (!focusableItems.length) return;

    const currentIndex = focusableItems.indexOf(document.activeElement as HTMLElement);

    let nextIndex = currentIndex;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % focusableItems.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + focusableItems.length) % focusableItems.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = focusableItems.length - 1;
    }

    if (nextIndex !== currentIndex && focusableItems[nextIndex]) {
      focusableItems[nextIndex].focus();
    }
  };

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        if (!allowMultipleExpanded) {
          newExpanded.clear();
        }
        newExpanded.add(itemId);
      }
      return newExpanded;
    });
  }, [allowMultipleExpanded]);

  const handleItemClick = (item: MenuItem, event: React.MouseEvent) => {
    event.preventDefault();

    if (item.disabled) {return;}

    // Handle submenu toggle
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.id);
    }

    // Call item-specific handler
    item.onClick?.(item);

    // Call global handler
    onItemClick?.(item);

    // Handle navigation if href is provided
    if (item.href && !item.children?.length) {
      navigate(item.href);
    }
  };

  const renderMenuItem = (item: MenuItem, depth = 0): React.ReactElement => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const itemClasses = [
      'menu-item',
      item.active ? 'menu-item-active' : '',
      item.disabled ? 'menu-item-disabled' : '',
      hasChildren ? 'menu-item-has-children' : '',
      isExpanded ? 'menu-item-expanded' : '',
      item.className || '',
    ].filter(Boolean).join(' ');

    const liClasses = [
      depth > 0 ? 'menu-submenu-item' : '',
      divided && depth === 0 ? 'menu-item-divided' : '',
    ].filter(Boolean).join(' ');

    return (
      <li key={item.id} className={liClasses} role="presentation">
        <a
          href={item.href || '#'}
          className={itemClasses}
          onClick={(e) => handleItemClick(item, e)}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-disabled={item.disabled}
          role="menuitem" aria-haspopup={hasChildren ? 'true' : undefined}
          tabIndex={item.disabled ? -1 : (focusedId === item.id || (!focusedId && items.length > 0 && items[0].id === item.id) ? 0 : -1)}
          onFocus={() => setFocusedId(item.id)}
        >
          {/* Icon */}
          {item.icon && (
            <span className="menu-item-icon" aria-hidden="true">
              {item.icon}
            </span>
          )}

          {/* Label */}
          <span className="menu-item-label">{item.label}</span>

          {/* Badge */}
          {item.badge && (
            <span className="menu-item-badge badge badge-primary badge-sm">
              {item.badge}
            </span>
          )}

          {/* Expand/collapse indicator for submenus */}
          {hasChildren && (
            <span
              className={`menu-item-toggle ${isExpanded ? 'expanded' : ''}`}
              aria-hidden="true"
            >
              ▶
            </span>
          )}
        </a>

        {/* Submenu */}
        {hasChildren && isExpanded && (
          <ul className="menu-submenu" role="menu" aria-label={`${item.label} submenu`}>
            {item.children!.map(child => renderMenuItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul
      className={getMenuClasses()}
      role="menu"
      aria-label="Navigation menu"
      onKeyDown={handleKeyDown}
    >
      {items.map(item => renderMenuItem(item))}
    </ul>
  );
};

export default Menu;