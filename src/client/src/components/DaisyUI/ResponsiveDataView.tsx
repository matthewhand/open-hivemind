/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { useIsBelowBreakpoint } from '../../hooks/useBreakpoint';

// ── Column / row types ──────────────────────────────────────────────────────

export interface RDVColumn<T> {
  /** Object key to read from each row */
  key: keyof T;
  /** Display label for the column / card field */
  title: string;
  sortable?: boolean;
  /** Custom renderer. Receives the cell value, the full row, and the row index. */
  render?: (value: any, record: T, index: number) => React.ReactNode;
  /** If true this column is shown prominently at the top of a card. */
  prominent?: boolean;
  /** Hide this column in card view (e.g. when it is an actions column rendered separately). */
  hideOnCard?: boolean;
  width?: string;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (record: T, index: number) => void;
  variant?: 'primary' | 'ghost' | 'error' | 'warning' | 'success';
  /** Return true to hide the action for a specific row */
  hidden?: (record: T) => boolean;
  disabled?: (record: T) => boolean;
  tooltip?: string;
}

export interface ResponsiveDataViewProps<T> {
  data: T[];
  columns: RDVColumn<T>[];
  /** Row-level action buttons (edit, delete, etc.) */
  actions?: RowAction<T>[];
  loading?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
  /** Additional class on the root wrapper */
  className?: string;
  /** Empty-state node rendered when data is empty */
  emptyState?: React.ReactNode;
  /** Unique key extractor. Defaults to index. */
  rowKey?: (record: T, index: number) => string | number;
  /** Pagination settings; omit for no pagination */
  pagination?: {
    pageSize: number;
    pageSizeOptions?: number[];
  };
  /** Show a search box above the data */
  searchable?: boolean;
  onRowClick?: (record: T, index: number) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const TOUCH_TARGET = 'min-h-[44px] min-w-[44px]'; // 44px minimum touch target

// ── Component ───────────────────────────────────────────────────────────────

const ResponsiveDataView = <T extends Record<string, any>>({
  data,
  columns,
  actions,
  loading = false,
  skeletonRows = 5,
  className = '',
  emptyState,
  rowKey,
  pagination,
  searchable = false,
  onRowClick,
}: ResponsiveDataViewProps<T>) => {
  const isMobile = useIsBelowBreakpoint('md');

  // ── Internal state ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination?.pageSize ?? 10);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Filtering & sorting ─────────────────────────────────────────────────
  const processed = useMemo(() => {
    let result = [...data];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(lower)),
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        const av = a[sortField];
        const bv = b[sortField];
        if (av < bv) return sortDirection === 'asc' ? -1 : 1;
        if (av > bv) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortField, sortDirection]);

  const totalPages = pagination ? Math.ceil(processed.length / pageSize) : 1;

