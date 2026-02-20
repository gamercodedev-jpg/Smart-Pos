import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const LOCAL_PREFIX = 'mthunzi.userPrefs.v1';

function localKey(userId: string, key: string) {
  return `${LOCAL_PREFIX}.${userId}.${key}`;
}

export async function loadUserPreference<T>(params: {
  userId: string;
  key: string;
  fallback: T;
}): Promise<T> {
  const { userId, key, fallback } = params;

  // Local fast path
  try {
    const raw = localStorage.getItem(localKey(userId, key));
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }

  // Optional remote fetch (best-effort)
  if (!isSupabaseConfigured() || !supabase) return fallback;

  try {
    const client = supabase.schema('erp');

    // Expecting an `erp.user_preferences` table with:
    // user_id (text/uuid), key (text), value (json/text), updated_at (timestamp)
    const { data, error } = await client
      .from('user_preferences')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;

    if (data?.value == null) return fallback;
    const value = typeof data.value === 'string' ? (JSON.parse(data.value) as T) : (data.value as T);

    // backfill local cache
    try {
      localStorage.setItem(localKey(userId, key), JSON.stringify(value));
    } catch {
      // ignore
    }

    return value;
  } catch {
    return fallback;
  }
}

export async function saveUserPreference<T>(params: {
  userId: string;
  key: string;
  value: T;
}): Promise<void> {
  const { userId, key, value } = params;

  // Always write local
  try {
    localStorage.setItem(localKey(userId, key), JSON.stringify(value));
  } catch {
    // ignore
  }

  // Optional remote upsert (best-effort)
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const client = supabase.schema('erp');
    const { error } = await client.from('user_preferences').upsert(
      {
        user_id: userId,
        key,
        value,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'user_id,key' }
    );
    if (error) throw error;
  } catch {
    // ignore
  }
}
