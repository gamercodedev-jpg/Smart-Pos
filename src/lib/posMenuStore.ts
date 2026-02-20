import type { POSCategory, POSMenuItem } from '@/types/pos';
import { posCategories as defaultCategories, posMenuItems as defaultItems } from '@/data/posData';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const STORAGE_KEY = 'mthunzi.posMenu.v1';

type PosMenuStateV1 = {
  version: 1;
  categories: POSCategory[];
  items: POSMenuItem[];
};

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedState: PosMenuStateV1 | null = null;

const useRemote = isSupabaseConfigured() && supabase;
let remoteInitStarted = false;

// Seed images are remote URLs to public image hosts (e.g. Wikimedia Commons).
// Users can replace these in the POS Menu Manager with their own uploads/URLs.
const SEED_IMAGE_BY_ID: Record<string, string> = {
  pm1: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Fresh_made_bread_05.jpg',
  pm2: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Bread_%28White%29.jpg',
  pm3: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Brown_bread.jpg',
  pm4: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Samosa_with_sauce.jpg',
  pm5: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Meat_pie.jpg',
  pm6: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Chicken_pie.jpg',
  pm7: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Vegetable_pie.jpg',
  pm8: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Sausage_roll.jpg',
  pm9: 'https://upload.wikimedia.org/wikipedia/commons/6/62/T-bone_steak.jpg',
  pm10: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Cheeseburger.jpg',
  pm11: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Chicken_sandwich.png',
  'menu-platter': 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Grilled_meat_platter.jpg',
  pm12: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Roast_chicken.jpg',
  pm13: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Fish_and_chips_blackpool.jpg',
  pm14: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Ugali_and_stew.jpg',
  pm15: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Ugali_with_chicken_stew.jpg',
  pm16: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Fish_stew.jpg',
  pm17: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Beef_stew.jpg',
  pm18: 'https://upload.wikimedia.org/wikipedia/commons/6/66/French_fries.jpg',
  pm19: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Coleslaw_%282%29.jpg',
  pm20: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Garden_salad.jpg',
  pm21: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Mixed_vegetables.jpg',
  pm22: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Coca-Cola_bottle_%28500ml%29.jpg',
  pm23: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Orange_soda.jpg',
  pm24: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Orange_juice_glass.jpg',
  pm25: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Water_bottle.jpg',
  pm26: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Water_bottle.jpg',
  pm27: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Cappuccino_at_Sightglass_Coffee.jpg',
  pm28: 'https://upload.wikimedia.org/wikipedia/commons/4/45/A_small_cup_of_coffee.JPG',
  pm29: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Latte_and_dark_coffee.jpg',
  pm30: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Tea_in_a_glass.jpg',
  pm31: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Soft_serve_ice_cream.jpg',
  pm32: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Chocolate_cake.jpg',
  pm33: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Glazed-Donut.jpg',
};

function notify() {
  listeners.forEach((l) => l());
}

async function refreshFromSupabase() {
  if (!useRemote) return;
  try {
    const client = supabase!.schema('erp');

    const { data: catRows, error: catErr } = await client
      .from('pos_categories')
      .select('id,name,color,sort_order')
      .order('sort_order', { ascending: true });
    if (catErr) throw catErr;

    const { data: itemRows, error: itemErr } = await client
      .from('pos_menu_items')
      .select('id,code,name,category_id,price,cost,image,is_available,modifier_groups,track_inventory');
    if (itemErr) throw itemErr;

    const categories: POSCategory[] = (catRows ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      color: (r as any).color ?? undefined,
      sortOrder: Number((r as any).sort_order) || 0,
    }));

    const items: POSMenuItem[] = (itemRows ?? []).map((r) => ({
      id: String(r.id),
      code: String((r as any).code),
      name: String((r as any).name),
      categoryId: String((r as any).category_id),
      price: Number((r as any).price) || 0,
      cost: Number((r as any).cost) || 0,
      image: (r as any).image ?? undefined,
      isAvailable: Boolean((r as any).is_available),
      modifierGroups: ((r as any).modifier_groups as string[] | null) ?? undefined,
      trackInventory: Boolean((r as any).track_inventory),
    }));

    cachedState = { version: 1, categories, items };
    cachedRaw = JSON.stringify(cachedState);
    notify();
  } catch (e) {
    // Keep local snapshot if remote fails.
    console.error('[posMenuStore] Failed to load from Supabase', e);
  }
}

