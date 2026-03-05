import React, { useMemo, useRef, useState, useEffect } from 'react';

type PaginationStyle = 'compact' | 'standard' | 'extended';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  style?: PaginationStyle;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  style = 'standard',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxVisiblePages, setMaxVisiblePages] = useState(7);
  const totalPages = Math.ceil(totalItems / pageSize);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width < 350) {
          setMaxVisiblePages(5); // Ultra compact
        } else if (width < 500) {
          setMaxVisiblePages(7); // Standard
        } else {
          setMaxVisiblePages(9); // Extended space
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
        const offset = Math.floor((maxVisiblePages - 4) / 2);
        for (let i = currentPage - offset; i <= currentPage + offset; i++) {
          pages.push(i);
        }
        pages.push('...next');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [totalPages, currentPage, maxVisiblePages]);

  const handleJumpPrev = () => {
    onPageChange(Math.max(1, currentPage - 5));
  };

  const handleJumpNext = () => {
    onPageChange(Math.min(totalPages, currentPage + 5));
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div ref={containerRef} className={`join ${className} w-full overflow-x-auto`} role="navigation" aria-label="Pagination">
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
                aria-label={`Go to page ${page}`}
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
  );
};

export default Pagination;