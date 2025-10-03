import React, { useMemo } from 'react';

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
  const totalPages = Math.ceil(totalItems / pageSize);

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
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 4) {
        pages.push('...');
      }
      let startPage = Math.max(2, currentPage - 2);
      let endPage = Math.min(totalPages - 1, currentPage + 2);

      if (currentPage <= 4) {
        startPage = 2;
        endPage = 5;
      }
      if (currentPage > totalPages - 4) {
        startPage = totalPages - 4;
        endPage = totalPages - 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`join ${className}`} role="navigation" aria-label="Pagination">
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
        pageNumbers.map((page, index) =>
          typeof page === 'number' ? (
            <button
              key={index}
              className={`join-item btn ${currentPage === page ? 'btn-active' : ''}`}
              onClick={() => onPageChange(page)}
              aria-current={currentPage === page ? 'page' : undefined}
              aria-label={`Go to page ${page}`}
            >
              {page}
            </button>
          ) : (
            <button key={index} className="join-item btn btn-disabled">
              {page}
            </button>
          )
        )}

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