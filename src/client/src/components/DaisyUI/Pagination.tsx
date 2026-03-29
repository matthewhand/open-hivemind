import React, { useMemo, useRef, useState, useEffect } from 'react';

type PaginationStyle = 'compact' | 'standard' | 'extended';

/**
 * Configuration properties for the Pagination component.
 */
interface PaginationProps {
  /** The currently active page number, starting from 1. */
  currentPage: number;
  /** The total number of items across all pages. */
  totalItems: number;
  /** The number of items displayed per page. Defaults to 10. */
  pageSize?: number;
  /** Callback triggered when a user selects a new page. */
  onPageChange: (page: number) => void;
  /** Callback triggered when items per page changes. */
  onPageSizeChange?: (pageSize: number) => void;
  /** The visual style of the pagination (compact, standard, or extended). */
  style?: PaginationStyle;
  /** Additional CSS classes for the root container. */
  className?: string;
  /** Explicit override for the maximum number of visible page buttons before truncating with ellipsis. */
  maxVisiblePages?: number;
  /** Show items-per-page selector. Defaults to true. */
  showPageSizeSelector?: boolean;
  /** Available page size options. Defaults to [10, 25, 50, 100]. */
  pageSizeOptions?: number[];
  /** Show "X-Y of Z items" text. Defaults to true. */
  showItemsInfo?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  style = 'standard',
  className = '',
  maxVisiblePages: explicitMaxVisiblePages,
  showPageSizeSelector = true,
  pageSizeOptions = [10, 25, 50, 100],
  showItemsInfo = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicMaxVisiblePages, setDynamicMaxVisiblePages] = useState(7);
  const totalPages = Math.ceil(totalItems / pageSize);
  const maxVisiblePages = explicitMaxVisiblePages || dynamicMaxVisiblePages;

  useEffect(() => {
    if (explicitMaxVisiblePages || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width < 350) {
          setDynamicMaxVisiblePages(5); // Ultra compact
        } else if (width < 500) {
          setDynamicMaxVisiblePages(7); // Standard
        } else {
          setDynamicMaxVisiblePages(9); // Extended space
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [explicitMaxVisiblePages]);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  const handleLast = () => {
    if (currentPage !== totalPages) {
      onPageChange(totalPages);
    }
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) {
      return totalPages === 1 ? [1] : [];
    }

    const pages: (number | '...prev' | '...next')[] = [];

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxVisiblePages / 2);
      const isNearStart = currentPage <= half + 1;
      const isNearEnd = currentPage >= totalPages - half;

      pages.push(1);

      if (isNearStart) {
        for (let i = 2; i <= maxVisiblePages - 2; i++) {
          pages.push(i);
        }
        pages.push('...next');
        pages.push(totalPages);
      } else if (isNearEnd) {
        pages.push('...prev');
        for (let i = totalPages - (maxVisiblePages - 3); i <= totalPages - 1; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      } else {
        pages.push('...prev');
        const middleItemsCount = maxVisiblePages - 4;
        const offsetLeft = Math.floor((middleItemsCount - 1) / 2);
        const offsetRight = Math.ceil((middleItemsCount - 1) / 2);
        for (let i = currentPage - offsetLeft; i <= currentPage + offsetRight; i++) {
          pages.push(i);
        }
        pages.push('...next');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [totalPages, currentPage, maxVisiblePages]);

  /**
   * Navigates backward by 5 pages, ensuring it does not drop below page 1.
   * @sideeffects Calls `onPageChange` with the new page number.
   */
  const handleJumpPrev = () => {
    onPageChange(Math.max(1, currentPage - 5));
  };

  /**
   * Navigates forward by 5 pages, ensuring it does not exceed `totalPages`.
   * @sideeffects Calls `onPageChange` with the new page number.
   */
  const handleJumpNext = () => {
    onPageChange(Math.min(totalPages, currentPage + 5));
  };

  /**
   * Enables keyboard arrow navigation when the component is focused.
   * @param {React.KeyboardEvent<HTMLDivElement>} e - The keyboard event object.
   * @sideeffects Calls `handlePrevious` or `handleNext` depending on the arrow key.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  // Calculate range for "X-Y of Z items"
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalPages <= 1 && !showPageSizeSelector && !showItemsInfo) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 w-full ${className}`}>
      {/* Left side: Items info and page size selector */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {showItemsInfo && totalItems > 0 && (
          <div className="text-sm text-base-content/70">
            Showing <span className="font-semibold">{startItem}</span> to{' '}
            <span className="font-semibold">{endItem}</span> of{' '}
            <span className="font-semibold">{totalItems}</span> items
          </div>
        )}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size-select" className="text-sm text-base-content/70">
              Per page:
            </label>
            <select
              id="page-size-select"
              className="select select-bordered select-sm"
              value={pageSize}
              onChange={(e) => {
                const newPageSize = Number(e.target.value);
                onPageSizeChange(newPageSize);
                // Adjust current page if necessary to avoid empty page
                const newTotalPages = Math.ceil(totalItems / newPageSize);
                if (currentPage > newTotalPages && newTotalPages > 0) {
                  onPageChange(newTotalPages);
                }
              }}
              aria-label="Items per page"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Pagination controls */}
      {totalPages > 1 && (
        <div
          ref={containerRef}
          className="join overflow-x-auto focus:outline-none focus:ring-1 focus:ring-primary/50"
          role="navigation"
          aria-label="Pagination"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            Page {currentPage} of {totalPages}
          </div>
      {style === 'extended' && (
        <button
          className="join-item btn"
          onClick={handleFirst}
          disabled={currentPage === 1}
          aria-label="Go to first page"
        >
          «
        </button>
      )}
      <button
        className="join-item btn"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        ‹
      </button>

      {style !== 'compact' &&
        pageNumbers.map((page, index) => {
          if (typeof page === 'number') {
            return (
              <button
                key={index}
                className={`join-item btn ${currentPage === page ? 'btn-active' : ''}`}
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? 'page' : undefined}
                aria-label={`Page ${page}`}
              >
                {page}
              </button>
            );
          }
          if (page === '...prev') {
            return (
              <button
                key={index}
                className="join-item btn bg-transparent border-transparent hover:bg-base-200 text-base-content/50 focus:outline-none focus:ring focus:ring-primary focus:bg-base-200 group relative flex items-center justify-center transition-colors"
                onClick={handleJumpPrev}
                aria-label="Jump backward 5 pages"
                title="Jump backward 5 pages"
              >
                <span className="group-hover:hidden group-focus:hidden absolute">•••</span>
                <span className="hidden group-hover:inline group-focus:inline absolute text-lg">«</span>
              </button>
            );
          }
          if (page === '...next') {
            return (
              <button
                key={index}
                className="join-item btn bg-transparent border-transparent hover:bg-base-200 text-base-content/50 focus:outline-none focus:ring focus:ring-primary focus:bg-base-200 group relative flex items-center justify-center transition-colors"
                onClick={handleJumpNext}
                aria-label="Jump forward 5 pages"
                title="Jump forward 5 pages"
              >
                <span className="group-hover:hidden group-focus:hidden absolute">•••</span>
                <span className="hidden group-hover:inline group-focus:inline absolute text-lg">»</span>
              </button>
            );
          }
          return null;
        })}

      {style === 'compact' && (
        <button className="join-item btn" disabled>
          Page {currentPage} of {totalPages}
        </button>
      )}

      <button
        className="join-item btn"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        ›
      </button>
      {style === 'extended' && (
        <button
          className="join-item btn"
          onClick={handleLast}
          disabled={currentPage === totalPages}
          aria-label="Go to last page"
        >
          »
        </button>
      )}
        </div>
      )}
    </div>
  );
};

export default Pagination;
