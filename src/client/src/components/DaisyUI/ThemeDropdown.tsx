import React, { useEffect, useState, useRef } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';
import useTheme from '../../hooks/useTheme';

const AVAILABLE_THEMES = [
  'light', 'dark', 'auto', 'night', 'dracula', 'cupcake', 'emerald', 
  'corporate', 'synthwave', 'cyberpunk', 'forest', 'aqua', 'business', 
  'coffee', 'dim', 'nord', 'sunset'
];

interface ThemeDropdownProps {
  className?: string;
  position?: 'top' | 'bottom';
  align?: 'start' | 'end';
}

/**
 * A theme controller with an icon-dropdown, identical to the DaisyUI official docs.
 * Provides a live preview of the theme's colors inside the dropdown menu.
 */
const ThemeDropdown: React.FC<ThemeDropdownProps> = ({ 
  className = '',
  position = 'top',
  align = 'end'
}) => {
  const { theme, setTheme } = useTheme();
  // We use standard React state to track if we're mounted to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dropdownClass = `dropdown ${position === 'top' ? 'dropdown-top' : 'dropdown-bottom'} ${align === 'end' ? 'dropdown-end' : ''} ${className}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => {
          const firstItem = listRef.current?.querySelector('button') as HTMLElement | null;
          firstItem?.focus();
        }, 0);
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      (e.currentTarget as HTMLElement).focus();
      return;
    }

    const items = Array.from(listRef.current?.querySelectorAll('button') || []) as HTMLElement[];
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Close the dropdown if focus moves outside of it
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  if (!mounted) {
    return (
      <div className={dropdownClass}>
        <button type="button" className="btn btn-ghost btn-sm btn-circle" aria-label="Theme menu" aria-haspopup="menu" aria-expanded={false}>
          <Palette className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${dropdownClass} ${isOpen ? 'dropdown-open' : ''}`}
      onBlur={handleBlur}
    >
      <button
        type="button"
        className="btn btn-ghost btn-sm gap-1"
        aria-label="Theme switcher"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">Theme</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      <ul
        ref={listRef}
        role="menu"
        className="dropdown-content bg-base-300 rounded-box z-[1] w-56 p-2 shadow-2xl max-h-[calc(100vh-10rem)] overflow-y-auto mt-2 mb-2"
        onKeyDown={handleKeyDown}
      >
        {AVAILABLE_THEMES.map((t) => (
          <li key={t} role="none">
            <button
              type="button"
              role="menuitem"
              className={`w-full btn btn-sm btn-ghost justify-start gap-2 mb-1 ${theme === t ? 'btn-active' : ''}`}
              onClick={() => {
                setTheme(t);
                setIsOpen(false);
              }}
              data-set-theme={t !== 'auto' ? t : ''}
              tabIndex={isOpen ? 0 : -1}
            >
              <div className="flex items-center justify-between w-full pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center">
                    {theme === t && <Check className="w-3 h-3" />}
                  </span>
                  <span className="capitalize">{t}</span>
                </div>
                {t !== 'auto' && (
                  <span className="flex shrink-0 flex-wrap gap-1" data-theme={t}>
                    <span className="bg-primary w-2 h-4 rounded-badge"></span>
                    <span className="bg-secondary w-2 h-4 rounded-badge"></span>
                    <span className="bg-accent w-2 h-4 rounded-badge"></span>
                    <span className="bg-neutral w-2 h-4 rounded-badge"></span>
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ThemeDropdown;
