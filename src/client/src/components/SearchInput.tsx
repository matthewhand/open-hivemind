import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, HelpCircle } from 'lucide-react';

export type SearchMode = 'fuzzy' | 'exact';
export type SearchSize = 'xs' | 'sm' | 'md' | 'lg';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  debounceMs?: number;
  searchMode?: SearchMode;
  size?: SearchSize;
  showResultCount?: boolean;
  showSearchModeHint?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Enhanced search input with debouncing, result count, and search mode indicators
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  resultCount,
  debounceMs = 300,
  searchMode = 'fuzzy',
  size = 'md',
  showResultCount = true,
  showSearchModeHint = true,
  ariaLabel = 'Search',
  disabled = false,
  autoFocus = false,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'xs': return 'input-xs';
      case 'sm': return 'input-sm';
      case 'lg': return 'input-lg';
      default: return 'input-md';
    }
  }, [size]);

  const searchModeHint = searchMode === 'fuzzy'
    ? 'Fuzzy search - matches partial words'
    : 'Exact match - requires complete words';

  const resultText = useMemo(() => {
    if (resultCount === undefined || !localValue) return null;
    return `${resultCount} result${resultCount !== 1 ? 's' : ''} found`;
  }, [resultCount, localValue]);

  return (
    <div className="w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
          <Search className="h-4 w-4" />
        </div>

        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-describedby={resultText ? 'search-results' : undefined}
          className={`input input-bordered w-full pl-10 pr-20 ${sizeClasses}`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showSearchModeHint && (
            <div className="tooltip tooltip-left" data-tip={searchModeHint}>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                aria-label={searchModeHint}
                tabIndex={-1}
              >
                <HelpCircle className="h-3 w-3" />
              </button>
            </div>
          )}

          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="btn btn-ghost btn-xs btn-circle hover:bg-base-200"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showResultCount && resultText && (
        <div
          id="search-results"
          className="text-sm text-base-content/70 mt-1 ml-1 animate-in fade-in duration-200"
          aria-live="polite"
          aria-atomic="true"
        >
          {resultText}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
