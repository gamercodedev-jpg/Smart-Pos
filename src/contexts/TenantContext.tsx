import React, { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";

export const TenantContext = createContext<{ tenantId: string | null }>({ tenantId: null });

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? null;
  return (
    <TenantContext.Provider value={{ tenantId }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
