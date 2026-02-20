import { supabase } from "./supabaseClient";
import { useTenant } from "@/contexts/TenantContext";

export function useTenantQuery(table: string) {
  const tenantContext = useTenant();

  if (!tenantContext || !tenantContext.tenantId) {
    throw new Error("Tenant context is not available or tenantId is missing.");
  }

  const { tenantId } = tenantContext;
  return (filters = {}) =>
    supabase.from(table).select("*").eq("tenant_id", tenantId).match(filters);
}
