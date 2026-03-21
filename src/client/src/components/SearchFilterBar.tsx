import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import Input from './DaisyUI/Input';
import Select, { SelectOption } from './DaisyUI/Select';

export interface FilterConfig {
  key: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

export interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  className?: string;
  onClear?: () => void;
  children?: React.ReactNode;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  className = '',
  onClear,
  children
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);

  // Sync local state when external value changes
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  // Debounce the onSearchChange callback
  // ⚡ Bolt Optimization: Added debouncing to search input to reduce expensive re-renders and re-filtering across lists
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [localSearch, searchValue]);

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
    if (onClear) onClear();
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-4 justify-between items-center bg-base-100 p-4 rounded-lg shadow-sm border border-base-200 ${className}`}>
      <div className="w-full sm:flex-1">
        <Input
          placeholder={searchPlaceholder}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          prefix={<Search className="w-4 h-4 text-base-content/50" />}
          className="pl-10 pr-10 w-full"
          size="sm"
          suffix={
            localSearch ? (
              <button
                onClick={handleClearSearch}
                className="btn btn-ghost btn-xs btn-circle pointer-events-auto relative z-10 animate-in fade-in zoom-in duration-200"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            ) : null
          }
        />
      </div>

      {children && (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
          {children}
        </div>
      )}

      {filters.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {filters.map((filter) => (
            <div key={filter.key} className={filter.className || "w-full sm:w-48"}>
              <Select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                options={filter.options}
                size="sm"
                aria-label={filter.ariaLabel || filter.placeholder || `Filter by ${filter.key}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchFilterBar;
