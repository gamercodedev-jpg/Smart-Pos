import type { GRV, StockItem, Recipe, Supplier } from '@/types';
import type { OrderItem } from '@/types/pos';
import type { UseIntelligenceReturn } from '@/hooks/useIntelligence';

export type PurchasePlanRow = {
  itemId: string;
  code: string;
  name: string;
  unitType: string;
  onHand: number;
  reorderLevel: number;
  avgDailyUsage: number;
  forecastUsage: number;
  suggestedOrderQty: number;
  unitCost: number;
  estCost: number;
  reason: string;
};

export type PurchasePlan = {
  horizonDays: number;
  generatedAt: string;
  rows: PurchasePlanRow[];
  totals: {
    estCost: number;
    lines: number;
  };
  unmappedSoldItems: Array<{ code: string; name: string; qty: number }>;
};

export type SupplierPurchaseOrderDraft = {
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  phone?: string;
  email?: string;
  plan: PurchasePlan;
  message: string;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function dateFromKey(key: string) {
  // key: YYYY-MM-DD
  return new Date(`${key}T00:00:00`);
}

function daysInclusive(startKey: string, endKey: string) {
  const a = dateFromKey(startKey);
  const b = dateFromKey(endKey);
  const ms = b.getTime() - a.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  return Math.max(1, days + 1);
}

function safeNum(n: unknown) {
  return Number.isFinite(n as number) ? (n as number) : 0;
}

function recipeByParentCode(recipes: Recipe[]) {
  const map = new Map<string, Recipe>();
  for (const r of recipes ?? []) {
    const code = String(r.parentItemCode ?? '').trim();
    if (!code) continue;
    map.set(code, r);
  }
  return map;
}

function computeIngredientUsageFromSales(params: {
  orderItems: OrderItem[];
  recipes: Recipe[];
}) {
  const byCode = recipeByParentCode(params.recipes);

  const ingredientUsage = new Map<string, number>();
  const unmapped = new Map<string, { code: string; name: string; qty: number }>();

  for (const it of params.orderItems) {
    const qty = safeNum(it.quantity);
    if (qty <= 0) continue;

    const code = String(it.menuItemCode ?? '').trim();
    const name = String(it.menuItemName ?? code);

    const recipe = code ? byCode.get(code) : undefined;
    if (!recipe) {
      const prev = unmapped.get(code || name) ?? { code: code || '-', name, qty: 0 };
      unmapped.set(code || name, { ...prev, qty: prev.qty + qty });
      continue;
    }

    const outputQty = safeNum(recipe.outputQty) > 0 ? safeNum(recipe.outputQty) : 1;

    for (const ing of recipe.ingredients ?? []) {
      const ingId = String(ing.ingredientId ?? '').trim();
      if (!ingId) continue;
      const req = safeNum(ing.requiredQty);
      if (req <= 0) continue;
      const perUnit = req / outputQty;
      const used = perUnit * qty;
      const prev = ingredientUsage.get(ingId) ?? 0;
      ingredientUsage.set(ingId, prev + used);
    }
  }

  return { ingredientUsage, unmapped: [...unmapped.values()].sort((a, b) => b.qty - a.qty) };
}

function stockById(items: StockItem[]) {
  return new Map((items ?? []).map((s) => [s.id, s] as const));
}

export function generatePurchasePlan(params: {
  intel: UseIntelligenceReturn;
  horizonDays: number;
}) {
  const horizonDays = Math.max(1, Math.floor(params.horizonDays || 7));

  const rangeDays = daysInclusive(params.intel.range.startDate, params.intel.range.endDate);

  const orderItems: OrderItem[] = [];
  for (const o of params.intel.orders ?? []) {
    for (const it of o.items ?? []) orderItems.push(it);
  }

  const { ingredientUsage, unmapped } = computeIngredientUsageFromSales({
    orderItems,
    recipes: params.intel.recipes ?? [],
  });

  const byId = stockById(params.intel.stockItems ?? []);
  const wac = params.intel.wacByItemId;

  const rows: PurchasePlanRow[] = [];

  for (const [itemId, usedQty] of ingredientUsage.entries()) {
    const stock = byId.get(itemId);
    if (!stock) continue;

    const avgDailyUsage = usedQty / rangeDays;
    const forecastUsage = avgDailyUsage * horizonDays;

    const onHand = safeNum(stock.currentStock);
    const reorderLevel = safeNum(stock.reorderLevel);

    // Suggest: cover forecast + maintain reorderLevel as safety stock buffer.
    const suggested = Math.max(0, forecastUsage + reorderLevel - onHand);
    if (suggested <= 1e-6) continue;

    const unitCost = Number.isFinite(wac?.get(itemId) as number)
      ? (wac!.get(itemId) as number)
      : safeNum(stock.currentCost);

    const estCost = suggested * unitCost;

    const reasonParts: string[] = [];
    if (onHand < reorderLevel && reorderLevel > 0) reasonParts.push('Below reorder level');
    reasonParts.push(`Forecast ${horizonDays}d`);

    rows.push({
      itemId,
      code: String(stock.code ?? ''),
      name: String(stock.name ?? ''),
      unitType: String(stock.unitType ?? ''),
      onHand: round2(onHand),
      reorderLevel: round2(reorderLevel),
      avgDailyUsage: round2(avgDailyUsage),
      forecastUsage: round2(forecastUsage),
      suggestedOrderQty: round2(suggested),
      unitCost: round2(unitCost),
      estCost: round2(estCost),
      reason: reasonParts.join(' • '),
    });
  }

  rows.sort((a, b) => b.estCost - a.estCost);

  const totals = {
    estCost: round2(rows.reduce((sum, r) => sum + r.estCost, 0)),
    lines: rows.length,
  };

  const generatedAt = new Date().toISOString();

  const plan: PurchasePlan = {
    horizonDays,
    generatedAt,
    rows,
    totals,
    unmappedSoldItems: unmapped.slice(0, 20),
  };

  return plan;
}

export function purchasePlanToCsv(plan: PurchasePlan) {
  const header = [
    'Code',
    'Name',
    'Unit',
    'On hand',
    'Reorder level',
    'Avg daily usage',
    `Forecast usage (${plan.horizonDays}d)`,
    'Suggested order qty',
    'Unit cost',
    'Est cost',
    'Reason',
  ];

  const lines = [header.join(',')];
  for (const r of plan.rows) {
    const row = [
      r.code,
      JSON.stringify(r.name),
      r.unitType,
      r.onHand,
      r.reorderLevel,
      r.avgDailyUsage,
      r.forecastUsage,
      r.suggestedOrderQty,
      r.unitCost,
      r.estCost,
      JSON.stringify(r.reason),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

function latestSupplierByItemId(grvs: GRV[]) {
  const out = new Map<string, { supplierId: string; supplierName: string }>();
  const confirmed = (grvs ?? []).filter((g) => g.status === 'confirmed');
  confirmed.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  for (const g of confirmed) {
    for (const it of g.items ?? []) {
      const itemId = String(it.itemId ?? '').trim();
      if (!itemId) continue;
      if (out.has(itemId)) continue;
      out.set(itemId, { supplierId: String(g.supplierId ?? ''), supplierName: String(g.supplierName ?? 'Supplier') });
    }
  }
  return out;
}

function supplierLookup(suppliers: Supplier[]) {
  const byId = new Map<string, Supplier>();
  for (const s of suppliers ?? []) byId.set(String(s.id), s);
  return byId;
}

export function generateSupplierPurchaseOrders(params: {
  plan: PurchasePlan;
  stockItems: StockItem[];
  grvs: GRV[];
  suppliers: Supplier[];
  formatMoney: (n: number) => string;
  rangeLabel: string;
}) {
  const byStockId = new Map((params.stockItems ?? []).map((s) => [String(s.id), s] as const));
  const bySupplierId = supplierLookup(params.suppliers ?? []);
  const fromGrv = latestSupplierByItemId(params.grvs ?? []);

  const groups = new Map<string, PurchasePlanRow[]>();
  const supplierNameById = new Map<string, string>();

  for (const r of params.plan.rows) {
    const stock = byStockId.get(String(r.itemId));
    const explicit = String(stock?.supplierId ?? '').trim();
    const derived = fromGrv.get(String(r.itemId));

    const supplierId = explicit || derived?.supplierId || 'unknown';
    const supplierName =
      (explicit && bySupplierId.get(supplierId)?.name) ||
      derived?.supplierName ||
      'Unassigned supplier';

    if (!groups.has(supplierId)) groups.set(supplierId, []);
    groups.get(supplierId)!.push(r);
    supplierNameById.set(supplierId, supplierName);
  }

  const drafts: SupplierPurchaseOrderDraft[] = [];
  for (const [supplierId, rows] of groups.entries()) {
    const supplier = bySupplierId.get(supplierId);
    const supplierName = supplier?.name ?? supplierNameById.get(supplierId) ?? 'Supplier';

    const totals = {
      estCost: round2(rows.reduce((sum, r) => sum + r.estCost, 0)),
      lines: rows.length,
    };

    const plan: PurchasePlan = {
      horizonDays: params.plan.horizonDays,
      generatedAt: params.plan.generatedAt,
      rows: rows.slice().sort((a, b) => b.estCost - a.estCost),
      totals,
      unmappedSoldItems: params.plan.unmappedSoldItems,
    };

    const header = `Purchase Order Request (${params.rangeLabel})\nHorizon: ${plan.horizonDays}d • Lines: ${plan.totals.lines} • Est: ${params.formatMoney(
      plan.totals.estCost
    )}`;

    const lines = plan.rows
      .slice(0, 30)
      .map((r) => `- ${r.name} (${r.unitType}) x ${r.suggestedOrderQty}  •  Est ${params.formatMoney(r.estCost)}`)
      .join('\n');

    const message = `${header}\n\nItems:\n${lines}`;

    drafts.push({
      supplierId,
      supplierName,
      supplierCode: supplier?.code,
      phone: supplier?.phone,
      email: supplier?.email,
      plan,
      message,
    });
  }

  drafts.sort((a, b) => b.plan.totals.estCost - a.plan.totals.estCost);
  return drafts;
}
