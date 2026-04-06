"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight01Icon, TaskDone01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type WorkflowStep = {
  title: string;
  description?: string;
};

type WorkflowStepperSheetProps = {
  title: string;
  description: string;
  triggerLabel: string;
  steps: WorkflowStep[];
  children: ReactNode;
  triggerClassName?: string;
  memoryKey?: string;
};

type PersistedWorkflowState = {
  step: number;
  fields: Record<string, string>;
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function WorkflowStepperSheet({
  title,
  description,
  triggerLabel,
  steps,
  children,
  triggerClassName,
  memoryKey,
}: WorkflowStepperSheetProps) {
  const [open, setOpen] = useState(false);
  const storageKey = useMemo(() => `workflow-stepper:${memoryKey ?? normalizeKey(title)}`, [memoryKey, title]);
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window === "undefined") return 1;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return 1;
      const parsed = JSON.parse(raw) as PersistedWorkflowState;
      return Math.max(1, parsed.step || 1);
    } catch {
      return 1;
    }
  });

  const totalSteps = useMemo(() => steps.length, [steps.length]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PersistedWorkflowState;

      if (!bodyRef.current) return;
      const controls = bodyRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input[name], textarea[name], select[name]",
      );

      controls.forEach((el) => {
        const key = el.name;
        if (!key || !(key in parsed.fields)) return;
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
          if (el.type === "checkbox") {
            el.checked = parsed.fields[key] === "1";
          } else {
            el.checked = el.value === parsed.fields[key];
          }
          return;
        }
        if (el instanceof HTMLInputElement && el.type === "file") return;
        el.value = parsed.fields[key] ?? "";
      });
    } catch {
      // Ignore corrupt local workflow state.
    }
  }, [open, steps.length, storageKey]);

  useEffect(() => {
    if (!open || typeof window === "undefined" || !bodyRef.current) return;

    const persistState = () => {
      if (!bodyRef.current) return;
      const fields: Record<string, string> = {};
      const controls = bodyRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input[name], textarea[name], select[name]",
      );

      controls.forEach((el) => {
        const key = el.name;
        if (!key) return;
        if (el instanceof HTMLInputElement && el.type === "hidden") return;
        if (el instanceof HTMLInputElement && el.type === "file") return;

        if (el instanceof HTMLInputElement && el.type === "checkbox") {
          fields[key] = el.checked ? "1" : "0";
          return;
        }

        if (el instanceof HTMLInputElement && el.type === "radio") {
          if (el.checked) fields[key] = el.value;
          return;
        }

        fields[key] = el.value;
      });

      const payload: PersistedWorkflowState = { step: currentStep, fields };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    };

    const node = bodyRef.current;
    node.addEventListener("input", persistState);
    node.addEventListener("change", persistState);

    persistState();

    return () => {
      node.removeEventListener("input", persistState);
      node.removeEventListener("change", persistState);
    };
  }, [currentStep, open, storageKey]);

  const jumpToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);

    if (!bodyRef.current) return;
    const section = bodyRef.current.querySelector<HTMLElement>(`[data-workflow-step=\"${stepNumber}\"]`);
    if (!section) return;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button className={cn("gap-2", triggerClassName)} size="sm">
            {triggerLabel}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
          </Button>
        }
      />

      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-scroll border-zinc-200 bg-white p-0 text-zinc-900 sm:max-w-xl!"
      >
        <div className="grid h-dvh grid-rows-[auto_1fr]">
          <SheetHeader className="gap-3 border-b border-zinc-100 bg-linear-to-b from-zinc-50 to-white p-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
              <HugeiconsIcon icon={TaskDone01Icon} size={14} strokeWidth={2.2} />
              Guided workflow
            </div>
            <SheetTitle className="text-xl font-semibold tracking-tight">{title}</SheetTitle>
            <SheetDescription className="text-sm text-zinc-600">{description}</SheetDescription>

            <ol className="mt-1 grid gap-2 sm:grid-cols-2">
              {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep === stepNumber;

                return (
                <li
                  key={step.title}
                  className={cn(
                    "cursor-pointer rounded-xl border bg-white/90 px-3 py-2 transition-colors",
                    isActive ? "border-zinc-900 bg-zinc-100/80" : "border-zinc-200 hover:bg-zinc-50",
                  )}
                  onClick={() => jumpToStep(stepNumber)}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      isActive ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700",
                    )}>
                      {stepNumber}
                    </span>
                    <span className="text-sm font-medium text-zinc-900">{step.title}</span>
                  </div>
                  {step.description ? (
                    <p className="mt-1 text-xs leading-5 text-zinc-600">{step.description}</p>
                  ) : null}
                </li>
                );
              })}
            </ol>

            <p className="text-xs text-zinc-500">Step {Math.min(currentStep, totalSteps)} of {totalSteps}. Progress and inputs are saved locally.</p>
          </SheetHeader>

          <div ref={bodyRef} className="overflow-y-auto p-6">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
