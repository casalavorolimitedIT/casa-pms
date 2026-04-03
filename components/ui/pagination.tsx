import * as React from "react";

import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-row items-center gap-1", className)} {...props} />;
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li {...props} />;
}

type PaginationLinkProps = React.ComponentProps<"a"> & {
  isActive?: boolean;
};

function PaginationLink({ className, isActive = false, ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors",
        isActive
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({ children, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Go to previous page" {...props}>{children ?? "Previous"}</PaginationLink>;
}

function PaginationNext({ children, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Go to next page" {...props}>{children ?? "Next"}</PaginationLink>;
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex h-8 w-8 items-center justify-center text-zinc-500", className)}
      {...props}
    >
      ...
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
