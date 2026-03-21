import type { CompanySettings } from '@/types/company';
import { supabase } from '@/lib/supabaseClient';

const BUCKET = 'branding-logos';

function mapDbRowToSettings(row: any): CompanySettings {
  return {
    appName: row.name,
    tagline: row.tagline ?? undefined,
    primaryColorHex: row.primary_color_hex ?? '#2563eb',
    logoDataUrl: row.logo_path ?? row.logo_url ?? undefined,
    metadata: row.metadata ?? {},
    brandType: row.brand_type ?? row.business_type ?? 'restaurant',
  } as CompanySettings;
}

export async function getCompanySettingsFromServer(): Promise<CompanySettings | null> {
  if (!supabase) return null;
  try {
    // Resolve the currently authenticated user
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = (sessionData as any)?.session?.user?.id ?? null;

    if (!userId) {
      // No logged-in user means we can't safely determine a brand; treat as no brand.
      return null;
    }

    // 1) Prefer the brand linked through the staff row for this user (multi-tenant safe).
    const { data: staffRow, error: staffError } = await supabase
      .from('staff')
      .select('brand_id, brands(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (staffError) {
      console.error('getCompanySettingsFromServer staff lookup error', staffError);
    }

    const brandFromStaff = (staffRow as any)?.brands;
    if (brandFromStaff) {
      return mapDbRowToSettings(brandFromStaff);
    }

    // 2) Fallback: a brand explicitly owned by this user via owner_id.
    const { data: ownedBrands, error: ownedError } = await supabase
      .from('brands')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (ownedError) {
      console.error('getCompanySettingsFromServer owner lookup error', ownedError);
      return null;
    }

    if (ownedBrands && ownedBrands.length > 0) {
      return mapDbRowToSettings(ownedBrands[0]);
    }

    // 3) No brand associated with this user — even if other brands exist in the DB,
    //    we must not attach them to someone else's brand.
    return null;
  } catch (err) {
    console.error('getCompanySettingsFromServer unexpected error', err);
    return null;
  }
}

export async function uploadLogo(file: File, companyId?: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const ext = file.name.split('.').pop() ?? 'png';
    const filename = `company_${companyId ?? 'anon'}_${Date.now()}.${ext}`;
    const path = `${filename}`;
    const { data, error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file as unknown as Blob, { cacheControl: '3600', upsert: true });
    if (uploadError) {
      console.error('uploadLogo upload error', uploadError);
      return null;
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return urlData?.publicUrl ?? null;
  } catch (err) {
    console.error('uploadLogo caught', err);
    return null;
  }
}

export async function createCompanySettingsOnServer(payload: Partial<CompanySettings> & { created_by?: string } = {}) {
  if (!supabase) return null;
  const row = {
    name: payload.appName,
    tagline: payload.tagline,
    primary_color_hex: payload.primaryColorHex,
    logo_path: payload.logoDataUrl,
    brand_type: payload.brandType ?? 'restaurant',
    metadata: payload.metadata ?? {},
    // Only set owner_id if created_by looks like a UUID to avoid SQL errors
    owner_id: payload.created_by && /^[0-9a-fA-F\-]{36}$/.test(payload.created_by) ? payload.created_by : null,
  };
  const { data, error } = await supabase.from('brands').insert(row).select().limit(1);
  if (error) {
    console.error('createCompanySettingsOnServer error', error);
    return null;
  }
  const created = data?.[0] ?? null;

  // If an owner was provided, ensure their staff row is linked to this brand and set to owner
  try {
    if (created && row.owner_id) {
      // Try updating an existing staff row for this user
      const { data: updated, error: updateErr } = await supabase
        .from('staff')
        .update({ brand_id: created.id, role: 'owner' })
        .eq('user_id', row.owner_id)
        .select();

      if (updateErr) {
        console.warn('createCompanySettingsOnServer: failed to update staff row', updateErr);
      }

      // If no existing staff row was updated, insert a new staff record linking the user and brand
      if (!updated || updated.length === 0) {
        const insertRow = {
          user_id: row.owner_id,
          brand_id: created.id,
          role: 'owner',
          display_name: null,
          email: null,
        };
        const { error: insertErr } = await supabase.from('staff').insert(insertRow);
        if (insertErr) {
          console.warn('createCompanySettingsOnServer: failed to insert staff row', insertErr);
        }
      }
    }
  } catch (e) {
    console.warn('createCompanySettingsOnServer: staff linking encountered error', e);
  }

  return created;
}

export async function updateCompanySettingsOnServer(id: string, payload: Partial<CompanySettings>) {
  if (!supabase) return null;
  const row = {
    name: payload.appName,
    tagline: payload.tagline,
    primary_color_hex: payload.primaryColorHex,
    logo_path: payload.logoDataUrl,
    brand_type: payload.brandType ?? 'restaurant',
    metadata: payload.metadata ?? {},
  };
  const { data, error } = await supabase.from('brands').update(row).eq('id', id).select().limit(1);
  if (error) {
    console.error('updateCompanySettingsOnServer error', error);
    return null;
  }
  return data?.[0] ?? null;
}

export async function getFirstCompanyRowId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    // Resolve the current auth user so we can scope brand selection per-user.
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = (sessionData as any)?.session?.user?.id ?? null;

    if (!userId) return null;

    // 1) If this user already has a staff row with a brand_id, prefer that brand.
    const { data: staffRow, error: staffError } = await supabase
      .from('staff')
      .select('brand_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (staffError) {
      console.error('getFirstCompanyRowId staff lookup error', staffError);
    }

    if (staffRow?.brand_id) {
      return staffRow.brand_id as string;
    }

    // 2) Fallback: a brand where this user is recorded as the owner.
    const { data, error } = await supabase
      .from('brands')
      .select('id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('getFirstCompanyRowId owner lookup error', error);
      return null;
    }

    return data?.[0]?.id ?? null;
  } catch (err) {
    console.error('getFirstCompanyRowId unexpected error', err);
    return null;
  }
}
