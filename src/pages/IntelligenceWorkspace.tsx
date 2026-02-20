import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Responsive, WidthProvider, type Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useNavigate } from 'react-router-dom';

import { LayoutGrid, Pencil, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { useAuth } from '@/contexts/AuthContext';
import { subscribeFeatureFlags, getFeatureFlagsSnapshot, setFeatureEnabled } from '@/lib/featureFlagsStore';
import { loadUserPreference, saveUserPreference } from '@/lib/userPreferences';
import { useIntelligence } from '@/hooks/useIntelligence';

import { PurpleDashboardLayout } from '@/components/intelligence/PurpleDashboardLayout';
import { NeonWidgetFrame } from '@/components/intelligence/NeonWidgetFrame';
import { AnalysisDialog, type AnalysisModel } from '@/components/intelligence/AnalysisDialog';
import { AutopilotWidget } from '@/components/intelligence/widgets/AutopilotWidget';
import { KpiStripWidget } from '@/components/intelligence/widgets/KpiStripWidget';
import { MoneyFlowSankeyWidget } from '@/components/intelligence/widgets/MoneyFlowSankeyWidget';
import { MenuEngineeringWidget } from '@/components/intelligence/widgets/MenuEngineeringWidget';
import { GoldenHourHeatmapWidget } from '@/components/intelligence/widgets/GoldenHourHeatmapWidget';
import { PredictiveInventoryWidget } from '@/components/intelligence/widgets/PredictiveInventoryWidget';
import { StaffEfficiencyWidget } from '@/components/intelligence/widgets/StaffEfficiencyWidget';
import { DonutChartWidget } from '@/components/intelligence/widgets/DonutChartWidget';
import { AreaChartWidget } from '@/components/intelligence/widgets/AreaChartWidget';
import { BarChartWidget } from '@/components/intelligence/widgets/BarChartWidget';
import { FilterWidget, type IntelligenceShiftFilter } from '@/components/intelligence/widgets/FilterWidget';
import { useCurrency } from '@/contexts/CurrencyContext';

import { generateInsights, type Insight } from '@/lib/intelligenceInsights';
import { generatePurchasePlan, generateSupplierPurchaseOrders } from '@/lib/purchasePlanner';
import { suppliers } from '@/data/mockData';
import { buildMailtoUrl, buildWhatsAppUrl } from '@/lib/opsLinks';
import type { WeeklyReportData } from '@/lib/opsPdf';

const ResponsiveGridLayout = WidthProvider(Responsive);

type WorkspacePrefV1 = {
  version: 1;
  visible: string[];
  layouts: Layouts;
};

const PREF_KEY = 'intelligence.workspace.v1';

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysLocal(key: string, days: number) {
  const [yyyy, mm, dd] = key.split('-').map((x) => Number(x));
  const d = new Date(yyyy, (mm || 1) - 1, dd || 1);
  d.setDate(d.getDate() + days);
  return dateKeyLocal(d);
}

const DEFAULT_VISIBLE = ['filters', 'kpis', 'profitTrend', 'salesCat', 'topProducts', 'salesType', 'moneyFlow'];

const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: 'filters', x: 0, y: 0, w: 2, h: 26, minH: 10 },
    { i: 'autopilot', x: 0, y: 26, w: 2, h: 10, minH: 8 },
    { i: 'kpis', x: 2, y: 0, w: 10, h: 4, minH: 3 },
    { i: 'profitTrend', x: 2, y: 4, w: 7, h: 10, minH: 8 },
    { i: 'salesCat', x: 9, y: 4, w: 3, h: 10, minH: 8 },
    { i: 'topProducts', x: 2, y: 14, w: 5, h: 10, minH: 8 },
    { i: 'salesType', x: 7, y: 14, w: 5, h: 10, minH: 8 },
    { i: 'moneyFlow', x: 2, y: 24, w: 10, h: 12, minH: 10 },
  ],
  md: [
    { i: 'kpis', x: 0, y: 0, w: 10, h: 4, minH: 3 },
    { i: 'profitTrend', x: 0, y: 4, w: 10, h: 10, minH: 8 },
    { i: 'salesCat', x: 0, y: 14, w: 5, h: 10, minH: 8 },
    { i: 'topProducts', x: 5, y: 14, w: 5, h: 10, minH: 8 },
    { i: 'salesType', x: 0, y: 24, w: 10, h: 10, minH: 8 },
    { i: 'filters', x: 0, y: 34, w: 10, h: 8, minH: 6 },
    { i: 'autopilot', x: 0, y: 42, w: 10, h: 10, minH: 8 },
  ],
};

