"use client";

import { useEffect } from "react";

interface ClearLocalStorageOnMountProps {
  enabled?: boolean;
  storageKey: string;
  searchParamToRemove?: string;
}

export function ClearLocalStorageOnMount({
  enabled = true,
  storageKey,
  searchParamToRemove,
}: ClearLocalStorageOnMountProps) {
  useEffect(() => {
    if (!enabled) return;

    window.localStorage.removeItem(storageKey);

    if (!searchParamToRemove) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(searchParamToRemove)) return;
    url.searchParams.delete(searchParamToRemove);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [enabled, searchParamToRemove, storageKey]);

  return null;
}