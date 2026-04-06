import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const dropdownClass = `dropdown ${position === 'top' ? 'dropdown-top' : 'dropdown-bottom'} ${align === 'end' ? 'dropdown-end' : ''} ${className}`;

  if (!mounted) {
    return (
      <div className={dropdownClass}>
        <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle" aria-label="Theme menu">
          <Palette className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className={dropdownClass}>
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-1" aria-label="Theme switcher">
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">Theme</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </div>
      <ul tabIndex={0} className="dropdown-content bg-base-300 rounded-box z-[1] w-56 p-2 shadow-2xl max-h-[calc(100vh-10rem)] overflow-y-auto mt-2 mb-2">
        {AVAILABLE_THEMES.map((t) => (
          <li key={t}>
            <button
              className={`w-full btn btn-sm btn-ghost justify-start gap-2 mb-1 ${theme === t ? 'btn-active' : ''}`}
              onClick={() => {
                setTheme(t);
                // Close dropdown by blurring the active element
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
              data-set-theme={t !== 'auto' ? t : ''}
            >
              <div className="flex items-center justify-between w-full">
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
