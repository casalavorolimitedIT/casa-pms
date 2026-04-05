"use client";

import React from "react";
import { DeleteModal } from "@/components/custom/DeleteModal";
import { Button } from "@/components/ui/button";

type ServerActionDeleteModalProps = {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: "destructive" | "outline" | "ghost" | "secondary" | "default";
  triggerSize?: "default" | "sm" | "lg" | "icon" | "xs";
  title?: string;
  secondaryTitle?: string;
  description?: React.ReactNode;
  itemName?: string;
  confirmText?: string;
  loadingText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  showWarningList?: boolean;
  warningItems?: string[];
};

export function ServerActionDeleteModal({
  action,
  fields,
  triggerLabel = "Delete",
  triggerClassName,
  triggerVariant = "destructive",
  triggerSize = "sm",
  title,
  secondaryTitle,
  description,
  itemName,
  confirmText,
  loadingText,
  cancelText,
  variant,
  showWarningList,
  warningItems,
}: ServerActionDeleteModalProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const onConfirm = async () => {
    const formData = new FormData();

    for (const [name, value] of Object.entries(fields)) {
      formData.set(name, value);
    }

    startTransition(async () => {
      await action(formData);
    });
  };

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      <DeleteModal
        open={open}
        onOpenChange={setOpen}
        onConfirm={onConfirm}
        title={title}
        secondaryTitle={secondaryTitle}
        description={description}
        itemName={itemName}
        isLoading={isPending}
        confirmText={confirmText}
        loadingText={loadingText}
        cancelText={cancelText}
        variant={variant}
        showWarningList={showWarningList}
        warningItems={warningItems}
      />
    </>
  );
}
