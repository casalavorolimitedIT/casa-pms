import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

export default function Forbidden() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
        <HugeiconsIcon icon={Alert02Icon} size={32} />
      </div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900">
        Access Restricted
      </h2>
      <p className="mb-6 max-w-md text-sm text-zinc-500">
        You do not have the necessary permissions to view this page or perform this action. 
        If you believe you need access, please contact your property manager.
      </p>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
