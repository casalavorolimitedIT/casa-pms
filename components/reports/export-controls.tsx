"use client";

import { Button } from "@/components/ui/button";

interface ExportControlsProps {
  rows: Array<Record<string, string | number>>;
  filename: string;
}

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows
    .map((row) =>
      keys
        .map((key) => {
          const value = String(row[key] ?? "");
          const escaped = value.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(","),
    )
    .join("\n");

  return `${header}\n${body}`;
}

export function ExportControls({ rows, filename }: ExportControlsProps) {
  const handleDownload = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={rows.length === 0}>
      Export CSV
    </Button>
  );
}
