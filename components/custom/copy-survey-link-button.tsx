"use client";

import { useState } from "react";

interface CopySurveyLinkButtonProps {
  url: string;
}

export function CopySurveyLinkButton({ url }: CopySurveyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:underline"
      aria-label="Copy survey link"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
