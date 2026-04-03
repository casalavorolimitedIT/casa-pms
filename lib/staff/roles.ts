// Shared types and constants for staff roles.
// Kept in lib/ (not "use server") so they can be imported
// by both server actions and client components without breaking
// Next.js "use server" rules (which only allow async function exports).

export const STAFF_ROLE_VALUES = [
  "owner",
  "general_manager",
  "supervisor",
  "front_desk",
  "cashier",
  "housekeeping_manager",
  "housekeeping_staff",
  "concierge",
  "maintenance",
  "night_auditor",
] as const;

export type StaffRole = (typeof STAFF_ROLE_VALUES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  general_manager: "General Manager",
  supervisor: "Supervisor",
  front_desk: "Front Desk",
  cashier: "Cashier",
  housekeeping_manager: "Housekeeping Manager",
  housekeeping_staff: "Housekeeping Staff",
  concierge: "Concierge",
  maintenance: "Maintenance",
  night_auditor: "Night Auditor",
};

export const ALL_STAFF_ROLES = [...STAFF_ROLE_VALUES];

export const STAFF_ADMIN_ROLES: StaffRole[] = ["owner", "general_manager"];

export const ROLE_COLORS: Record<StaffRole, string> = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  general_manager: "bg-blue-100 text-blue-800 border-blue-200",
  supervisor: "bg-indigo-100 text-indigo-800 border-indigo-200",
  front_desk: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cashier: "bg-amber-100 text-amber-800 border-amber-200",
  housekeeping_manager: "bg-teal-100 text-teal-800 border-teal-200",
  housekeeping_staff: "bg-cyan-100 text-cyan-800 border-cyan-200",
  concierge: "bg-sky-100 text-sky-800 border-sky-200",
  maintenance: "bg-orange-100 text-orange-800 border-orange-200",
  night_auditor: "bg-slate-100 text-slate-700 border-slate-200",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  owner: "Full access including billing & settings",
  general_manager: "All ops access; can manage & invite staff",
  supervisor: "All ops except billing & settings",
  front_desk: "Reservations, check‑in/out, guests, keys, messages",
  cashier: "Folios, payments, cash shift, night audit",
  housekeeping_manager: "Full housekeeping, linen, minibar, room status",
  housekeeping_staff: "Housekeeping tasks & room status updates",
  concierge: "Concierge requests, messaging, pre‑arrival",
  maintenance: "Work orders & room maintenance status",
  night_auditor: "Night audit, reports, read-only folios",
};

export interface StaffMember {
  userId: string;
  email: string;
  fullName: string | null;
  jobTitle: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  joinedAt: string;
  roles: Array<{
    roleAssignmentId: string;
    propertyId: string;
    propertyName: string;
    role: StaffRole;
    assignedAt: string;
  }>;
}

// CSV column definitions for bulk upload
export const BULK_UPLOAD_COLUMNS = [
  "email",
  "full_name",
  "job_title",
  "phone",
  "property_name",
  "role",
] as const;

export const SAMPLE_CSV_ROWS = [
  ["email", "full_name", "job_title", "phone", "property_name", "role"],
  ["alice@hotel.com", "Alice Smith", "Front Desk Agent", "+1 555 0101", "Grand Plaza Hotel", "front_desk"],
  ["bob@hotel.com", "Bob Jones", "Head Housekeeper", "+1 555 0102", "Grand Plaza Hotel", "housekeeping_manager"],
  ["carol@hotel.com", "Carol White", "Concierge", "", "Grand Plaza Hotel", "concierge"],
  ["dan@hotel.com", "Dan Brown", "Maintenance Tech", "", "Grand Plaza Hotel", "maintenance"],
  ["eve@hotel.com", "Eve Davis", "Night Auditor", "+1 555 0105", "Grand Plaza Hotel", "night_auditor"],
];