  const paginatedData = useMemo(() => {
    if (!pagination) return processed;
    const start = (currentPage - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, currentPage, pageSize, pagination]);

  // Reset page when filters change
  React.useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const key = (record: T, index: number) =>
    rowKey ? rowKey(record, index) : index;

  // ── Actions renderer ────────────────────────────────────────────────────
  const renderActions = (record: T, index: number, asGroup: boolean) => {
    if (!actions || actions.length === 0) return null;
    const visible = actions.filter(a => !a.hidden?.(record));
    if (visible.length === 0) return null;

    const btnSize = asGroup ? 'btn-sm' : 'btn-sm';
    return (
      <div className={asGroup ? 'btn-group flex flex-wrap gap-1' : 'flex gap-1 justify-end'}>
        {visible.map((action, i) => (
          <button
            key={i}
            className={`btn ${btnSize} ${TOUCH_TARGET} ${
              action.variant === 'error'
                ? 'btn-ghost text-error hover:bg-error/10'
                : action.variant === 'warning'
                  ? 'btn-ghost text-warning hover:bg-warning/10'
                  : action.variant === 'primary'
                    ? 'btn-primary'
                    : action.variant === 'success'
                      ? 'btn-ghost text-success hover:bg-success/10'
                      : 'btn-ghost'
            }`}
            onClick={e => {
              e.stopPropagation();
              action.onClick(record, index);
            }}
            disabled={action.disabled?.(record)}
            title={action.tooltip || action.label}
            aria-label={action.label}
          >
            {action.icon}
            {asGroup && <span className="ml-1">{action.label}</span>}
          </button>
        ))}
      </div>
    );
  };

  // ── Loading skeletons ───────────────────────────────────────────────────
  if (loading) {
    if (isMobile) {
      return (
        <div className={`space-y-3 ${className}`}>
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={i} className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body p-4 space-y-2">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i}><div className="skeleton h-4 w-24" /></th>
              ))}
              {actions && actions.length > 0 && <th><div className="skeleton h-4 w-16" /></th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i}>
                {columns.map((_, ci) => (
                  <td key={ci}><div className="skeleton h-4 w-full" /></td>
                ))}
                {actions && actions.length > 0 && <td><div className="skeleton h-4 w-16" /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (paginatedData.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="text-center py-12 text-base-content/60">
        No data to display.
        {searchTerm && (
          <button className="btn btn-ghost btn-sm ml-2" onClick={() => setSearchTerm('')}>
            Clear search
          </button>
        )}
      </div>
    );
  }

  // ── Toolbar (search + page size) ────────────────────────────────────────
  const toolbar = (searchable || pagination) && (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
      {searchable && (
        <input
          type="text"
          placeholder="Search..."
          className="input input-bordered input-sm w-full max-w-xs"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      )}
      {pagination && (
        <select
          className="select select-bordered select-sm"
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          {(pagination.pageSizeOptions ?? [10, 25, 50]).map(s => (
            <option key={s} value={s}>{s} per page</option>
          ))}
        </select>
      )}
    </div>
  );

  // ── Pagination controls ─────────────────────────────────────────────────
  const paginationControls = pagination && totalPages > 1 && (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      <div className="text-sm text-base-content/60">
        Showing {(currentPage - 1) * pageSize + 1} to{' '}
        {Math.min(currentPage * pageSize, processed.length)} of {processed.length}
      </div>
      <div className="join">
        <button
          className={`join-item btn btn-sm ${TOUCH_TARGET}`}
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(1)}
          aria-label="First page"
        >
          &laquo;
        </button>
        <button
          className={`join-item btn btn-sm ${TOUCH_TARGET}`}
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => p - 1)}
          aria-label="Previous page"
        >
          &lsaquo;
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
          if (page > totalPages || page < 1) return null;
          return (
            <button
              key={page}
              className={`join-item btn btn-sm ${TOUCH_TARGET} ${currentPage === page ? 'btn-active' : ''}`}
              onClick={() => setCurrentPage(page)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
        <button
          className={`join-item btn btn-sm ${TOUCH_TARGET}`}
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(p => p + 1)}
          aria-label="Next page"
        >
          &rsaquo;
        </button>
        <button
          className={`join-item btn btn-sm ${TOUCH_TARGET}`}
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(totalPages)}
          aria-label="Last page"
        >
          &raquo;
        </button>
      </div>
    </div>
  );

  // ── Card view (mobile) ──────────────────────────────────────────────────
  if (isMobile) {
    const prominentCols = columns.filter(c => c.prominent);
    const detailCols = columns.filter(c => !c.prominent && !c.hideOnCard);

    return (
      <div className={`space-y-4 ${className}`}>
        {toolbar}
        <div className="space-y-3">
          {paginatedData.map((row, idx) => (
            <div
              key={key(row, idx)}
              className={`card bg-base-100 shadow-sm border border-base-200 ${onRowClick ? 'cursor-pointer active:bg-base-200' : ''}`}
              onClick={() => onRowClick?.(row, idx)}
            >
              <div className="card-body p-4 gap-2">
                {/* Prominent fields */}
                {prominentCols.map(col => (
                  <div key={String(col.key)} className="text-lg font-semibold">
                    {col.render ? col.render(row[col.key], row, idx) : String(row[col.key] ?? '')}
                  </div>
                ))}

                {/* Detail fields with labels */}
                {detailCols.map(col => (
                  <div key={String(col.key)} className="flex justify-between items-center gap-2 text-sm">
                    <span className="text-base-content/60 font-medium shrink-0">{col.title}</span>
                    <span className="text-right truncate">
                      {col.render ? col.render(row[col.key], row, idx) : String(row[col.key] ?? '')}
                    </span>
                  </div>
                ))}

                {/* Actions as button group */}
                {actions && actions.length > 0 && (
                  <div className="card-actions justify-end mt-2 pt-2 border-t border-base-200">
                    {renderActions(row, idx, true)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {paginationControls}
      </div>
    );
  }

  // ── Table view (desktop) ────────────────────────────────────────────────
  return (
    <div className={`space-y-4 ${className}`}>
      {toolbar}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={col.sortable ? 'cursor-pointer hover:bg-base-200' : ''}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.title}
                    {col.sortable && (
                      <span className="text-xs">
                        {sortField === col.key
                          ? sortDirection === 'asc' ? '\u2191' : '\u2193'
                          : '\u2195'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && actions.length > 0 && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={key(row, idx)}
                className={`hover ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row, idx)}
              >
                {columns.map(col => (
                  <td key={String(col.key)}>
                    {col.render ? col.render(row[col.key], row, idx) : String(row[col.key] ?? '')}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td>{renderActions(row, idx, false)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginationControls}
    </div>
  );
};

const MemoizedResponsiveDataView = React.memo(ResponsiveDataView) as typeof ResponsiveDataView;

export default MemoizedResponsiveDataView;
