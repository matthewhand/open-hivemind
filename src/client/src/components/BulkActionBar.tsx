import React from 'react';
import { Trash2, Download, ToggleLeft, X } from 'lucide-react';
import { LoadingSpinner } from './DaisyUI/Loading';
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

// Static class lookup map for button variants (Tailwind JIT-safe)
const VARIANT_CLASSES: Record<string, string> = {
  error: 'btn btn-sm btn-error',
  warning: 'btn btn-sm btn-warning',
  success: 'btn btn-sm btn-success',
  primary: 'btn btn-sm btn-primary',
  ghost: 'btn btn-sm btn-ghost',
};

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  actions,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="join join-horizontal w-full shadow" role="toolbar" aria-label={`Bulk actions: ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} selected`} aria-live="polite">
      <div className="join-item bg-base-200 px-4 py-2 flex items-center gap-2 font-semibold">
        <Badge variant="primary" size="lg">{selectedCount}</Badge>
        <span>{selectedCount === 1 ? 'item' : 'items'} selected</span>
      </div>

      <div className="join-item flex-1" />

      <div className="join-item flex flex-wrap items-center gap-2 bg-base-200 px-2 py-1">
        {actions.map(action => (
          <button
            key={action.key}
            className={VARIANT_CLASSES[action.variant ?? 'ghost'] ?? 'btn btn-sm btn-ghost'}
            onClick={action.onClick}
            disabled={action.loading}
            aria-busy={action.loading}
          >
            {action.loading ? (
              <LoadingSpinner size="xs" />
            ) : (
              action.icon
            )}
            {action.label}
          </button>
        ))}

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
