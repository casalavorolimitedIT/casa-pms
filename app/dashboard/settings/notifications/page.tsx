import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";

const NOTIFICATION_GROUPS = [
  {
    title: "Reservations",
    description: "Alerts related to booking activity.",
    items: [
      { label: "New reservation created", defaultOn: true },
      { label: "Reservation cancelled", defaultOn: true },
      { label: "Reservation modified", defaultOn: false },
    ],
  },
  {
    title: "Operations",
    description: "Real-time operational activity.",
    items: [
      { label: "Guest check-in completed", defaultOn: true },
      { label: "Guest check-out completed", defaultOn: true },
      { label: "New work order raised", defaultOn: false },
      { label: "Housekeeping room ready", defaultOn: false },
    ],
  },
  {
    title: "Staff & System",
    description: "Team and system-level events.",
    items: [
      { label: "New staff member invited", defaultOn: true },
      { label: "Failed login attempt", defaultOn: true },
      { label: "Night audit completed", defaultOn: false },
    ],
  },
];

export default async function NotificationsPage() {
  await redirectIfNotAuthenticated();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Notifications</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Control which system events trigger alerts for your account.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Coming soon.</strong> Notification preferences will be configurable per user in a future update.
        These are the planned settings for reference.
      </div>

      <div className="space-y-4">
        {NOTIFICATION_GROUPS.map((group) => (
          <Card key={group.title} className="border-zinc-200/80">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon
                        icon={Notification01Icon}
                        strokeWidth={1.75}
                        className="size-4 shrink-0 text-zinc-400"
                      />
                      <p className="text-sm text-zinc-700">{item.label}</p>
                    </div>
                    <span
                      className={`inline-flex h-5 w-9 shrink-0 cursor-not-allowed items-center rounded-full border transition-all ${
                        item.defaultOn
                          ? "border-emerald-300 bg-emerald-400"
                          : "border-zinc-200 bg-zinc-200"
                      } opacity-60`}
                      aria-disabled="true"
                    >
                      <span
                        className={`ml-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          item.defaultOn ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
