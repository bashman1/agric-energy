"use client";

import { useId, useState, useMemo } from "react";

interface PaginationProps {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  className?: string;
}

export default function Pagination({
  totalItems,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = true,
  className = "",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  // Generated rather than fixed: two paginated lists on one page would
  // otherwise share an id, and the second label would focus the first select.
  const pageSizeId = useId();

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];
    const showFirstLast = 2;
    const showAroundCurrent = 2;

    for (let i = 1; i <= Math.min(showFirstLast, totalPages); i++) {
      pages.push(i);
    }

    if (currentPage - showAroundCurrent > showFirstLast + 1) {
      pages.push("ellipsis");
    }

    const start = Math.max(showFirstLast + 1, currentPage - showAroundCurrent);
    const end = Math.min(totalPages - showFirstLast, currentPage + showAroundCurrent);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage + showAroundCurrent < totalPages - showFirstLast) {
      pages.push("ellipsis");
    }

    for (let i = Math.max(totalPages - showFirstLast + 1, 1); i <= totalPages; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    return pages;
  }, [totalPages, currentPage]);

  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handlePrev = () => handlePageClick(currentPage - 1);
  const handleNext = () => handlePageClick(currentPage + 1);

  return (
    <nav
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}
      aria-label="Pagination"
    >
      {showPageSize && onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <label htmlFor={pageSizeId} className="text-xs font-medium text-ink-500">
            Rows per page:
          </label>
          <select
            id={pageSizeId}
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="py-1.5 px-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3 text-sm text-ink-500">
        <span className="whitespace-nowrap" aria-live="polite">
          {totalItems === 0
            ? "No items"
            : `Showing ${startItem} to ${endItem} of ${totalItems}`}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 text-sm font-medium text-ink-700 bg-white border border-ink-200 rounded-lg hover:bg-ink-50 hover:border-ink-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          aria-label="Previous page"
          aria-disabled={currentPage <= 1}
        >
          Prev
        </button>

        <div className="flex items-center gap-1" role="navigation" aria-label="Pages">
          {pageNumbers.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 py-1.5 text-sm text-ink-400"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => handlePageClick(item)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  item === currentPage
                    ? "bg-primary-600 text-white border border-primary-600"
                    : "text-ink-700 bg-white border border-ink-200 hover:bg-ink-50 hover:border-ink-300"
                }`}
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? "page" : undefined}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 text-sm font-medium text-ink-700 bg-white border border-ink-200 rounded-lg hover:bg-ink-50 hover:border-ink-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          aria-label="Next page"
          aria-disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

/**
 * Client-side slicing over an already-loaded list.
 *
 * `page` is clamped on read rather than corrected by an effect. Filtering a
 * list shorter while on page 5 has to land somewhere sensible, and the two
 * alternatives are both worse: writing state during render (which this hook
 * used to do, and React warns about) or letting a post-render effect fix it,
 * which paints one empty frame first. Deriving the page the caller actually
 * gets means there is never a render showing nothing.
 */
export function usePagination<T>(items: T[], initialPage = 1, initialPageSize = 10) {
  const [requestedPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems: items.length,
    paginatedItems,
  };
}