function mergeMissingLayouts(visible: string[], layouts: Layouts) {
  const out: Layouts = { ...layouts };
  const breakpoints = Object.keys(DEFAULT_LAYOUTS) as Array<keyof typeof DEFAULT_LAYOUTS>;

  for (const bp of breakpoints) {
    const existing = out[bp] ?? [];
    const byId = new Map(existing.map((l) => [l.i, l] as const));

    for (const id of visible) {
      if (byId.has(id)) continue;
      const fallback = (DEFAULT_LAYOUTS[bp] ?? []).find((l) => l.i === id);
      // Fallback relative placement if not explicitly defined
      const fb = fallback ?? { i: id, x: 0, y: Infinity, w: 6, h: 10 };
      byId.set(id, { ...fb });
    }

    out[bp] = [...byId.values()].filter((l) => visible.includes(l.i));
  }

  return out;
}

export default function IntelligenceWorkspace() {
  const { user, hasPermission } = useAuth();
  const { formatMoney } = useCurrency();
  const navigate = useNavigate();
  const flags = useSyncExternalStore(subscribeFeatureFlags, getFeatureFlagsSnapshot, getFeatureFlagsSnapshot);
  const enabled = Boolean(flags.flags.intelligenceWorkspace);

  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisModel, setAnalysisModel] = useState<AnalysisModel | null>(null);

  const openAnalysis = (model: AnalysisModel) => {
    // Ensure every analysis view includes automated insights unless explicitly provided.
    const ensured: AnalysisModel = {
      ...model,
      insights: model.insights?.length ? model.insights : generateInsights(intel, money),
    };
    setAnalysisModel(ensured);
    setAnalysisOpen(true);
  };

  const money = (n: number) => formatMoney(n);

  const today = useMemo(() => dateKeyLocal(new Date()), []);
  const [startDate, setStartDate] = useState<string>(() => addDaysLocal(today, -30));
  const [endDate, setEndDate] = useState<string>(() => today);

  const [shift, setShift] = useState<IntelligenceShiftFilter>('all');
  const [minGpPercent, setMinGpPercent] = useState(0);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const intel = useIntelligence(
    { startDate, endDate },
    {
      shift,
      minGpPercent,
      categoryIds: selectedCategoryIds,
    }
  );

  const openGlobalAnalysis = () => {
    const top = intel.menuEngineering.points.slice(0, 5);
    const loss = intel.menuEngineering.points.filter((p) => p.profit < 0).slice(0, 5);

    openAnalysis({
      title: 'System Analysis',
      subtitle: `${intel.range.startDate} → ${intel.range.endDate}`,
      insights: generateInsights(intel, money),
      metrics: [
        { label: 'Turnover', value: money(intel.kpis.turnover) },
        { label: 'Gross Profit', value: money(intel.kpis.grossProfit) },
        {
          label: 'GP%',
          value: `${intel.kpis.gpPercent.toFixed(1)}%`,
          tone: intel.kpis.gpPercent >= 55 ? 'good' : intel.kpis.gpPercent >= 35 ? 'neutral' : 'warn',
        },
        { label: 'Net Profit', value: money(intel.kpis.netProfit), tone: intel.kpis.netProfit >= 0 ? 'good' : 'bad' },
      ],
      rows: [
        ...top.map((p) => ({ label: p.name, value: money(p.sales), hint: `Top seller • ${p.quadrant}` })),
        ...loss.map((p) => ({ label: p.name, value: money(Math.abs(p.profit)), hint: 'Negative margin • investigate cost/price' })),
      ],
      recommendation:
        intel.kpis.gpPercent < 35
          ? 'Gross margin is low. Audit recipe costs, check supplier pricing, and consider small price increases on Stars/Puzzles.'
          : 'Maintain pricing discipline and push Stars (high profit + high volume). Review Dogs for removal or repositioning.',
    });
  };

  const openOpsCenter = (horizonDays: number) => {
    const insights = generateInsights(intel, money);
    const plan = generatePurchasePlan({ intel, horizonDays });
    const supplierOrders = generateSupplierPurchaseOrders({
      plan,
      stockItems: intel.stockItems,
      grvs: intel.grvs,
      suppliers,
      formatMoney: money,
      rangeLabel: `${intel.range.startDate} → ${intel.range.endDate}`,
    });

    const top = intel.menuEngineering.points.slice(0, 5);
    const loss = intel.menuEngineering.points
      .filter((p) => p.profit < 0)
      .slice(0, 5);

    const report: WeeklyReportData = {
      title: 'Weekly Operations Report',
      subtitle: `${intel.range.startDate} → ${intel.range.endDate}`,
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: 'Turnover', value: money(intel.kpis.turnover) },
        { label: 'Gross Profit', value: money(intel.kpis.grossProfit) },
        { label: 'GP%', value: `${intel.kpis.gpPercent.toFixed(1)}%` },
        { label: 'Net Profit', value: money(intel.kpis.netProfit) },
      ],
      insightsTop: insights.slice(0, 6).map((i) => ({ tone: i.tone.toUpperCase(), title: i.title, summary: i.summary })),
      topItems: top.map((p) => ({ name: p.name, value: money(p.sales), note: `Top seller • ${p.quadrant}` })),
      lossItems: loss.map((p) => ({ name: p.name, value: money(Math.abs(p.profit)), note: 'Negative margin' })),
      categories: intel.salesByCategory.slice(0, 8).map((c) => ({ name: c.name, value: money(c.value) })),
    };

    const msg =
      `Mthunzi Ops Digest (${intel.range.startDate} → ${intel.range.endDate})\n` +
      `Turnover: ${money(intel.kpis.turnover)}\n` +
      `GP: ${money(intel.kpis.grossProfit)} (${intel.kpis.gpPercent.toFixed(1)}%)\n` +
      `Net: ${money(intel.kpis.netProfit)}\n\n` +
      `Top insights:\n` +
      insights
        .slice(0, 4)
        .map((i) => `- ${i.title}: ${i.summary}`)
        .join('\n') +
      `\n\nPurchase plan (${plan.horizonDays}d): ${plan.totals.lines} lines • Est ${money(plan.totals.estCost)}`;

    openAnalysis({
      title: 'Ops Center',
      subtitle: `${intel.range.startDate} → ${intel.range.endDate}`,
      insights,
      metrics: [
        { label: 'Turnover', value: money(intel.kpis.turnover) },
        { label: 'Gross Profit', value: money(intel.kpis.grossProfit) },
        {
          label: 'GP%',
          value: `${intel.kpis.gpPercent.toFixed(1)}%`,
          tone: intel.kpis.gpPercent >= 55 ? 'good' : intel.kpis.gpPercent >= 35 ? 'neutral' : 'warn',
        },
        { label: 'Net Profit', value: money(intel.kpis.netProfit), tone: intel.kpis.netProfit >= 0 ? 'good' : 'bad' },
      ],
      purchasePlan: { plan, totalCostLabel: money(plan.totals.estCost), money },
      supplierOrders,
      supplierMapping: intel.supplierMapping,
      weeklyReport: report,
      shareLinks: {
        whatsappUrl: buildWhatsAppUrl(msg),
        emailUrl: buildMailtoUrl({ subject: `Mthunzi Ops Digest (${intel.range.startDate} → ${intel.range.endDate})`, body: msg }),
      },
    });

    try {
      localStorage.setItem('intelligence.weeklyDigest.lastAt', new Date().toISOString());
    } catch {
      // ignore
    }
  };

  const [visible, setVisible] = useState<string[]>(() => DEFAULT_VISIBLE.slice());
  const [layouts, setLayouts] = useState<Layouts>(() => ({ ...DEFAULT_LAYOUTS }));
  const [addOpen, setAddOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const prefUserId = user?.id ?? 'local';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadUserPreference<WorkspacePrefV1>({
        userId: prefUserId,
        key: PREF_KEY,
        fallback: { version: 1, visible: DEFAULT_VISIBLE, layouts: DEFAULT_LAYOUTS },
      });
      if (cancelled) return;
      setVisible(Array.isArray(loaded.visible) && loaded.visible.length ? loaded.visible : DEFAULT_VISIBLE.slice());
      setLayouts(mergeMissingLayouts(loaded.visible ?? DEFAULT_VISIBLE, loaded.layouts ?? DEFAULT_LAYOUTS));
    })();
    return () => {
      cancelled = true;
    };
  }, [prefUserId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void saveUserPreference<WorkspacePrefV1>({
        userId: prefUserId,
        key: PREF_KEY,
        value: { version: 1, visible, layouts },
      });
    }, 600);
    return () => window.clearTimeout(t);
  }, [prefUserId, visible, layouts]);

  const widgets = useMemo(() => {
    // Top 5 products by sales
    const topProductsData = intel.menuEngineering.points.slice(0, 10).map((p) => ({
      name: p.name,
      value: p.sales,
    }));

    // Loss leaders (negative profit)
    const lossProductsData = intel.menuEngineering.points
      .filter((p) => p.profit < 0)
      .slice(0, 10)
      .map((p) => ({ name: p.name, value: Math.abs(p.profit) }));

    return {
      autopilot: {
        title: 'AutoPilot',
        subtitle: 'Automations + Alerts',
        render: () => (
          <AutopilotWidget
            intel={intel}
            formatMoney={money}
            onOpenInsights={(insights: Insight[]) =>
              openAnalysis({
                title: 'Insight Mode',
                subtitle: `${intel.range.startDate} → ${intel.range.endDate}`,
                insights,
                metrics: [
                  { label: 'Turnover', value: money(intel.kpis.turnover) },
                  { label: 'Gross Profit', value: money(intel.kpis.grossProfit) },
                  { label: 'Net Profit', value: money(intel.kpis.netProfit), tone: intel.kpis.netProfit >= 0 ? 'good' : 'bad' },
                ],
              })
            }
            onOpenOpsCenter={openOpsCenter}
          />
        ),
      },
      filters: {
        title: 'Smart Filters',
        subtitle: 'Refine Analysis',
        render: () => (
          <FilterWidget
            categories={intel.pos.categories.map((c) => ({ id: c.id, name: c.name }))}
            selectedCategoryIds={selectedCategoryIds}
            onSelectedCategoryIdsChange={setSelectedCategoryIds}
            minGpPercent={minGpPercent}
            onMinGpPercentChange={setMinGpPercent}
            shift={shift}
            onShiftChange={setShift}
          />
        ),
      },
      kpis: {
        title: 'Overview',
        subtitle: 'Key Performance Indicators',
        render: () => <KpiStripWidget intel={intel} />,
      },
      profitTrend: {
        title: 'Profit Trend',
        subtitle: 'Gross Profit over time',
        render: () => (
          <AreaChartWidget
            title="Profit Trend"
            data={intel.profitByDate}
            xAxisKey="date"
            dataKey="profit"
            color="#d946ef"
            valueFormatter={money}
            onPointClick={(point) => {
              const dayKey = point.label;
              const dayOrders = intel.orders.filter((o) => dateKeyLocal(new Date(o.paidAt ?? o.createdAt)) === dayKey);
              const sales = dayOrders.reduce((acc, o) => acc + (Number.isFinite(o.total) ? o.total : 0), 0);
              const cost = dayOrders.reduce((acc, o) => acc + (Number.isFinite(o.totalCost) ? o.totalCost : 0), 0);
              const gp = sales - cost;
              const gpPct = sales > 0 ? (gp / sales) * 100 : 0;

              const itemMap = new Map<string, { name: string; sales: number; cost: number; qty: number }>();
              for (const o of dayOrders) {
                for (const it of o.items ?? []) {
                  const key = it.menuItemId || it.menuItemCode || it.id;
                  const name = it.menuItemName ?? key;
                  const qty = Number.isFinite(it.quantity) ? it.quantity : 0;
                  const lineSales = Number.isFinite(it.total) ? it.total : 0;
                  const lineCost = qty * (Number.isFinite(it.unitCost) ? it.unitCost : 0);
                  const prev = itemMap.get(key) ?? { name, sales: 0, cost: 0, qty: 0 };
                  itemMap.set(key, {
                    name: prev.name,
                    sales: prev.sales + lineSales,
                    cost: prev.cost + lineCost,
                    qty: prev.qty + qty,
                  });
                }
              }

              const topItems = Array.from(itemMap.values())
                .map((r) => ({
                  name: r.name,
                  sales: r.sales,
                  profit: r.sales - r.cost,
                }))
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 10);

              openAnalysis({
                title: `Daily Breakdown: ${dayKey}`,
                subtitle: `${dayOrders.length} tickets • Click other points to compare`,
                metrics: [
                  { label: 'Turnover', value: money(sales) },
                  { label: 'Gross Profit', value: money(gp), tone: gp >= 0 ? 'good' : 'bad' },
                  { label: 'GP%', value: `${gpPct.toFixed(1)}%`, tone: gpPct >= 55 ? 'good' : gpPct >= 35 ? 'neutral' : 'warn' },
                ],
                rows: topItems.map((x) => ({
                  label: x.name,
                  value: `${money(x.sales)} • Profit ${money(x.profit)}`,
                  hint: x.profit >= 0 ? 'Healthy margin' : 'Negative margin',
                })),
                recommendation:
                  gpPct < 35
                    ? 'Margin dipped on this day. Review discounting, recipe costs, and loss leaders.'
                    : 'Strong day. Identify which top items drove performance and replicate promotion/placement.',
              });
            }}
          />
        ),
      },
      salesCat: {
        title: 'Sales by Category',
        subtitle: 'Share of revenue',
        render: () => (
          <DonutChartWidget
            title="Sales by Category"
            data={intel.salesByCategory}
            valueFormatter={money}
            onSliceClick={(slice) => {
              openAnalysis({
                title: `Category: ${slice.name}`,
                subtitle: 'Revenue share insight',
                metrics: [
                  { label: 'Revenue', value: money(slice.value) },
                  { label: 'Share', value: `${((slice.value / Math.max(1, intel.kpis.turnover)) * 100).toFixed(1)}%` },
                ],
                recommendation: 'Compare categories to decide where to push promos and menu placement.',
              });
            }}
          />
        ),
      },
      salesType: {
        title: 'Order Types',
        subtitle: 'Eat-in vs Take-away',
        render: () => (
          <DonutChartWidget
            title="Order Types"
            data={intel.salesByOrderType}
            valueFormatter={money}
            onSliceClick={(slice) => {
              openAnalysis({
                title: `Order Type: ${slice.name}`,
                subtitle: 'Channel mix analysis',
                metrics: [
                  { label: 'Revenue', value: money(slice.value) },
                  { label: 'Share', value: `${((slice.value / Math.max(1, intel.kpis.turnover)) * 100).toFixed(1)}%` },
                ],
                recommendation:
                  'Use this channel split for staffing and packaging decisions. Click the other slice to compare.',
              });
            }}
          />
        ),
      },
      topProducts: {
        title: 'Top Products',
        subtitle: 'By Sales Revenue',
        render: () => (
          <BarChartWidget
            title="Top Products"
            layout="vertical"
            data={topProductsData}
            xAxisKey="name"
            color="#8b5cf6"
            valueFormatter={money}
            onBarClick={(bar) => {
              const found = intel.menuEngineering.points.find((p) => p.name === bar.name);
              const profit = found?.profit ?? 0;

              openAnalysis({
                title: `Product: ${bar.name}`,
                subtitle: 'Sales + margin snapshot',
                metrics: [
                  { label: 'Sales', value: money(bar.value) },
                  {
                    label: 'Quadrant',
                    value: found?.quadrant ?? 'Unknown',
                    tone: found?.quadrant === 'Star' ? 'good' : found?.quadrant === 'Dog' ? 'warn' : 'neutral',
                  },
                  { label: 'Profit', value: money(profit), tone: profit >= 0 ? 'good' : 'bad' },
                ],
                recommendation:
                  found?.quadrant === 'Star'
                    ? 'Push this item harder: prime menu position + suggestive selling.'
                    : found?.quadrant === 'Plowhorse'
                      ? 'High volume but low profit per item. Consider small price lift or reduce portion cost.'
                      : found?.quadrant === 'Puzzle'
                        ? 'High profit per item but low volume. Improve visibility, rename, or add combo.'
                        : 'Low volume + low profit. Consider removing, redesigning, or replacing.',
              });
            }}
          />
        ),
      },
      lossProducts: {
        title: 'Loss Leaders',
        subtitle: 'Products with negative margin',
        render: () => (
          <BarChartWidget
            title="Loss Leaders"
            layout="vertical"
            data={lossProductsData}
            xAxisKey="name"
            color="#ef4444"
            valueFormatter={money}
            onBarClick={(bar) => {
              const found = intel.menuEngineering.points.find((p) => p.name === bar.name);
              const profit = found?.profit ?? -bar.value;

              openAnalysis({
                title: `Loss Leader: ${bar.name}`,
                subtitle: 'Negative margin alert',
                metrics: [
                  { label: 'Loss', value: money(Math.abs(profit)), tone: 'bad' },
                  { label: 'Sales', value: money(found?.sales ?? 0) },
                ],
                recommendation:
                  'Check ingredient costs (WAC), portion size, and supplier pricing. If needed, increase price slightly or remove from menu.',
              });
            }}
          />
        ),
      },
      moneyFlow: {
        title: 'Money Flow',
        subtitle: 'Sankey Diagram',
        render: () => <MoneyFlowSankeyWidget intel={intel} />,
      },
      menuEngineering: {
        title: 'Menu Engineering',
        subtitle: 'Matrix',
        render: () => <MenuEngineeringWidget intel={intel} />,
      },
      goldenHour: {
        title: 'Golden Hour',
        subtitle: 'Heatmap',
        render: () => <GoldenHourHeatmapWidget intel={intel} />,
      },
      predictive: {
        title: 'Predictive Stock',
        subtitle: 'Forecast',
        render: () => <PredictiveInventoryWidget intel={intel} />,
      },
      staff: {
        title: 'Staff Efficiency',
        subtitle: 'Performance',
        render: () => <StaffEfficiencyWidget intel={intel} />,
      },
    } as const;
  }, [intel]);

  const availableWidgetIds = Object.keys(widgets) as Array<keyof typeof widgets>;
  const hiddenWidgetIds = availableWidgetIds.filter((id) => !visible.includes(id));

  const resetLayout = () => {
    setVisible(DEFAULT_VISIBLE.slice());
    setLayouts({ ...DEFAULT_LAYOUTS });
  };

  const removeWidget = (id: string) => {
    setVisible((prev) => {
      const next = prev.filter((x) => x !== id);
      setLayouts((cur) => mergeMissingLayouts(next, cur));
      return next;
    });
  };

  const addWidget = (id: string) => {
    setVisible((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      setLayouts((cur) => mergeMissingLayouts(next, cur));
      return next;
    });
  };

  if (!hasPermission('manageSettings')) {
    return (
      <PurpleDashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white">Access Restricted</h2>
            <p className="text-purple-200/60">This workspace is restricted to owners only.</p>
          </div>
        </div>
      </PurpleDashboardLayout>
    );
  }

  if (!enabled) {
    return (
      <PurpleDashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-6 p-10 rounded-3xl bg-[#2e1065]/50 border border-purple-500/30 backdrop-blur-xl shadow-[0_0_50px_rgba(168,85,247,0.2)] max-w-lg mx-auto">
            <div className="h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
               <span className="text-2xl">✨</span>
            </div>
            <h2 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-tr from-white to-purple-400">
               Initialize Intelligence
            </h2>
            <p className="text-purple-200/70 text-lg leading-relaxed">
               Activate the neur-network to begin real-time business analysis and predictive stock logic.
            </p>
            {hasPermission('manageSettings') && (
               <Button 
                onClick={() => setFeatureEnabled('intelligenceWorkspace', true)}
                size="lg"
                className="bg-white text-purple-950 hover:bg-purple-50 font-bold border-0 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                  Enable System
               </Button>
            )}
          </div>
        </div>
      </PurpleDashboardLayout>
    );
  }

  return (
    <PurpleDashboardLayout onAnalyze={openGlobalAnalysis}>
      <AnalysisDialog open={analysisOpen} onOpenChange={setAnalysisOpen} model={analysisModel} />
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           {/* spacer or left side content if needed, currently empty as title is in header */}
           <div className="flex items-center gap-3">
             <Badge variant={intel.livePulse ? 'default' : 'outline'} className={intel.livePulse ? "bg-green-500/20 text-green-300 border-green-500/30 animate-pulse" : "text-gray-400"}>
                {intel.livePulse ? '● LIVE DATA FEED' : '○ SYNCED'}
             </Badge>

             {intel.supplierMapping ? (
               <Badge
                 variant="outline"
                 className={
                   intel.supplierMapping.unassigned > 0
                     ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                     : 'bg-white/5 text-purple-200 border-white/10'
                 }
               >
                 Supplier map {intel.supplierMapping.assignedPct.toFixed(0)}% • {intel.supplierMapping.unassigned} unassigned
               </Badge>
             ) : null}
           </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md shadow-lg">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-[130px] bg-transparent border-none text-white focus-visible:ring-0 text-center font-medium"
            />
            <span className="text-xs text-purple-300/50 font-bold">TO</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-[130px] bg-transparent border-none text-white focus-visible:ring-0 text-center font-medium"
            />
          </div>
          
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-[#2e1065]/50 border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-white hover:border-purple-400/50 backdrop-blur-md transition-all shadow-lg">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a0b2e]/95 border-purple-500/20 text-white backdrop-blur-xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-purple-100">Add Widgets</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-2">
                {hiddenWidgetIds.length ? (
                  hiddenWidgetIds.map((id) => (
                    <div
                      key={id}
                      onClick={() => addWidget(id)}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-purple-600/20 cursor-pointer border border-white/5 hover:border-purple-500/30 transition-all group"
                    >
                      <div>
                        <div className="font-bold text-sm text-purple-50 group-hover:text-white">{widgets[id].title}</div>
                        <div className="text-xs text-purple-300/60 group-hover:text-purple-200">{widgets[id].subtitle}</div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-purple-300 group-hover:bg-purple-500 group-hover:text-white transition-all">
                        +
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-purple-300/50 text-center py-8 italic">All available widgets are active.</div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant={editMode ? 'default' : 'outline'}
            onClick={() => setEditMode((v) => !v)}
            className={
              editMode
                ? 'bg-purple-500 text-white hover:bg-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.35)]'
                : 'bg-[#2e1065]/50 border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-white hover:border-purple-400/50 backdrop-blur-md transition-all shadow-lg'
            }
            title={editMode ? 'Exit edit mode' : 'Edit dashboard (move/remove widgets)'}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {editMode ? 'Done' : 'Edit Dashboard'}
          </Button>

          {intel.supplierMapping?.unassigned ? (
            <Button
              variant="outline"
              onClick={() => navigate('/inventory/items?supplier=none')}
              className="bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20 hover:text-white hover:border-amber-400/50 backdrop-blur-md transition-all shadow-lg"
              title="Fix missing supplier mappings"
            >
              Fix suppliers ({intel.supplierMapping.unassigned})
            </Button>
          ) : null}

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={resetLayout} 
            title="Reset layout" 
            className="text-purple-300/50 hover:text-white hover:bg-white/10 rounded-full"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ResponsiveGridLayout
        className="layout pb-40"
        layouts={mergeMissingLayouts(visible, layouts)}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        margin={[20, 20]}
        containerPadding={[0, 0]}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle={editMode ? '.iw-drag' : undefined}
        onLayoutChange={(_, allLayouts) => setLayouts(allLayouts)}
        resizeHandle={
          editMode ? (
            <div className="react-resizable-handle react-resizable-handle-se bg-purple-500/50 w-4 h-4 rounded-full absolute bottom-2 right-2 cursor-se-resize hover:bg-white hover:scale-125 transition-all shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          ) : undefined
        }
      >
        {visible
          .filter((id) => id in widgets)
          .map((id) => {
            const w = widgets[id as keyof typeof widgets];
            return (
              <div key={id} className="transition-opacity animate-in fade-in duration-500">
                <NeonWidgetFrame
                  title={w.title}
                  subtitle={w.subtitle}
                  onRemove={visible.length > 1 ? () => removeWidget(id) : undefined}
                  controlsVisible={editMode}
                  dragHandleClassName={editMode ? 'iw-drag cursor-move' : undefined}
                >
                  {w.render()}
                </NeonWidgetFrame>
              </div>
            );
          })}
      </ResponsiveGridLayout>
    </PurpleDashboardLayout>
  );
}
