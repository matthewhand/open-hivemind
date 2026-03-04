import React from 'react';
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

const CHIP_EXIT_DURATION_MS = 200;

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  className = '',
  onClear,
  children
}) => {
  const [removingFilter, setRemovingFilter] = React.useState<string | null>(null);

  const activeFilters = filters.filter((f) => f.value && f.value !== 'all' && f.value !== '');
  const activeFilterCount = activeFilters.length;


  const handleClearFilter = (filter: FilterConfig) => {
    setRemovingFilter(filter.key);
    setTimeout(() => {
      const defaultOption = filter.options.find((o) => o.value === 'all' || o.value === '');
      filter.onChange(defaultOption ? (defaultOption.value as string) : '');
      setRemovingFilter(null);
    }, CHIP_EXIT_DURATION_MS); // Wait for exit animation
  };

  const handleClearSearch = () => {
    onSearchChange('');
    if (onClear) onClear();
  };

  return (
    <div className="flex flex-col w-full">
      <div className={`flex flex-col sm:flex-row gap-4 justify-between items-center bg-base-100 p-4 rounded-lg shadow-sm border border-base-200 ${className}`}>
      <div className="w-full sm:flex-1">
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          prefix={
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-base-content/50" />
              {activeFilterCount > 0 && (
                <span className="badge badge-primary badge-xs">
                  {activeFilterCount} active
                </span>
              )}
            </div>
          }
          className="pl-10 pr-10 w-full"
          size="sm"
          suffix={
            searchValue ? (
              <button
                onClick={handleClearSearch}
                className="btn btn-ghost btn-xs btn-circle pointer-events-auto relative z-10"
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

      {/* Active Filter Chips */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 empty:hidden">
          {activeFilters.map((filter) => {
              const selectedOption = filter.options.find((o) => o.value === filter.value);
              const label = selectedOption ? selectedOption.label : filter.value;
              const isRemoving = removingFilter === filter.key;

              return (
                <div
                  key={filter.key}
                  tabIndex={0}
                  role="button"
                  aria-label={`Active filter: ${filter.key} ${label}. Press Enter or Space to clear.`}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isRemoving) {
                      e.preventDefault();
                      handleClearFilter(filter);
                    }
                  }}
                  className={`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                    bg-primary/10 text-primary border border-primary/20
                    transition-all duration-${CHIP_EXIT_DURATION_MS} ease-in-out transform origin-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-base-100
                    ${isRemoving ? 'opacity-0 scale-50 -ml-4 whitespace-nowrap pointer-events-none' : 'opacity-100 scale-100 cursor-pointer hover:bg-primary/20'}
                  `}
                  onClick={() => !isRemoving && handleClearFilter(filter)}
                >
                  <span className="opacity-70 capitalize">{filter.key}:</span>
                  <span>{label}</span>
                  <div className="rounded-full p-0.5 ml-1 transition-colors group-hover:bg-primary/30">
                    <X className="w-3 h-3 pointer-events-none" />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default SearchFilterBar;
