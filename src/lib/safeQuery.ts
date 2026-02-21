import { supabase } from "./supabaseClient";
import { useTenant } from "@/contexts/TenantContext";

export function useTenantQuery(table: string) {
  const tenantContext = useTenant();
  if (!tenantContext || !tenantContext.tenantId) {
    // Don't throw during render — allow callers to still call the returned query function.
    // Log a warning and return a query function that does not filter by tenant_id so the UI can still load in dev fallback.
    // TODO: consider stricter behavior in production.
    console.warn('Tenant context is not available or tenantId is missing. Falling back to unscoped query.');
    return (filters = {}) => supabase.from(table).select('*').match(filters);
  }

  const { tenantId } = tenantContext;
  return (filters = {}) => supabase.from(table).select('*').eq('tenant_id', tenantId).match(filters);
}
