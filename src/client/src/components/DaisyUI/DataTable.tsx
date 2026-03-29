/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from 'react';
import { useIsBelowBreakpoint } from '../../hooks/useBreakpoint';

// ── Column / row types ──────────────────────────────────────────────────────

export interface Column<T> {
  /** Object key to read from each row */
  key: keyof T;
  /** Display label for the column / card field */
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  /** Custom renderer. Receives the cell value, the full row, and the row index. */
  render?: (value: any, record: T, index: number) => React.ReactNode;
  /** If true this column is shown prominently at the top of a card (mobile view). */
  prominent?: boolean;
  /** Hide this column in card view (e.g. when it is an actions column rendered separately). */
  hideOnCard?: boolean;
  width?: string;
}

/** @deprecated Use Column instead */
export type RDVColumn<T> = Column<T>;

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

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Row-level action buttons (edit, delete, etc.) shown in an actions column / card footer */
  actions?: RowAction<T>[];
  loading?: boolean;
  /** Number of skeleton rows to show while loading (default 5) */
  skeletonRows?: number;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  onRowClick?: (record: T, index: number) => void;
  pagination?: {
    pageSize: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
  };
  /** Controls whether a search box is displayed in the toolbar. */
  searchable?: boolean;
  /** Controls whether an "Export CSV" button is displayed in the toolbar. */
  exportable?: boolean;
  /** Additional CSS classes for the root container. */
  className?: string;
  /** Enables a UI toggle switch to change the table from paginated mode to an IntersectionObserver-driven infinite scroll mode. */
  enableInfiniteScrollToggle?: boolean;
  /** Custom empty-state node rendered when data is empty */
  emptyState?: React.ReactNode;
  /** Unique key extractor. Defaults to index. */
  rowKey?: (record: T, index: number) => string | number;
}

/** @deprecated Use DataTableProps instead */
export type ResponsiveDataViewProps<T> = DataTableProps<T>;

// ── Helpers ─────────────────────────────────────────────────────────────────

const TOUCH_TARGET = 'min-h-[44px] min-w-[44px]';

