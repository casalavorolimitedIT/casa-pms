"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { STAFF_ROLE_LABELS, type StaffRole } from "@/lib/staff/roles";
import { bulkImportStaff, type BulkImportRow, type BulkImportResult, type OrgProperty } from "./actions/staff-actions";

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function rowsToCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    )
    .join("\n");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
  return { headers, rows };
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ───────────────────────────────────────────────────────────────

type Step = "idle" | "preview" | "result";

interface ParsedRow {
  rowNum: number;
  data: Record<string, string>;
  valid: boolean;
  error?: string;
}

const REQUIRED_COLS = ["email", "full_name", "property_name", "role"] as const;
const VALID_ROLES = Object.keys(STAFF_ROLE_LABELS) as StaffRole[];

function validateRow(
  data: Record<string, string>,
  rowNum: number,
  propertyMap: Map<string, string>,
): ParsedRow {
  for (const col of REQUIRED_COLS) {
    if (!data[col]?.trim()) {
      return { rowNum, data, valid: false, error: `Missing required field: ${col}` };
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { rowNum, data, valid: false, error: "Invalid email address" };
  }
  if (!VALID_ROLES.includes(data.role as StaffRole)) {
    return {
      rowNum,
      data,
      valid: false,
      error: `Invalid role "${data.role}". Valid: ${VALID_ROLES.join(", ")}`,
    };
  }
  const resolvedId = propertyMap.get(data.property_name?.trim().toLowerCase());
  if (!resolvedId) {
    const knownNames = Array.from(propertyMap.keys()).join(", ");
    return {
      rowNum,
      data,
      valid: false,
      error: `Property "${data.property_name}" not found. Available: ${knownNames || "none"}`,
    };
  }
  // Stash the resolved UUID back in the data object for use during import
  data.__resolved_property_id = resolvedId;
  return { rowNum, data, valid: true };
}

interface StaffBulkUploadProps {
  properties: OrgProperty[];
}

export function StaffBulkUpload({ properties }: StaffBulkUploadProps) {
  // Build a lowercase name → id map for fast lookup
  const propertyMap = new Map<string, string>(
    properties.map((p) => [p.name.toLowerCase(), p.id]),
  );
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    setStep("idle");
    setParsedRows([]);
    setResult(null);
    setFileError(null);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCsv(text);

      const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
      if (missing.length > 0) {
        setFileError(`CSV is missing required columns: ${missing.join(", ")}`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const validated = rows.map((row, i) => validateRow(row, i + 2, propertyMap));
      setParsedRows(validated);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  function handleImport() {
    const validRows = parsedRows.filter((r) => r.valid);
    const importRows: BulkImportRow[] = validRows.map((r) => ({
      email: r.data.email,
      full_name: r.data.full_name,
      job_title: r.data.job_title || undefined,
      phone: r.data.phone || undefined,
      property_id: r.data.__resolved_property_id,
      role: r.data.role,
    }));

    startTransition(async () => {
      const res = await bulkImportStaff(importRows);
      setResult(res);
      setStep("result");
    });
  }

  function handleReset() {
    setStep("idle");
    setParsedRows([]);
    setResult(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        Bulk Upload
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl! max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Bulk Upload Staff</DialogTitle>
            <DialogDescription>
              Upload a CSV file to invite multiple staff members at once. Each row creates an
              account invite and assigns a property role.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Step 1: idle / choose file */}
            {(step === "idle" || step === "preview") && (
              <div className="space-y-3">
                {/* Download sample */}
                <div className="flex items-center justify-between rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Sample CSV template</p>
                    <p className="text-xs text-muted-foreground">
                      Download to see required columns. Use your exact property name in the <code className="font-mono text-[11px]">property_name</code> column.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const propName = properties[0]?.name ?? "Your Property Name";
                        const rows = [
                          ["email", "full_name", "job_title", "phone", "property_name", "role"],
                          ["alice@hotel.com", "Alice Smith", "Front Desk Agent", "+1 555 0101", propName, "front_desk"],
                          ["bob@hotel.com", "Bob Jones", "Head Housekeeper", "+1 555 0102", propName, "housekeeping_manager"],
                          ["carol@hotel.com", "Carol White", "Concierge", "", propName, "concierge"],
                          ["dan@hotel.com", "Dan Brown", "Maintenance Tech", "", propName, "maintenance"],
                          ["eve@hotel.com", "Eve Davis", "Night Auditor", "+1 555 0105", propName, "night_auditor"],
                        ];
                        downloadCsv("staff-upload-sample.csv", rows);
                      }}
                  >
                    Download Sample
                  </Button>
                </div>

                {/* File input */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="csv-upload">
                    Upload CSV
                  </label>
                  <input
                    ref={fileInputRef}
                    id="csv-upload"
                    type="file"
                    accept=".csv,text/csv"
                    className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border file:border-zinc-200 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-50 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  {fileError ? (
                    <p className="mt-1.5 text-xs text-red-600">{fileError}</p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Step 2: preview table */}
            {step === "preview" && parsedRows.length > 0 && (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex gap-3 text-sm">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    {validCount} valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      {invalidCount} invalid (will be skipped)
                    </span>
                  )}
                </div>

                {/* Table */}
                <div className="rounded-md border border-zinc-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600 w-10">#</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Full Name</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Job Title</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Property</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Role</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {parsedRows.map((row) => (
                          <tr
                            key={row.rowNum}
                            className={row.valid ? "bg-white" : "bg-red-50"}
                          >
                            <td className="px-3 py-2 text-zinc-400">{row.rowNum}</td>
                            <td className="px-3 py-2 font-medium text-zinc-700 max-w-40 truncate">
                              {row.data.email || <span className="text-red-500 italic">missing</span>}
                            </td>
                            <td className="px-3 py-2 text-zinc-600 max-w-30 truncate">
                              {row.data.full_name || <span className="text-red-500 italic">missing</span>}
                            </td>
                            <td className="px-3 py-2 text-zinc-500 max-w-25 truncate">
                              {row.data.job_title || "—"}
                            </td>
                            <td className="px-3 py-2 text-zinc-500 max-w-30 truncate">
                              {row.data.property_name || <span className="text-red-500 italic">missing</span>}
                            </td>
                            <td className="px-3 py-2">
                              {row.data.role ? (
                                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                                  {STAFF_ROLE_LABELS[row.data.role as StaffRole] ?? row.data.role}
                                </span>
                              ) : (
                                <span className="text-red-500 italic">missing</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.valid ? (
                                <span className="text-emerald-600 font-medium">✓</span>
                              ) : (
                                <span className="text-red-600 text-[11px]" title={row.error}>
                                  ✕ {row.error}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: result */}
            {step === "result" && result && (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-800">
                    Import complete — {result.succeeded} staff member{result.succeeded !== 1 ? "s" : ""} processed.
                    {result.created.length > 0 && result.created.length < result.succeeded
                      ? ` ${result.succeeded - result.created.length} existing account${result.succeeded - result.created.length !== 1 ? "s" : ""} updated.`
                      : ""}
                  </p>
                </div>

                {result.created.length > 0 && (
                  <div className="rounded-md border border-amber-200 overflow-hidden">
                    <div className="flex items-center justify-between bg-amber-50 px-3 py-2 border-b border-amber-200">
                      <p className="text-xs font-semibold text-amber-800">
                        {result.created.length} new account{result.created.length !== 1 ? "s" : ""} created — share these credentials
                      </p>
                      <button
                        type="button"
                        className="rounded border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50 transition-colors"
                        onClick={() =>
                          downloadCsv("staff-credentials.csv", [
                            ["email", "temporary_password", "login_url"],
                            ...result.created.map((c) => [
                              c.email,
                              c.tempPassword,
                              typeof window !== "undefined" ? `${window.location.origin}/login` : "/login",
                            ]),
                          ])
                        }
                      >
                        Download CSV
                      </button>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 border-b border-amber-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-zinc-500 w-10">#</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-500">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-500">Temporary password</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {result.created.map((c) => (
                          <tr key={c.row} className="bg-white">
                            <td className="px-3 py-2 text-zinc-400">{c.row}</td>
                            <td className="px-3 py-2 font-medium text-zinc-700">{c.email}</td>
                            <td className="px-3 py-2 font-mono text-zinc-800 select-all">{c.tempPassword}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="bg-amber-50 border-t border-amber-200 px-3 py-2 text-[11px] text-amber-700">
                      Staff can log in immediately with these credentials. Ask them to change their password after first sign-in.
                    </p>
                  </div>
                )}

                {result.failed.length > 0 && (
                  <div className="rounded-md border border-red-200 overflow-hidden">
                    <p className="bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 border-b border-red-200">
                      {result.failed.length} row{result.failed.length !== 1 ? "s" : ""} failed
                    </p>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-red-100">
                        {result.failed.map((f) => (
                          <tr key={f.row} className="bg-white">
                            <td className="px-3 py-2 text-zinc-400 w-10">{f.row}</td>
                            <td className="px-3 py-2 font-medium text-zinc-700">{f.email}</td>
                            <td className="px-3 py-2 text-red-600">{f.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4 bg-zinc-50">
            {step === "preview" && (
              <>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Choose different file
                </Button>
                <Button
                  size="sm"
                  disabled={validCount === 0 || isPending}
                  onClick={handleImport}
                  className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
                >
                  {isPending ? "Importing…" : `Import ${validCount} staff member${validCount !== 1 ? "s" : ""}`}
                </Button>
              </>
            )}
            {step === "result" && (
              <>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Upload another file
                </Button>
                <Button size="sm" onClick={handleClose}>
                  Done
                </Button>
              </>
            )}
            {step === "idle" && (
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
