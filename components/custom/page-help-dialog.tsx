"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RelatedPageLink {
  href: string;
  label: string;
  description?: string;
}

interface PageHelpDialogProps {
  pageName: string;
  summary: string;
  responsibilities?: string[];
  relatedPages?: RelatedPageLink[];
  className?: string;
}

export function PageHelpDialog({
  pageName,
  summary,
  responsibilities = [],
  relatedPages = [],
  className,
}: PageHelpDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className={className}
            aria-label={`Explain ${pageName}`}
          />
        }
      >
        <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />
      </DialogTrigger>
      <DialogContent className="max-w-lg! max-h-[80vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl">
        <DialogHeader className="gap-3 border-b border-zinc-100 px-6 py-5">
          <DialogTitle className="text-base font-semibold">About this page</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-zinc-600">
            <span className="font-medium text-zinc-900">{pageName}</span>
            {": "}
            {summary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {responsibilities.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-900">What you can do here</h3>
              <ul className="space-y-2 text-sm leading-6 text-zinc-600">
                {responsibilities.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#ff6900]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {relatedPages.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-900">Depends on these pages</h3>
              <div className="space-y-2">
                {relatedPages.map((page) => (
                  <div key={page.href} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm">
                    <Link href={page.href} className="font-medium text-[#ff6900] underline underline-offset-4">
                      {page.label}
                    </Link>
                    {page.description ? <p className="mt-1 leading-6 text-zinc-600">{page.description}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <DialogFooter className="border-t border-zinc-100 px-6 py-4" showCloseButton />
      </DialogContent>
    </Dialog>
  );
}