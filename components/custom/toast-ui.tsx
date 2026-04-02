"use client";

import { Button } from "@/components/ui/button";
import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { toast } from "sonner";

type ToastType = "success" | "error" | "warning" | "info";

type ToastOptions = {
  description?: ReactNode;
  duration?: number;
};

type PromiseMessages<T> = {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((error: unknown) => string);
};

const toastStyles: Record<
  ToastType,
  {
    icon: typeof CheckmarkCircle02Icon;
    border: string;
    bg: string;
    iconBg: string;
    iconColor: string;
    title: string;
    message: string;
  }
> = {
  success: {
    icon: CheckmarkCircle02Icon,
    border: "border-emerald-500/35 dark:border-emerald-400/35",
    bg: "bg-emerald-50/95 dark:bg-emerald-950/85",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/80",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    title: "text-emerald-900 dark:text-emerald-100",
    message: "text-emerald-700 dark:text-emerald-200",
  },
  error: {
    icon: Alert02Icon,
    border: "border-red-500/35 dark:border-red-400/35",
    bg: "bg-red-50/95 dark:bg-red-950/85",
    iconBg: "bg-red-100 dark:bg-red-900/80",
    iconColor: "text-red-600 dark:text-red-300",
    title: "text-red-900 dark:text-red-100",
    message: "text-red-700 dark:text-red-200",
  },
  warning: {
    icon: Alert02Icon,
    border: "border-amber-500/35 dark:border-amber-400/35",
    bg: "bg-amber-50/95 dark:bg-amber-950/85",
    iconBg: "bg-amber-100 dark:bg-amber-900/80",
    iconColor: "text-amber-600 dark:text-amber-300",
    title: "text-amber-900 dark:text-amber-100",
    message: "text-amber-700 dark:text-amber-200",
  },
  info: {
    icon: InformationCircleIcon,
    border: "border-blue-500/35 dark:border-blue-400/35",
    bg: "bg-blue-50/95 dark:bg-blue-950/85",
    iconBg: "bg-blue-100 dark:bg-blue-900/80",
    iconColor: "text-blue-600 dark:text-blue-300",
    title: "text-blue-900 dark:text-blue-100",
    message: "text-blue-700 dark:text-blue-200",
  },
};

function AppToastCard({
  toastId,
  type,
  title,
  message,
}: {
  toastId: string | number;
  type: ToastType;
  title: string;
  message?: ReactNode;
}) {
  const style = toastStyles[type];

  return (
    <div
      className={[
        "relative flex w-full max-w-md items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-sm",
        style.bg,
        style.border,
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-black/5 dark:ring-white/10",
          style.iconBg,
        ].join(" ")}
      >
        <HugeiconsIcon
          icon={style.icon}
          strokeWidth={2.1}
          className={style.iconColor}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={["text-sm font-semibold leading-tight", style.title].join(
            " ",
          )}
        >
          {title}
        </p>
        {message ? (
          <div
            className={["mt-1 text-xs leading-relaxed", style.message].join(
              " ",
            )}
          >
            {message}
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => toast.dismiss(toastId)}
        className={[
          "-mr-1 -mt-1 opacity-70 hover:opacity-100",
          style.title,
        ].join(" ")}
      >
        <HugeiconsIcon
          icon={Cancel01Icon}
          strokeWidth={2.2}
          className="size-4"
        />
      </Button>
    </div>
  );
}

function triggerToast(type: ToastType, title: string, options?: ToastOptions) {
  return toast.custom(
    (t) => (
      <AppToastCard
        toastId={t}
        type={type}
        title={title}
        message={options?.description}
      />
    ),
    {
      duration: options?.duration ?? (type === "error" ? 5000 : 4000),
      className: "bg-transparent border-0 p-0 shadow-none",
    },
  );
}

export const appToast = {
  success(title: string, options?: ToastOptions) {
    return triggerToast("success", title, options);
  },

  error(title: string, options?: ToastOptions) {
    return triggerToast("error", title, options);
  },

  warning(title: string, options?: ToastOptions) {
    return triggerToast("warning", title, options);
  },

  info(title: string, options?: ToastOptions) {
    return triggerToast("info", title, options);
  },

  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>) {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      className: "cn-toast cn-toast-info",
    });
  },
};
