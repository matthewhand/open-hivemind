import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, ArrowRight } from 'lucide-react';
import type { DiffEntry } from '../hooks/useConfigDiff';
import Diff from './DaisyUI/Diff';
import Modal from './DaisyUI/Modal';
import type { ModalAction } from './DaisyUI/Modal';
import { Badge } from './DaisyUI/Badge';
import SimpleTable from './DaisyUI/SimpleTable';

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
          <Diff
            aspectRatio="aspect-auto h-8"
            className="w-full max-w-sm rounded"
            item1={
              <div className="bg-error/20 w-full h-full flex items-center px-2">
                <span className="text-error font-medium truncate">{formatValue(entry.oldValue)}</span>
              </div>
            }
            item2={
              <div className="bg-success/20 w-full h-full flex items-center px-2">
                <span className="text-success font-medium truncate">{formatValue(entry.newValue)}</span>
              </div>
            }
          />
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
    <div className={`collapse collapse-arrow bg-base-200 rounded-lg ${isOpen ? 'collapse-open' : ''}`}>
      <button
        type="button"
        className="collapse-title flex items-center gap-2 px-3 py-2 text-sm font-semibold"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="capitalize">{title}</span>
        <Badge size="sm" variant="ghost" className="ml-auto">{entries.length} change{entries.length !== 1 ? 's' : ''}</Badge>
      </button>
      {isOpen && (
        <div className="collapse-content">
          <SimpleTable compact className="w-full">
            <tbody>
              {entries.map((entry) => (
                <DiffRow key={entry.path} entry={entry} />
              ))}
            </tbody>
          </SimpleTable>
        </div>
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
        <SimpleTable compact className="w-full">
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
        </SimpleTable>
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
  const actions: ModalAction[] = [
    { label: 'Cancel', onClick: onCancel, variant: 'ghost', disabled: loading },
    { label: loading ? 'Saving...' : 'Confirm & Save', onClick: onConfirm, variant: 'primary', loading, disabled: loading },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="lg" actions={actions}>
        <p className="text-sm opacity-70 mb-4">
          You are about to change the following settings:
        </p>

        <ConfigDiffViewer diff={diff} mode="grouped" maxHeight="20rem" />
    </Modal>
  );
};

export default ConfigDiffViewer;
