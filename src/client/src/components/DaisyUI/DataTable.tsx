/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from 'react';

interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  onRowClick?: (record: T, index: number) => void;
  pagination?: {
    pageSize: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
  };
  searchable?: boolean;
  exportable?: boolean;
  className?: string;
}

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  selectable = false,
  onSelectionChange,
  onRowClick,
  pagination = { pageSize: 10, showSizeChanger: true, pageSizeOptions: [5, 10, 25, 50, 100] },
  searchable = true,
  exportable = false,
  className = '',
}: DataTableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination.pageSize);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase()),
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
        
        if (aValue < bValue) {return sortDirection === 'asc' ? -1 : 1;}
        if (aValue > bValue) {return sortDirection === 'asc' ? 1 : -1;}
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, columnFilters, sortField, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

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

  if (loading) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              {selectable && <th><div className="skeleton h-4 w-4"></div></th>}
              {columns.map((col, index) => (
                <th key={index}><div className="skeleton h-4 w-24"></div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: pageSize }).map((_, index) => (
              <tr key={index}>
                {selectable && <td><div className="skeleton h-4 w-4"></div></td>}
                {columns.map((_, colIndex) => (
                  <td key={colIndex}><div className="skeleton h-4 w-full"></div></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="form-control">
              <input
                type="text"
                placeholder="Search..."
                className="input input-bordered input-sm w-full max-w-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
          {exportable && (
            <button 
              className="btn btn-outline btn-sm"
              onClick={exportToCSV}
            >
              📥 Export CSV
            </button>
          )}
          
          <div className="form-control">
            <select
              className="select select-bordered select-sm"
              value={pageSize}
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

      {/* Column Filters */}
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

      {/* Table */}
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
                >
                  <div className="flex items-center gap-2">
                    {col.title}
                    {col.sortable && (
                      <span className="text-xs">
                        {sortField === col.key ? (
                          sortDirection === 'asc' ? '↑' : '↓'
                        ) : '↕️'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr 
                key={index}
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
                    {col.render ? col.render(row[col.key], row, index) : String(row[col.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
            
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📭</span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-base-content/60">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
          </div>

          <div className="join">
            {/* First page button */}
            <button
              className="join-item btn btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              aria-label="First page"
            >
              ❮❮
            </button>

            {/* Previous page button */}
            <button
              className="join-item btn btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              aria-label="Previous page"
            >
              ❮
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              if (page > totalPages) {return null;}

              return (
                <button
                  key={page}
                  className={`join-item btn btn-sm ${currentPage === page ? 'btn-active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                  aria-label={`Page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}

            {/* Next page button */}
            <button
              className="join-item btn btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              aria-label="Next page"
            >
              ❯
            </button>

            {/* Last page button */}
            <button
              className="join-item btn btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              aria-label="Last page"
            >
              ❯❯
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const MemoizedDataTable = React.memo(DataTable) as typeof DataTable;

export default MemoizedDataTable;
