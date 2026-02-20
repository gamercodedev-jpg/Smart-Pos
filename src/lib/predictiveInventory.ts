import type { Recipe, StockItem } from '@/types';
import type { POSMenuItem } from '@/types/pos';
import type { Order } from '@/types/pos';

export type ForecastConfig = {
  /** Forecast date as YYYY-MM-DD (local). */
  targetDate: string;
  /** Lookback window in days (default 90). */
  lookbackDays?: number;
};

export type ForecastMenuRisk = {
  menuItemCode: string;
  menuItemId?: string;
  menuItemName: string;

  forecastQty: number;
  confidence: number; // 0..1

  avgSellIncl: number;
  maxProducible: number; // based on current stock + recipe
  shortageUnits: number;
  revenueAtRisk: number;

  notes: string[];
  limitingIngredients: Array<{
    ingredientId: string;
    ingredientName: string;
    unitType: string;
    onHand: number;
    requiredForForecast: number;
    shortage: number;
  }>;
};

export type ForecastBuyItem = {
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unitType: string;
  onHand: number;
  requiredTotal: number;
  shortage: number;
  usedBy: Array<{ menuItemCode: string; menuItemName: string }>;
};

export type PredictiveInventoryResult = {
  targetDate: string;
  lookbackDays: number;
  weekday: string;
  isPaydayWeekend: boolean;

  risks: ForecastMenuRisk[];
  buyList: ForecastBuyItem[];
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateKeyLocal(key: string): Date {
  const [yyyy, mm, dd] = key.split('-').map((x) => Number(x));
  return new Date(yyyy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
}

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

function weekdayName(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long' });
}

function isAnalyticsNoiseOrder(order: Order) {
  const staff = (order.staffName ?? '').toLowerCase();
  const customer = (order.customerName ?? '').toLowerCase();
  if (staff.includes('test') || staff.includes('error')) return true;
  if (customer.includes('test') || customer.includes('error')) return true;
  if (!Number.isFinite(order.total) || order.total <= 0) return true;
  if (!Array.isArray(order.items) || order.items.length === 0) return true;
  return false;
}

function isPaydayWeekendLocal(target: Date) {
  const dow = target.getDay();
  const isWeekend = dow === 0 || dow === 6;
  if (!isWeekend) return false;
  const day = target.getDate();
  return day >= 25 || day <= 3;
}

function findRecipeForMenuItem(recipes: Recipe[], menuItem: { code?: string; id?: string; name?: string }) {
  const code = menuItem.code ? String(menuItem.code) : '';
  const id = menuItem.id ? String(menuItem.id) : '';

  if (code) {
    const byCode = recipes.find((r) => String(r.parentItemCode) === code);
    if (byCode) return byCode;
  }
  if (id) {
    const byId = recipes.find((r) => String(r.parentItemId) === id);
    if (byId) return byId;
  }
  if (menuItem.name) {
    const name = menuItem.name.trim().toLowerCase();
    const byName = recipes.find((r) => (r.parentItemName ?? '').trim().toLowerCase() === name);
    if (byName) return byName;
  }

  return undefined;
}

function qtyPerMenuUnit(recipe: Recipe, ingredientId: string) {
  const ing = recipe.ingredients.find((i) => i.ingredientId === ingredientId);
  if (!ing) return 0;
  const out = Number.isFinite(recipe.outputQty) && recipe.outputQty > 0 ? recipe.outputQty : 1;
  const req = Number.isFinite(ing.requiredQty) ? ing.requiredQty : 0;
  return req / out;
}

function computeWeightedWeekdayForecast(params: {
  samples: Array<{ date: Date; qty: number }>;
  targetDate: Date;
}) {
  // Exponential decay weights: half-life 30 days.
  const halfLifeDays = 30;
  const k = Math.log(2) / halfLifeDays;

  const target = params.targetDate;
  const valid = params.samples
    .filter((s) => Number.isFinite(s.qty) && s.qty >= 0)
    .map((s) => ({
      ...s,
      ageDays: Math.max(0, daysBetween(s.date, target)),
    }))
    .sort((a, b) => a.ageDays - b.ageDays);

  if (!valid.length) return { forecast: 0, confidence: 0, sampleCount: 0, notes: ['No historical samples'] };

  let wSum = 0;
  let wxSum = 0;
  for (const s of valid) {
    const w = Math.exp(-k * s.ageDays);
    wSum += w;
    wxSum += w * s.qty;
  }

  const base = wSum > 0 ? wxSum / wSum : 0;

  // Trend bump: compare last 4 samples vs previous 4.
  const last = valid.slice(0, 4);
  const prev = valid.slice(4, 8);
  const avg = (arr: Array<{ qty: number }>) => (arr.length ? arr.reduce((sum, s) => sum + s.qty, 0) / arr.length : 0);
  const lastAvg = avg(last);
  const prevAvg = avg(prev);

  let trendMult = 1;
  if (last.length >= 3 && prev.length >= 3 && prevAvg > 0) {
    const growth = (lastAvg - prevAvg) / prevAvg;
    trendMult = 1 + clamp(growth * 0.35, -0.15, 0.2);
  }

  const forecast = Math.max(0, base * trendMult);
  const n = valid.length;
  const confidence = clamp(Math.sqrt(n) / 5, 0.15, 0.95);

  const notes: string[] = [];
  notes.push(`${n} weekday samples`);
  if (Math.abs(trendMult - 1) > 0.02) notes.push(`Trend adj ${(trendMult * 100 - 100).toFixed(0)}%`);

  return { forecast, confidence, sampleCount: n, notes };
}

export function computePredictiveInventory(params: {
  orders: Order[];
  stockItems: StockItem[];
  recipes: Recipe[];
  posMenuItems: POSMenuItem[];
  config: ForecastConfig;
}): PredictiveInventoryResult {
  const targetDate = parseDateKeyLocal(params.config.targetDate);
  const lookbackDays = params.config.lookbackDays ?? 90;
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - lookbackDays);

  const isPaydayWeekend = isPaydayWeekendLocal(targetDate);
  const paydayMult = isPaydayWeekend ? 1.15 : 1;

  const weekday = targetDate.getDay();

  const itemDay = new Map<string, Array<{ date: Date; qty: number }>>();
  const itemInfo = new Map<string, { menuItemId?: string; name: string }>();

  for (const o of params.orders) {
    if (o.status !== 'paid') continue;
    if (isAnalyticsNoiseOrder(o)) continue;

    const orderDateKey = dateKeyLocal(new Date(o.paidAt ?? o.createdAt));
    const dt = parseDateKeyLocal(orderDateKey);
    if (dt < startDate || dt > targetDate) continue;
    if (dt.getDay() !== weekday) continue;

    for (const it of o.items ?? []) {
      if (it.isVoided) continue;
      const code = (it.menuItemCode ?? '').trim();
      const key = code || it.menuItemId;
      if (!key) continue;

      const qty = Number.isFinite(it.quantity) ? it.quantity : 0;
      const arr = itemDay.get(key) ?? [];
      arr.push({ date: dt, qty });
      itemDay.set(key, arr);

      if (!itemInfo.has(key)) itemInfo.set(key, { menuItemId: it.menuItemId, name: it.menuItemName ?? key });
    }
  }

  const stockById = new Map(params.stockItems.map((s) => [s.id, s] as const));
  const posByCode = new Map(params.posMenuItems.map((m) => [String(m.code), m] as const));
  const posById = new Map(params.posMenuItems.map((m) => [String(m.id), m] as const));

  const risks: ForecastMenuRisk[] = [];

  for (const [key, samples] of itemDay.entries()) {
    const info = itemInfo.get(key);
    const asCode = String(key);

    const posItem = posByCode.get(asCode) ?? (info?.menuItemId ? posById.get(String(info.menuItemId)) : undefined);
    const menuName = posItem?.name ?? info?.name ?? key;

    const recipe = findRecipeForMenuItem(params.recipes, {
      code: posItem?.code ?? asCode,
      id: posItem?.id ?? info?.menuItemId,
      name: menuName,
    });

    const computed = computeWeightedWeekdayForecast({ samples, targetDate });
    const forecastQtyRaw = computed.forecast * paydayMult;
    const forecastQty = Math.max(0, Math.round(forecastQtyRaw));

    const avgSellIncl = (() => {
      const unit = Number.isFinite(posItem?.price) ? Number(posItem!.price) : NaN;
      if (Number.isFinite(unit) && unit > 0) return unit;

      const unitPrices = params.orders
        .filter((o) => o.status === 'paid')
        .flatMap((o) => o.items ?? [])
        .filter((it) => (it.menuItemCode || it.menuItemId) === key && !it.isVoided)
        .map((it) => (Number.isFinite(it.unitPrice) ? it.unitPrice : NaN))
        .filter((n) => Number.isFinite(n) && n > 0) as number[];

      if (!unitPrices.length) return 0;
      return round2(unitPrices.reduce((s, n) => s + n, 0) / unitPrices.length);
    })();

    const notes = [...computed.notes];
    if (isPaydayWeekend) notes.push('Payday-weekend boost');

    if (!forecastQty || forecastQty <= 0) continue;

    if (!recipe || !recipe.ingredients?.length) {
      risks.push({
        menuItemCode: String(posItem?.code ?? key),
        menuItemId: posItem?.id ?? info?.menuItemId,
        menuItemName: menuName,
        forecastQty,
        confidence: computed.confidence,
        avgSellIncl,
        maxProducible: Number.POSITIVE_INFINITY,
        shortageUnits: 0,
        revenueAtRisk: 0,
        notes: [...notes, 'No recipe mapped (cannot compute ingredient risk)'],
        limitingIngredients: [],
      });
      continue;
    }

    let maxProducible = Number.POSITIVE_INFINITY;
    const limitingIngredients: ForecastMenuRisk['limitingIngredients'] = [];

    for (const ing of recipe.ingredients) {
      const perUnit = qtyPerMenuUnit(recipe, ing.ingredientId);
      if (!Number.isFinite(perUnit) || perUnit <= 0) continue;

      const stock = stockById.get(ing.ingredientId);
      const onHand = Number.isFinite(stock?.currentStock) ? Number(stock!.currentStock) : 0;
      const requiredForForecast = perUnit * forecastQty;
      const shortage = Math.max(0, requiredForForecast - onHand);

      const canMake = onHand / perUnit;
      if (Number.isFinite(canMake)) maxProducible = Math.min(maxProducible, canMake);

      if (shortage > 0.00001) {
        limitingIngredients.push({
          ingredientId: ing.ingredientId,
          ingredientName: stock?.name ?? ing.ingredientName,
          unitType: String(stock?.unitType ?? ing.unitType),
          onHand: round2(onHand),
          requiredForForecast: round2(requiredForForecast),
          shortage: round2(shortage),
        });
      }
    }

    if (!Number.isFinite(maxProducible)) maxProducible = 0;

    const maxMenuUnits = maxProducible === Number.POSITIVE_INFINITY ? forecastQty : Math.floor(maxProducible);
    const shortageUnits = Math.max(0, forecastQty - Math.max(0, maxMenuUnits));
    const revenueAtRisk = round2(shortageUnits * avgSellIncl);

    risks.push({
      menuItemCode: String(posItem?.code ?? recipe.parentItemCode ?? key),
      menuItemId: posItem?.id ?? recipe.parentItemId ?? info?.menuItemId,
      menuItemName: menuName,
      forecastQty,
      confidence: computed.confidence,
      avgSellIncl,
      maxProducible: maxProducible === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.floor(maxProducible),
      shortageUnits,
      revenueAtRisk,
      notes,
      limitingIngredients: limitingIngredients
        .slice()
        .sort((a, b) => b.shortage - a.shortage)
        .slice(0, 3),
    });
  }

  const buyMap = new Map<string, ForecastBuyItem>();

  for (const r of risks) {
    if (!r.limitingIngredients.length) continue;

    const posItem = posByCode.get(String(r.menuItemCode)) ?? undefined;
    const recipe = findRecipeForMenuItem(params.recipes, { code: posItem?.code ?? r.menuItemCode, id: posItem?.id ?? r.menuItemId, name: r.menuItemName });
    if (!recipe) continue;

    const forecastQty = r.forecastQty;
    for (const ing of recipe.ingredients) {
      const perUnit = qtyPerMenuUnit(recipe, ing.ingredientId);
      if (!Number.isFinite(perUnit) || perUnit <= 0) continue;

      const stock = stockById.get(ing.ingredientId);
      const onHand = Number.isFinite(stock?.currentStock) ? Number(stock!.currentStock) : 0;
      const requiredTotal = perUnit * forecastQty;

      const existing = buyMap.get(ing.ingredientId);
      if (!existing) {
        buyMap.set(ing.ingredientId, {
          ingredientId: ing.ingredientId,
          ingredientCode: stock?.code ?? ing.ingredientCode,
          ingredientName: stock?.name ?? ing.ingredientName,
          unitType: String(stock?.unitType ?? ing.unitType),
          onHand: round2(onHand),
          requiredTotal: round2(requiredTotal),
          shortage: 0,
          usedBy: [{ menuItemCode: r.menuItemCode, menuItemName: r.menuItemName }],
        });
      } else {
        existing.requiredTotal = round2(existing.requiredTotal + requiredTotal);
        if (!existing.usedBy.some((u) => u.menuItemCode === r.menuItemCode)) {
          existing.usedBy.push({ menuItemCode: r.menuItemCode, menuItemName: r.menuItemName });
        }
      }
    }
  }

  const buyList = Array.from(buyMap.values())
    .map((b) => {
      const stock = stockById.get(b.ingredientId);
      const onHand = Number.isFinite(stock?.currentStock) ? Number(stock!.currentStock) : b.onHand;
      const shortage = Math.max(0, b.requiredTotal - onHand);
      return { ...b, onHand: round2(onHand), shortage: round2(shortage) };
    })
    .filter((b) => b.shortage > 0.00001)
    .sort((a, b) => b.shortage - a.shortage);

  const risksSorted = risks
    .slice()
    .sort((a, b) => {
      if (b.revenueAtRisk !== a.revenueAtRisk) return b.revenueAtRisk - a.revenueAtRisk;
      return b.shortageUnits - a.shortageUnits;
    });

  return {
    targetDate: params.config.targetDate,
    lookbackDays,
    weekday: weekdayName(targetDate),
    isPaydayWeekend,
    risks: risksSorted,
    buyList,
  };
}
