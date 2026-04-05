"use client";

import { createContext, useContext, ReactNode } from "react";

type PermissionsContextType = {
  permissions: string[];
  hasPermission: (key: string) => boolean;
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: string[];
}) {
  const hasPermission = (key: string) => permissions.includes(key);

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}