function parseRaw(raw: string): PosMenuStateV1 | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PosMenuStateV1>;
    if (parsed.version === 1 && Array.isArray(parsed.categories) && Array.isArray(parsed.items)) {
      return parsed as PosMenuStateV1;
    }
  } catch {
    // ignore
  }
  return null;
}

function seedDefaults(): PosMenuStateV1 {
  const seededItems: POSMenuItem[] = defaultItems.map((item) => {
    const seededUrl = SEED_IMAGE_BY_ID[item.id];
    const isPlaceholder = !item.image || item.image.startsWith('/menu/placeholder');
    return isPlaceholder && seededUrl ? { ...item, image: seededUrl } : item;
  });
  return {
    version: 1,
    categories: [...defaultCategories].sort((a, b) => a.sortOrder - b.sortOrder),
    items: seededItems,
  };
}

function applySeedImagesToState(state: PosMenuStateV1): PosMenuStateV1 {
  let changed = false;
  const nextItems = state.items.map((item) => {
    const seededUrl = SEED_IMAGE_BY_ID[item.id];
    const isPlaceholder = !item.image || item.image.startsWith('/menu/placeholder');
    if (isPlaceholder && seededUrl) {
      changed = true;
      return { ...item, image: seededUrl };
    }
    return item;
  });

  return changed ? { ...state, items: nextItems } : state;
}

function ensureLoaded(): PosMenuStateV1 {
  // IMPORTANT: `useSyncExternalStore` calls `getSnapshot` multiple times.
  // `getSnapshot` must return the exact same reference unless the store changed.
  // So we keep an in-memory snapshot and do NOT read localStorage during render.
  if (cachedState) return cachedState;

  if (typeof window === 'undefined') {
    const seeded = seedDefaults();
    cachedState = seeded;
    cachedRaw = JSON.stringify(seeded);
    return seeded;
  }

  // Remote mode: keep a stable in-memory snapshot and hydrate async.
  if (useRemote) {
    if (!cachedState) {
      const seeded = seedDefaults();
      cachedState = seeded;
      cachedRaw = JSON.stringify(seeded);
    }
    if (!remoteInitStarted) {
      remoteInitStarted = true;
      void refreshFromSupabase();
    }
    return cachedState;
  }

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }

  if (raw) {
    const parsed = parseRaw(raw);
    if (parsed) {
      const migrated = applySeedImagesToState(parsed);
      const nextRaw = JSON.stringify(migrated);
      cachedRaw = nextRaw;
      cachedState = migrated;
      return migrated;
    }
  }

  const seeded = seedDefaults();
  const seededRaw = JSON.stringify(seeded);
  try {
    localStorage.setItem(STORAGE_KEY, seededRaw);
  } catch {
    // ignore
  }
  cachedRaw = seededRaw;
  cachedState = seeded;
  return seeded;
}

function save(state: PosMenuStateV1) {
  // Local mode only
  const raw = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // ignore
  }

  cachedRaw = raw;
  cachedState = state;
  notify();
}

