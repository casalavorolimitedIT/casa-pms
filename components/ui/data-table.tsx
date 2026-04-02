import * as React from "react";
import { cn } from "@/lib/utils";

interface DataTableProps extends React.ComponentProps<"table"> {
  caption?: string;
}

export function DataTable({ className, caption, children, ...props }: DataTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className={cn("w-full text-sm", className)} {...props}>
        {caption ? <caption className="p-3 text-left text-muted-foreground">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}