// ── Component ───────────────────────────────────────────────────────────────

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  actions,
  loading = false,
  skeletonRows = 5,
  selectable = false,
  onSelectionChange,
  onRowClick,
  pagination = { pageSize: 10, showSizeChanger: true, pageSizeOptions: [5, 10, 25, 50, 100] },
  searchable = true,
  exportable = false,
  className = '',
  enableInfiniteScrollToggle = false,
  emptyState,
  rowKey,
}: DataTableProps<T>) => {
  const isMobile = useIsBelowBreakpoint('md');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination.pageSize);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isInfiniteScroll, setIsInfiniteScroll] = useState(false);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Reset page when toggling infinite scroll mode
  React.useEffect(() => {
    if (isInfiniteScroll) {
      setCurrentPage(1);
    }
  }, [isInfiniteScroll]);

  // ── Filtering, searching & sorting ──────────────────────────────────────
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(lowerSearchTerm),
        ),
      );
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter(row =>
          String(row[key]).toLowerCase().includes(filterValue.toLowerCase()),
        );
      }
    });

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, columnFilters, sortField, sortDirection]);

  // ── Pagination ──────────────────────────────────────────────────────────
  const paginatedData = useMemo(() => {
    if (isInfiniteScroll) {
      return filteredData.slice(0, currentPage * pageSize);
    }
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize, isInfiniteScroll]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Prevent out-of-bounds page state when filters reduce total pages
  React.useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Infinite Scroll Observer
  React.useEffect(() => {
    if (!isInfiniteScroll || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentPage < totalPages) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isInfiniteScroll, currentPage, totalPages]);

  // ── Sort / selection handlers ───────────────────────────────────────────
  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map((_, index) => (currentPage - 1) * pageSize + index)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    const globalIndex = (currentPage - 1) * pageSize + index;
    const newSelected = new Set(selectedRows);

    if (checked) {
      newSelected.add(globalIndex);
    } else {
      newSelected.delete(globalIndex);
    }

    setSelectedRows(newSelected);
  };

  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedData = Array.from(selectedRows).map(index => data[index]).filter(Boolean);
      onSelectionChange(selectedData);
    }
  }, [selectedRows, data, onSelectionChange]);

  const exportToCSV = () => {
    const headers = columns.map(col => col.title).join(',');
    const rows = filteredData.map(row =>
      columns.map(col => {
        const value = row[col.key];
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','),
    ).join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resolveKey = (record: T, index: number) =>
    rowKey ? rowKey(record, index) : index;

  // ── Actions renderer ──────────────────────────────────────────────────
  const renderActions = (record: T, index: number, asGroup: boolean) => {
    if (!actions || actions.length === 0) return null;
    const visible = actions.filter(a => !a.hidden?.(record));
    if (visible.length === 0) return null;

    return (
      <div className={asGroup ? 'btn-group flex flex-wrap gap-1' : 'flex gap-1 justify-end'}>
        {visible.map((action, i) => (
          <button
            key={i}
            className={`btn btn-sm ${TOUCH_TARGET} ${
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

  // ── Loading skeletons ─────────────────────────────────────────────────
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
              {selectable && <th><span className="sr-only">Select</span><div className="skeleton h-4 w-4"></div></th>}
              {columns.map((col, index) => (
                <th key={index}><span className="sr-only">{col.title}</span><div className="skeleton h-4 w-24"></div></th>
              ))}
              {actions && actions.length > 0 && <th><span className="sr-only">Actions</span><div className="skeleton h-4 w-16" /></th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <tr key={index}>
                {selectable && <td><div className="skeleton h-4 w-4"></div></td>}
                {columns.map((_, colIndex) => (
                  <td key={colIndex}><div className="skeleton h-4 w-full"></div></td>
                ))}
                {actions && actions.length > 0 && <td><div className="skeleton h-4 w-16" /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (paginatedData.length === 0 && filteredData.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-12 text-base-content/60">
          No data to display.
          {searchTerm && (
            <button className="btn btn-ghost btn-sm ml-2" onClick={() => setSearchTerm('')}>
              Clear search
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Toolbar ───────────────────────────────────────────────────────────
  const toolbar = (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="flex items-center gap-2">
        {searchable && (
          <div className="form-control">
            <input
              type="text"
              placeholder="Search..."
              role="searchbox"
              className="input input-bordered input-sm w-full max-w-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search table data"
            />
          </div>
        )}

        {selectedRows.size > 0 && (
          <div className="badge badge-primary">
            {selectedRows.size} selected
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {enableInfiniteScrollToggle && (
          <div className="form-control mr-4">
            <label className="label cursor-pointer gap-2">
              <span className="label-text text-sm">Infinite Scroll</span>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={isInfiniteScroll}
                onChange={(e) => setIsInfiniteScroll(e.target.checked)}
              />
            </label>
          </div>
        )}

        {exportable && (
          <button
            className="btn btn-outline btn-sm"
            onClick={exportToCSV}
          >
            Export CSV
          </button>
        )}

        <div className="form-control">
          <select
            className="select select-bordered select-sm"
            value={pageSize}
            disabled={isInfiniteScroll}
            aria-label="Rows per page"
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {pagination.pageSizeOptions?.map(size => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  // ── Column Filters ────────────────────────────────────────────────────
  const columnFilterBar = columns.some(col => col.filterable) && (
    <div className="flex flex-wrap gap-2">
      {columns.filter(col => col.filterable).map(col => (
        <div key={String(col.key)} className="form-control">
          <input
            type="text"
            placeholder={`Filter ${col.title}...`}
            className="input input-bordered input-xs w-32"
            value={columnFilters[String(col.key)] || ''}
            onChange={(e) => setColumnFilters(prev => ({
              ...prev,
              [String(col.key)]: e.target.value,
            }))}
          />
        </div>
      ))}
    </div>
  );

  // ── Pagination controls ───────────────────────────────────────────────
  const paginationControls = !isInfiniteScroll && totalPages > 1 && (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-base-content/60">
        Showing {(currentPage - 1) * pageSize + 1} to{' '}
        {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
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

  // ── Card view (mobile) ────────────────────────────────────────────────
  if (isMobile) {
    const prominentCols = columns.filter(c => c.prominent);
    const detailCols = columns.filter(c => !c.prominent && !c.hideOnCard);

    return (
      <div className={`space-y-4 ${className}`}>
        {toolbar}
        {columnFilterBar}
        <div className="space-y-3">
          {paginatedData.map((row, idx) => (
            <div
              key={resolveKey(row, idx)}
              className={`card bg-base-100 shadow-sm border border-base-200 ${onRowClick ? 'cursor-pointer active:bg-base-200' : ''}`}
              onClick={() => onRowClick?.(row, idx)}
              onKeyDown={(e) => { if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRowClick(row, idx); } }}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
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

        {isInfiniteScroll && currentPage < totalPages && (
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            <span className="loading loading-spinner loading-md text-primary" aria-hidden="true"></span>
          </div>
        )}

        {paginationControls}
      </div>
    );
  }

  // ── Table view (desktop) ──────────────────────────────────────────────
  return (
    <div className={`space-y-4 ${className}`}>
      {toolbar}
      {columnFilterBar}

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              {selectable && (
                <th>
                  <label>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </label>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={col.sortable ? 'cursor-pointer hover:bg-base-200' : ''}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                  tabIndex={col.sortable ? 0 : undefined}
                  aria-sort={col.sortable && sortField === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : col.sortable ? 'none' : undefined}
                  aria-label={col.sortable ? `Sort by ${col.title}` : undefined}
                  onKeyDown={(e) => { if (col.sortable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleSort(col.key); } }}
                >
                  <div className="flex items-center gap-2">
                    {col.title}
                    {col.sortable && (
                      <span className="text-xs" aria-hidden="true">
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
            {paginatedData.map((row, index) => (
              <tr
                key={resolveKey(row, index)}
                className={`hover ${onRowClick ? 'cursor-pointer' : ''} ${
                  selectedRows.has((currentPage - 1) * pageSize + index) ? 'bg-primary/10' : ''
                }`}
                onClick={() => onRowClick?.(row, index)}
              >
                {selectable && (
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedRows.has((currentPage - 1) * pageSize + index)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(index, e.target.checked);
                        }}
                      />
                    </label>
                  </td>
                )}
                {columns.map((col) => (
                  <td key={String(col.key)}>
                    {col.render ? col.render(row[col.key], row, index) : String(row[col.key] ?? '')}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td>{renderActions(row, index, false)}</td>
                )}
              </tr>
            ))}

            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions && actions.length > 0 ? 1 : 0)} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-base-content/60">No data found</span>
                    {searchTerm && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSearchTerm('')}
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isInfiniteScroll && currentPage < totalPages && (
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          <span className="loading loading-spinner loading-md text-primary" aria-hidden="true"></span>
        </div>
      )}

      {paginationControls}
    </div>
  );
};

const MemoizedDataTable = React.memo(DataTable) as typeof DataTable;

export default MemoizedDataTable;

/** @deprecated Use DataTable (the default export) instead */
export const ResponsiveDataView = MemoizedDataTable;

/** @deprecated Use DataTable (the default export) instead */
export const Table = MemoizedDataTable;
