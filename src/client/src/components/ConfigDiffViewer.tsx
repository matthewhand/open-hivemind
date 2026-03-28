import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, ArrowRight } from 'lucide-react';
import type { DiffEntry } from '../hooks/useConfigDiff';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Group diff entries by their top-level key for collapsible sections. */
function groupBySection(entries: DiffEntry[]): Record<string, DiffEntry[]> {
  const groups: Record<string, DiffEntry[]> = {};
  for (const entry of entries) {
    const section = entry.path.includes('.') ? entry.path.split('.')[0] : '_root';
    if (!groups[section]) groups[section] = [];
    groups[section].push(entry);
  }
  return groups;
}

/** Render a value in a human-friendly way. */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '(empty)';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value || '(empty string)';
  if (Array.isArray(value)) return value.length === 0 ? '[]' : value.join(', ');
  return String(value);
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

const DiffBadge: React.FC<{ type: DiffEntry['type'] }> = ({ type }) => {
  const styles: Record<DiffEntry['type'], string> = {
    added: 'badge-success',
    removed: 'badge-error',
    changed: 'badge-warning',
  };
  return <span className={`badge badge-sm ${styles[type]}`}>{type}</span>;
};

const DiffIcon: React.FC<{ type: DiffEntry['type'] }> = ({ type }) => {
  if (type === 'added') return <Plus className="w-3.5 h-3.5 text-success" />;
  if (type === 'removed') return <Minus className="w-3.5 h-3.5 text-error" />;
  return <ArrowRight className="w-3.5 h-3.5 text-warning" />;
};

const DiffRow: React.FC<{ entry: DiffEntry }> = ({ entry }) => {
  const bgClass =
    entry.type === 'added'
      ? 'bg-success/10'
      : entry.type === 'removed'
        ? 'bg-error/10'
        : 'bg-warning/10';

  return (
    <tr className={bgClass}>
      <td className="py-1.5 px-3 text-xs">
        <DiffIcon type={entry.type} />
      </td>
      <td className="py-1.5 px-3 font-mono text-sm">{entry.path}</td>
      <td className="py-1.5 px-3 text-sm">
        <DiffBadge type={entry.type} />
      </td>
      <td className="py-1.5 px-3 text-sm">
        {entry.type === 'added' && (
          <span className="text-success font-medium">{formatValue(entry.newValue)}</span>
        )}
        {entry.type === 'removed' && (
          <span className="text-error line-through">{formatValue(entry.oldValue)}</span>
        )}
        {entry.type === 'changed' && (
          <span>
            <span className="text-error line-through">{formatValue(entry.oldValue)}</span>
            {' '}
            <ArrowRight className="w-3 h-3 inline opacity-50" />
            {' '}
            <span className="text-success font-medium">{formatValue(entry.newValue)}</span>
          </span>
        )}
      </td>
    </tr>
  );
};

interface CollapsibleSectionProps {
  title: string;
  entries: DiffEntry[];
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  entries,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-base-300 rounded-lg overflow-hidden">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-3 py-2 bg-base-200 hover:bg-base-300 transition-colors text-sm font-semibold"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="capitalize">{title}</span>
        <span className="badge badge-sm badge-ghost ml-auto">{entries.length} change{entries.length !== 1 ? 's' : ''}</span>
      </button>
      {isOpen && (
        <table className="table table-compact w-full">
          <tbody>
            {entries.map((entry) => (
              <DiffRow key={entry.path} entry={entry} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export interface ConfigDiffViewerProps {
  /** The diff entries to display. Typically comes from useConfigDiff().diff */
  diff: DiffEntry[];
  /** Display mode: "unified" shows a single table; "grouped" collapses by section */
  mode?: 'unified' | 'grouped';
  /** Optional class name for the root container */
  className?: string;
  /** Max height before the viewer scrolls (CSS value) */
  maxHeight?: string;
}

/**
 * Displays a visual diff between two config snapshots.
 * Highlights added (green), removed (red), and changed (yellow) fields.
 * Supports collapsible sections when nested configs produce many entries.
 */
export const ConfigDiffViewer: React.FC<ConfigDiffViewerProps> = ({
  diff,
  mode = 'grouped',
  className = '',
  maxHeight = '24rem',
}) => {
  if (diff.length === 0) {
    return (
      <div className={`text-sm opacity-60 italic p-4 text-center ${className}`}>
        No changes detected.
      </div>
    );
  }

  if (mode === 'unified') {
    return (
      <div className={`overflow-auto ${className}`} style={{ maxHeight }}>
        <table className="table table-compact w-full">
          <thead>
            <tr className="text-xs uppercase opacity-60">
              <th className="w-8"></th>
              <th>Field</th>
              <th className="w-24">Status</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {diff.map((entry) => (
              <DiffRow key={entry.path} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Grouped mode with collapsible sections
  const groups = groupBySection(diff);
  const sectionNames = Object.keys(groups).sort();

  return (
    <div className={`space-y-2 overflow-auto ${className}`} style={{ maxHeight }}>
      {sectionNames.map((section) => (
        <CollapsibleSection
          key={section}
          title={section === '_root' ? 'General' : section}
          entries={groups[section]}
          defaultOpen={sectionNames.length <= 5}
        />
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Confirmation dialog wrapper                                       */
/* ------------------------------------------------------------------ */

export interface ConfigDiffConfirmDialogProps {
  isOpen: boolean;
  diff: DiffEntry[];
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  loading?: boolean;
}

/**
 * A modal dialog that shows the config diff and asks for confirmation
 * before applying changes.
 */
export const ConfigDiffConfirmDialog: React.FC<ConfigDiffConfirmDialogProps> = ({
  isOpen,
  diff,
  onConfirm,
  onCancel,
  title = 'Confirm Changes',
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm opacity-70 mb-4">
          You are about to change the following settings:
        </p>

        <ConfigDiffViewer diff={diff} mode="grouped" maxHeight="20rem" />

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : null}
            {loading ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onCancel}>close</button>
      </form>
    </dialog>
  );
};

export default ConfigDiffViewer;
