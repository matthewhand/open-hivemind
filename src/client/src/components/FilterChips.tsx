import React from 'react';
import { X } from 'lucide-react';

export interface FilterChip {
  label: string;
  value: string;
  onRemove: () => void;
}

export interface FilterChipsProps {
  filters: FilterChip[];
  onClearAll?: () => void;
}

/**
 * FilterChips component displays active filters as removable badges
 * Used across list pages to show and manage active search/filter state
 */
export const FilterChips: React.FC<FilterChipsProps> = ({ filters, onClearAll }) => {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-2" role="region" aria-label="Active filters">
      <span className="text-sm text-base-content/70">Filters:</span>

      {filters.map((filter, index) => (
        <div
          key={`${filter.label}-${filter.value}-${index}`}
          className="badge badge-primary gap-2"
        >
          <span className="text-sm">
            <span className="font-semibold">{filter.label}:</span> {filter.value}
          </span>
          <button
            onClick={filter.onRemove}
            className="btn btn-ghost btn-xs btn-circle hover:bg-primary-focus"
            aria-label={`Remove ${filter.label} filter`}
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {filters.length > 1 && onClearAll && (
        <button
          onClick={onClearAll}
          className="btn btn-sm btn-ghost"
          aria-label="Clear all filters"
          type="button"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default FilterChips;
