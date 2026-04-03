"use client";

import { useEffect, useRef } from "react";
import { appToast } from "@/lib/toast";

interface FormStatusToastProps {
  error?: string;
  ok?: string;
  successTitle?: string;
}

export function FormStatusToast({ error, ok, successTitle = "Success" }: FormStatusToastProps) {
  const lastShownRef = useRef<string>("");

  useEffect(() => {
    if (error) {
      const key = `error:${error}`;
      if (lastShownRef.current !== key) {
        lastShownRef.current = key;
        appToast.error(error);
      }
      return;
    }

    if (ok) {
      const key = `ok:${ok}:${successTitle}`;
      if (lastShownRef.current !== key) {
        lastShownRef.current = key;
        appToast.success(successTitle);
      }
    }
  }, [error, ok, successTitle]);

  return null;
}
