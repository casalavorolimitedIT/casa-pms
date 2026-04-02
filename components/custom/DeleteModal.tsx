"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, Trash } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";

interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  secondaryTitle?: string;
  description?: string | React.ReactNode;
  itemName?: string;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  icon?: React.ReactNode;
  showWarningList?: boolean;
  warningItems?: string[];
}

export function DeleteModal({
  open,
  onOpenChange,
  onConfirm,
  title = "Delete Item",
  secondaryTitle,
  description,
  itemName,
  isLoading = false,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  icon,
  showWarningList = false,
  warningItems = [],
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const loading = isLoading || isDeleting;

  const variantConfig = {
    danger: {
      gradient: "from-red-500 via-rose-500 to-pink-600",
      bgGlow: "bg-red-500/10",
      textColor: "text-red-600 dark:text-red-400",
      ringColor: "ring-red-500/20",
      Icon: icon || (
        <HugeiconsIcon
          icon={Trash}
          className="h-7 w-7 text-white drop-shadow-lg"
        />
      ),
    },
    warning: {
      gradient: "from-amber-500 via-orange-500 to-red-500",
      bgGlow: "bg-amber-500/10",
      textColor: "text-amber-600 dark:text-amber-400",
      ringColor: "ring-amber-500/20",
      Icon: icon || (
        <HugeiconsIcon
          icon={AlertTriangle}
          className="h-7 w-7 text-white drop-shadow-lg"
        />
      ),
    },
  };

  const config = variantConfig[variant];

  const defaultDescription = itemName ? (
    <>
      Are you sure you want to delete{" "}
      <span className="font-semibold text-foreground">{itemName}</span>?
      {showWarningList
        ? " This will also delete:"
        : " This action cannot be undone."}
    </>
  ) : (
    "This action cannot be undone."
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0 gap-0">
        {/* Animated background gradient */}
        <div
          className={cn(
            "absolute inset-0 opacity-5 transition-opacity duration-500",
            "bg-linear-to-br",
            config.gradient,
          )}
        />

        <div className="relative">
          <DialogHeader className="p-6 pb-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Animated icon */}
                <div className="relative group">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500",
                      "bg-linear-to-br",
                      config.gradient,
                    )}
                  />
                  <div
                    className={cn(
                      "relative flex h-14 w-14 items-center justify-center rounded-2xl",
                      "bg-linear-to-br shadow-xl ring-4 ring-white/10",
                      "transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                      config.gradient,
                    )}
                  >
                    {config.Icon}
                  </div>
                </div>

                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold tracking-tight">
                    {title}
                  </DialogTitle>
                  {secondaryTitle && (
                    <DialogTitle className="text-sm font-semibold text-muted-foreground text-left tracking-tight">
                      {secondaryTitle}
                    </DialogTitle>
                  )}
                </div>
              </div>
            </div>

            <DialogDescription className="text-base leading-relaxed text-left text-muted-foreground pt-2">
              {description || defaultDescription}
            </DialogDescription>

            {/* Warning list */}
            {showWarningList && warningItems.length > 0 && (
              <div
                className={cn(
                  "mt-4 rounded-xl border p-4 space-y-2",
                  config.bgGlow,
                  "border-border/50",
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <HugeiconsIcon
                    icon={AlertTriangle}
                    className={cn("h-4 w-4", config.textColor)}
                  />
                  <span>This will permanently delete:</span>
                </div>
                <ul className="space-y-1.5 ml-6">
                  {warningItems.map((item, index) => (
                    <li
                      key={index}
                      className="text-sm text-muted-foreground flex items-center gap-2"
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          "bg-linear-to-r",
                          config.gradient,
                        )}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DialogHeader>

          <DialogFooter className="p-6 pt-2 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-1 py-5"
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                "flex-1 sm:flex-1 gap-2 py-5 font-semibold shadow-lg",
                "transition-all duration-300",
                !loading && "hover:scale-105",
              )}
            >
              {loading ? <>Deleting...</> : <>{confirmText}</>}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Example usage component
// export function DeleteModalExample() {
//   const [open, setOpen] = React.useState(false);
//   const [loading, setLoading] = React.useState(false);

//   const handleDelete = async () => {
//     setLoading(true);
//     // Simulate API call
//     await new Promise((resolve) => setTimeout(resolve, 2000));
//     setLoading(false);
//     setOpen(false);
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
//       <h1 className="text-3xl font-bold mb-8">Delete Modal Examples</h1>

//       <div className="flex flex-wrap gap-3 justify-center">
//         {/* Simple delete */}
//         <Button onClick={() => setOpen(true)} variant="destructive">
//           Simple Delete
//         </Button>

//         {/* With item name */}
//         <DeleteModal
//           open={false}
//           onOpenChange={() => {}}
//           onConfirm={handleDelete}
//           title="Delete Farm"
//           itemName="Green Valley Farm"
//           isLoading={loading}
//         />

//         {/* With warning list */}
//         <Button
//           onClick={() => {
//             // This would open a different modal in real usage
//           }}
//           variant="outline"
//         >
//           Delete with Warnings
//         </Button>
//       </div>

//       {/* Active modal */}
//       <DeleteModal
//         open={open}
//         onOpenChange={setOpen}
//         onConfirm={handleDelete}
//         title="Delete Farm"
//         itemName="Green Valley Farm"
//         showWarningList
//         warningItems={[
//           "All plants and crops",
//           "All animals and livestock",
//           "All fish ponds and aquaculture",
//           "All feeding schedules and tasks",
//           "All historical records and data",
//         ]}
//         isLoading={loading}
//         confirmText="Delete Farm"
//       />

//       {/* Usage examples */}
//       <div className="mt-12 w-full max-w-2xl bg-muted/50 rounded-xl p-6 space-y-4">
//         <h2 className="text-xl font-bold">Usage Examples</h2>

//         <div className="space-y-3 text-sm">
//           <div className="bg-background rounded-lg p-4">
//             <p className="font-semibold mb-2">Basic Delete:</p>
//             <code className="text-xs">
//               {`<DeleteModal
//   open={open}
//   onOpenChange={setOpen}
//   onConfirm={handleDelete}
//   title="Delete Item"
//   itemName="My Item"
// />`}
//             </code>
//           </div>

//           <div className="bg-background rounded-lg p-4">
//             <p className="font-semibold mb-2">With Warning List:</p>
//             <code className="text-xs">
//               {`<DeleteModal
//   open={open}
//   onOpenChange={setOpen}
//   onConfirm={handleDelete}
//   title="Delete Farm"
//   itemName="Green Valley"
//   showWarningList
//   warningItems={["Plants", "Animals", "Schedules"]}
// />`}
//             </code>
//           </div>

//           <div className="bg-background rounded-lg p-4">
//             <p className="font-semibold mb-2">Warning Variant:</p>
//             <code className="text-xs">
//               {`<DeleteModal
//   variant="warning"
//   title="Archive Item"
//   confirmText="Archive"
//   onConfirm={handleArchive}
// />`}
//             </code>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
