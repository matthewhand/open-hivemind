import { useMemo } from 'react';
import useUrlParams from './useUrlParams';

interface UsePaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  paginatedItems: T[];
  totalPages: number;
}

/**
 * Hook to manage pagination state with URL persistence
 * @param items - Array of items to paginate
 * @param options - Pagination options
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const {
    defaultPageSize = 20,
    pageSizeOptions = [10, 20, 50, 100],
  } = options;

  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    page: { type: 'number', default: 1 },
    pageSize: { type: 'number', default: defaultPageSize },
  });

  const currentPage = Math.max(1, urlParams.page as number);
  const pageSize = pageSizeOptions.includes(urlParams.pageSize as number)
    ? (urlParams.pageSize as number)
    : defaultPageSize;

  const setCurrentPage = (page: number) => setUrlParam('page', page);
  const setPageSize = (size: number) => {
    setUrlParam('pageSize', size);
    // Reset to page 1 when changing page size
    setUrlParam('page', 1);
  };

  const totalPages = Math.ceil(items.length / pageSize);

  // Ensure current page is valid
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  if (validCurrentPage !== currentPage && totalPages > 0) {
    setCurrentPage(validCurrentPage);
  }

  const paginatedItems = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  }, [items, validCurrentPage, pageSize]);

  return {
    currentPage: validCurrentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems,
    totalPages,
  };
}
