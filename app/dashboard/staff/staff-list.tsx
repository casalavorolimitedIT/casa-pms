"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  STAFF_ROLE_LABELS,
  ROLE_COLORS,
  ALL_STAFF_ROLES,
  type StaffRole,
} from "@/lib/staff/roles";
import type { StaffMember } from "@/lib/staff/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { TablePagination } from "@/components/custom/table-pagination";

const PAGE_SIZE = 10;

interface StaffListProps {
  staff: StaffMember[];
  canManageAccess: boolean;
}

export function StaffList({ staff, canManageAccess }: StaffListProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [page, setPage] = useState(0);

  // Reset page whenever filters change
  function handleSearch(v: string) { setSearch(v); setPage(0); }
  function handleRole(v: string | null) { setRoleFilter((v ?? "all") as "all" | StaffRole); setPage(0); }
  function handleStatus(v: string | null) { setStatusFilter((v ?? "active") as "active" | "inactive" | "all"); setPage(0); }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((m) => {
      // status
      if (statusFilter === "active" && !m.isActive) return false;
      if (statusFilter === "inactive" && m.isActive) return false;
      // role
      if (roleFilter !== "all" && !m.roles.some((r) => r.role === roleFilter)) return false;
      // search
      if (q) {
        const inName = (m.fullName ?? "").toLowerCase().includes(q);
        const inEmail = m.email.toLowerCase().includes(q);
        const inTitle = (m.jobTitle ?? "").toLowerCase().includes(q);
        const inRole = m.roles.some((r) =>
          STAFF_ROLE_LABELS[r.role].toLowerCase().includes(q) ||
          r.propertyName.toLowerCase().includes(q)
        );
        if (!inName && !inEmail && !inTitle && !inRole) return false;
      }
      return true;
    });
  }, [staff, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const hasFilters = search !== "" || roleFilter !== "all" || statusFilter !== "active";

  return (
    <div className="space-y-4">
      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, email, role or property…"
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              aria-label="Clear search"
            >
              <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>

        <Select value={roleFilter} onValueChange={handleRole}>
          <SelectTrigger className="h-9 w-full sm:w-44 text-sm">
            <span className="flex flex-1 text-left truncate">
              {roleFilter === "all" ? "All roles" : (STAFF_ROLE_LABELS[roleFilter as StaffRole] ?? roleFilter)}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ALL_STAFF_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{STAFF_ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={handleStatus}>
          <SelectTrigger className="h-9 w-full sm:w-36 text-sm">
            <span className="flex flex-1 text-left truncate">
              {statusFilter === "active" ? "Active" : statusFilter === "inactive" ? "Inactive" : "All status"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="all">All status</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 text-zinc-500"
            onClick={() => { handleSearch(""); setRoleFilter("all"); setStatusFilter("active"); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {hasFilters
              ? "No staff members match the current filters."
              : "No staff members yet."}
            {!hasFilters && canManageAccess ? (
              <>
                {" "}
                <Link href="/dashboard/staff/invite" className="font-medium text-[#ff6900] underline underline-offset-4">
                  Invite your first team member.
                </Link>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {paginated.map((member) => {
            const initials = [
              member.fullName?.split(" ")[0]?.[0],
              member.fullName?.split(" ").at(-1)?.[0],
            ]
              .filter(Boolean)
              .join("")
              .toUpperCase() || member.email[0].toUpperCase();

            return (
              <Card
                key={member.userId}
                className={`border-zinc-200 transition-opacity ${!member.isActive ? "opacity-60" : ""}`}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600 select-none">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium text-sm leading-none">
                        {member.fullName ?? member.email}
                      </p>
                      {member.jobTitle ? (
                        <span className="text-xs text-muted-foreground">· {member.jobTitle}</span>
                      ) : null}
                      {!member.isActive && (
                        <Badge variant="secondary" className="text-[10px] py-0">Inactive</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{member.email}</p>

                    {member.roles.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {member.roles.map((r) => (
                          <span
                            key={r.roleAssignmentId}
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[r.role] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"}`}
                          >
                            {STAFF_ROLE_LABELS[r.role] ?? r.role}
                            <span className="ml-1 text-[10px] opacity-60">@ {r.propertyName}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-amber-600">No property role assigned</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/staff/${member.userId}`}>Manage</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <TablePagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
