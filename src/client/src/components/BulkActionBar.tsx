import React from 'react';
import { Trash2, Download, ToggleLeft, X } from 'lucide-react';
import { Badge } from './DaisyUI/Badge';

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'error' | 'warning' | 'success' | 'primary' | 'ghost';
  onClick: () => void;
  loading?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
}

/**
 * A DaisyUI-styled action bar that appears when items are selected in a list.
 * Shows the selected count, action buttons, and a clear-selection button.
 */
const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  actions,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="alert alert-info shadow-md flex flex-wrap items-center gap-2" role="toolbar" aria-label={`Bulk actions: ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} selected`} aria-live="polite">
      <div className="flex items-center gap-2 font-semibold">
        <Badge variant="primary" size="lg">{selectedCount}</Badge>
        <span>{selectedCount === 1 ? 'item' : 'items'} selected</span>
      </div>

      <div className="flex-1" />

      <div className="flex flex-wrap items-center gap-2">
        {actions.map(action => {
          const btnClass = action.variant
            ? `btn btn-sm btn-${action.variant}`
            : 'btn btn-sm btn-ghost';
          return (
            <button
              key={action.key}
              className={btnClass}
              onClick={action.onClick}
              disabled={action.loading}
              aria-busy={action.loading}
            >
              {action.loading ? (
                <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              ) : (
                action.icon
              )}
              {action.label}
            </button>
          );
        })}

        <button
          className="btn btn-sm btn-ghost"
          onClick={onClearSelection}
          title="Clear selection"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  );
};

export { Trash2 as BulkDeleteIcon, Download as BulkExportIcon, ToggleLeft as BulkToggleIcon };
export default BulkActionBar;