export function subscribePosMenu(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPosMenuState(): PosMenuStateV1 {
  return ensureLoaded();
}

export function getPosCategories(): POSCategory[] {
  return ensureLoaded().categories.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPosMenuItems(): POSMenuItem[] {
  return ensureLoaded().items.slice();
}

// Referentially-stable snapshot for useSyncExternalStore.
// Do not clone/derive here; returning a fresh array will trigger render loops.
export function getPosMenuItemsSnapshot(): POSMenuItem[] {
  return ensureLoaded().items;
}

export function upsertPosCategory(category: POSCategory) {
  const state = ensureLoaded();
  const idx = state.categories.findIndex((c) => c.id === category.id);
  const next = idx >= 0
    ? state.categories.map((c) => (c.id === category.id ? category : c))
    : [...state.categories, category];

  // Optimistic update
  cachedState = { ...state, categories: next };
  cachedRaw = JSON.stringify(cachedState);
  notify();

  if (!useRemote) {
    save(cachedState);
    return;
  }

  void (async () => {
    try {
      const client = supabase!.schema('erp');
      const { error } = await client.from('pos_categories').upsert({
        id: category.id,
        name: category.name,
        color: category.color ?? null,
        sort_order: category.sortOrder,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await refreshFromSupabase();
    } catch (e) {
      console.error('[posMenuStore] Failed to upsert category', e);
    }
  })();
}

export function deletePosCategory(categoryId: string) {
  const state = ensureLoaded();
  const nextState: PosMenuStateV1 = {
    ...state,
    categories: state.categories.filter((c) => c.id !== categoryId),
    items: state.items.filter((i) => i.categoryId !== categoryId),
  };

  cachedState = nextState;
  cachedRaw = JSON.stringify(nextState);
  notify();

  if (!useRemote) {
    save(nextState);
    return;
  }

  void (async () => {
    try {
      const client = supabase!.schema('erp');
      // delete items first due to FK
      const { error: itemsErr } = await client.from('pos_menu_items').delete().eq('category_id', categoryId);
      if (itemsErr) throw itemsErr;
      const { error } = await client.from('pos_categories').delete().eq('id', categoryId);
      if (error) throw error;
      await refreshFromSupabase();
    } catch (e) {
      console.error('[posMenuStore] Failed to delete category', e);
    }
  })();
}

export function upsertPosMenuItem(item: POSMenuItem) {
  const state = ensureLoaded();
  const idx = state.items.findIndex((i) => i.id === item.id);
  const next = idx >= 0 ? state.items.map((i) => (i.id === item.id ? item : i)) : [item, ...state.items];

  cachedState = { ...state, items: next };
  cachedRaw = JSON.stringify(cachedState);
  notify();

  if (!useRemote) {
    save(cachedState);
    return;
  }

  void (async () => {
    try {
      const client = supabase!.schema('erp');
      const { error } = await client.from('pos_menu_items').upsert({
        id: item.id,
        code: item.code,
        name: item.name,
        category_id: item.categoryId,
        price: item.price,
        cost: item.cost,
        image: item.image ?? null,
        is_available: item.isAvailable,
        modifier_groups: item.modifierGroups ?? null,
        track_inventory: item.trackInventory ?? false,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await refreshFromSupabase();
    } catch (e) {
      console.error('[posMenuStore] Failed to upsert menu item', e);
    }
  })();
}

export function deletePosMenuItem(itemId: string) {
  const state = ensureLoaded();
  const nextState: PosMenuStateV1 = { ...state, items: state.items.filter((i) => i.id !== itemId) };

  cachedState = nextState;
  cachedRaw = JSON.stringify(nextState);
  notify();

  if (!useRemote) {
    save(nextState);
    return;
  }

  void (async () => {
    try {
      const client = supabase!.schema('erp');
      const { error } = await client.from('pos_menu_items').delete().eq('id', itemId);
      if (error) throw error;
      await refreshFromSupabase();
    } catch (e) {
      console.error('[posMenuStore] Failed to delete menu item', e);
    }
  })();
}

export function resetPosMenuToDefaults() {
  const seeded = seedDefaults();

  cachedRaw = JSON.stringify(seeded);
  cachedState = seeded;
  notify();

  if (!useRemote) {
    localStorage.setItem(STORAGE_KEY, cachedRaw);
    return;
  }

  void (async () => {
    try {
      const client = supabase!.schema('erp');
      await client.from('pos_menu_items').delete().neq('id', '__never__');
      await client.from('pos_categories').delete().neq('id', '__never__');

      const { error: catErr } = await client.from('pos_categories').insert(
        seeded.categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color ?? null,
          sort_order: c.sortOrder,
        }))
      );
      if (catErr) throw catErr;

      const { error: itemErr } = await client.from('pos_menu_items').insert(
        seeded.items.map((i) => ({
          id: i.id,
          code: i.code,
          name: i.name,
          category_id: i.categoryId,
          price: i.price,
          cost: i.cost,
          image: i.image ?? null,
          is_available: i.isAvailable,
          modifier_groups: i.modifierGroups ?? null,
          track_inventory: i.trackInventory ?? false,
        }))
      );
      if (itemErr) throw itemErr;

      await refreshFromSupabase();
    } catch (e) {
      console.error('[posMenuStore] Failed to reset menu in Supabase', e);
    }
  })();
}

// Cross-tab refresh
if (typeof window !== 'undefined' && !useRemote) {
  // Load eagerly once so `getSnapshot()` can stay stable.
  ensureLoaded();

  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;

    const nextRaw = e.newValue;
    if (nextRaw && nextRaw === cachedRaw) return;

    if (nextRaw) {
      const parsed = parseRaw(nextRaw);
      if (parsed) {
        cachedRaw = nextRaw;
        cachedState = parsed;
        notify();
        return;
      }
    }

    // Key removed or invalid data: re-seed.
    const seeded = seedDefaults();
    const raw = JSON.stringify(seeded);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedState = seeded;
    notify();
  });
}
