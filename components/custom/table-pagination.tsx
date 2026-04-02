"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  /** 0-based current page index */
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Returns a mixed array of 0-based page numbers and "…" sentinel strings. */
function buildPageRange(page: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const range: (number | "ellipsis")[] = [0];

  const showLeftEllipsis = page > 2;
  const showRightEllipsis = page < total - 3;

  if (showLeftEllipsis) range.push("ellipsis");

  for (let i = Math.max(1, page - 1); i <= Math.min(total - 2, page + 1); i++) {
    range.push(i);
  }

  if (showRightEllipsis) range.push("ellipsis");

  range.push(total - 1);
  return range;
}

export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: TablePaginationProps) {
  const from = totalItems === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);
  const pageRange = buildPageRange(page, totalPages);

  const isFirst = page === 0;
  const isLast = page >= totalPages - 1;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-1 sm:flex-row sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground shrink-0 tabular-nums">
        {totalItems === 0
          ? "No items"
          : `Showing ${from}–${to} of ${totalItems} item${totalItems !== 1 ? "s" : ""}`}
      </p>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isFirst) onPageChange(page - 1);
                }}
                aria-disabled={isFirst}
                className={isFirst ? "pointer-events-none opacity-40" : ""}
              />
            </PaginationItem>

            {pageRange.map((p, idx) =>
              p === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(p);
                    }}
                  >
                    {p + 1}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isLast) onPageChange(page + 1);
                }}
                aria-disabled={isLast}
                className={isLast ? "pointer-events-none opacity-40" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
