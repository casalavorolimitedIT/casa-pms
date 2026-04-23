"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "type"
> & {
  idleText: string;
  pendingText?: string;
};

export function FormSubmitButton({
  idleText,
  pendingText = "Please wait...",
  disabled,
  className,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className={className}
      aria-busy={pending}
      disabled={pending || disabled}
      {...props}
    >
      {pending ? pendingText : idleText}
    </Button>
  );
}
