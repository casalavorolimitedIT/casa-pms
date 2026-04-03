"use client";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
