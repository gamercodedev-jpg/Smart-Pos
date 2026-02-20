import { supabase } from "./supabaseClient";
import { offlineVault } from "./offlineVault";

export async function deleteItem(table: string, id: string) {
  // Try Supabase first
  if (supabase) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) return true;
  }
  // Fallback: Dexie
  if (offlineVault && offlineVault[table]) {
    await offlineVault[table].delete(id);
    return true;
  }
  return false;
}
