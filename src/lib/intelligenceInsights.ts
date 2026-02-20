import type { UseIntelligenceReturn } from '@/hooks/useIntelligence';

export type InsightTone = 'good' | 'warn' | 'bad' | 'neutral';

export type Insight = {
  id: string;
  tone: InsightTone;
  title: string;
  summary: string;
  evidence?: string[];
  actions?: string[];
  metrics?: Array<{ label: string; value: string }>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(n: number) {
  if (!Number.isFinite(n)) return '0.0%';
  return `${n.toFixed(1)}%`;
}

function changePct(current: number, prev: number) {
  const denom = Math.max(1e-9, Math.abs(prev));
  return ((current - prev) / denom) * 100;
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

export function generateInsights(
  intel: UseIntelligenceReturn,
  formatMoney: (n: number) => string
): Insight[] {
  const insights: Insight[] = [];

  // 1) Profitability
  if (intel.kpis.netProfit < 0) {
    const lossAbs = Math.abs(intel.kpis.netProfit);
    insights.push({
      id: 'net-profit-negative',
      tone: 'bad',
      title: 'Net profit is negative',
      summary: `You are down ${formatMoney(lossAbs)} for this period. Focus on margin leaks and loss leaders first.`,
      evidence: [
        `Turnover: ${formatMoney(intel.kpis.turnover)}`,
        `Gross profit: ${formatMoney(intel.kpis.grossProfit)} (${pct(intel.kpis.gpPercent)})`,
      ],
      actions: [
        'Review loss leaders and fix recipe/WAC costs or pricing.',
        'Check discounting and comps for this date range.',
        'Compare last 7 days vs previous 7 days to find the drop.',
      ],
    });
  } else {
    insights.push({
      id: 'net-profit-positive',
      tone: 'good',
      title: 'Net profit is positive',
      summary: `You are up ${formatMoney(intel.kpis.netProfit)} for this period. Double down on the items and hours driving this outcome.`,
      evidence: [`Gross profit: ${formatMoney(intel.kpis.grossProfit)} (${pct(intel.kpis.gpPercent)})`],
      actions: ['Promote Stars and keep pricing disciplined.', 'Protect the peak-hour staffing and prep routines.'],
    });
  }

  // 2) Data quality (super-high GP% usually means missing costs)
  if (intel.kpis.gpPercent > 90) {
    insights.push({
      id: 'gp-too-high',
      tone: 'warn',
      title: 'GP% is unusually high (possible missing costs)',
      summary:
        'A GP% this high often means recipe costs/WAC are missing or not applied to some items. Verify unit costs, recipes, and GRVs.',
      actions: [
        'Confirm every sold menu item has a recipe or unit cost mapping.',
        'Confirm GRVs are confirmed and include unit costs.',
        'Check if some orders/items have totalCost = 0.',
      ],
    });
  }

  // 3) Trend comparison (last 7 days vs previous 7 days within the selected range)
  const series = intel.profitByDate ?? [];
  if (series.length >= 14) {
    const last7 = series.slice(-7);
    const prev7 = series.slice(-14, -7);

    const lastSales = sum(last7.map((d) => d.sales ?? 0));
    const prevSales = sum(prev7.map((d) => d.sales ?? 0));
    const lastProfit = sum(last7.map((d) => d.profit ?? 0));
    const prevProfit = sum(prev7.map((d) => d.profit ?? 0));

    const salesChg = changePct(lastSales, prevSales);
    const profitChg = changePct(lastProfit, prevProfit);

    const salesTone: InsightTone = salesChg >= 10 ? 'good' : salesChg <= -10 ? 'bad' : 'neutral';
    const profitTone: InsightTone = profitChg >= 10 ? 'good' : profitChg <= -10 ? 'bad' : 'neutral';

    insights.push({
      id: 'trend-7v7',
      tone: profitTone === 'bad' || salesTone === 'bad' ? 'warn' : 'neutral',
      title: 'Momentum (last 7 days vs previous 7 days)',
      summary: `Sales ${salesChg >= 0 ? 'up' : 'down'} ${pct(Math.abs(salesChg))}, profit ${profitChg >= 0 ? 'up' : 'down'} ${pct(
        Math.abs(profitChg)
      )}.`,
      metrics: [
        { label: 'Last 7d sales', value: formatMoney(lastSales) },
        { label: 'Prev 7d sales', value: formatMoney(prevSales) },
        { label: 'Last 7d profit', value: formatMoney(lastProfit) },
        { label: 'Prev 7d profit', value: formatMoney(prevProfit) },
      ],
      actions:
        salesChg <= -10 || profitChg <= -10
          ? ['Click the dip days on Profit Trend for a daily breakdown.', 'Check category mix and loss leaders for those days.']
          : ['Keep doing what works: replicate peak-day promos and ensure stock coverage.'],
    });
  }

  // 4) Category concentration
  const cats = intel.salesByCategory ?? [];
  if (cats.length >= 2) {
    const top = cats[0];
    const total = Math.max(1, intel.kpis.turnover);
    const share = (top.value / total) * 100;

    if (share >= 60) {
      insights.push({
        id: 'cat-concentration',
        tone: 'warn',
        title: 'Revenue is concentrated in one category',
        summary: `${top.name} contributes ${pct(share)} of turnover. Concentration increases risk (stockouts, supplier issues, price sensitivity).`,
        actions: [
          'Protect availability of top-category ingredients (safety stock).',
          'Cross-sell from adjacent categories to reduce concentration risk.',
        ],
      });
    }
  }

  // 5) Loss leaders
  const lossLeaders = intel.menuEngineering.points.filter((p) => p.profit < 0);
  if (lossLeaders.length) {
    const worst = lossLeaders
      .slice()
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 5);

    const lossTotal = Math.abs(sum(worst.map((x) => x.profit)));
    insights.push({
      id: 'loss-leaders',
      tone: lossTotal > 0 ? 'bad' : 'neutral',
      title: 'Loss leaders detected',
      summary: `Top loss items are costing you about ${formatMoney(lossTotal)} in profit on the worst offenders.`,
      evidence: worst.map((x) => `${x.name}: ${formatMoney(Math.abs(x.profit))} loss • Sales ${formatMoney(x.sales)}`),
      actions: [
        'Verify recipe/WAC costs for these items (most common cause).',
        'If costs are correct, adjust price or remove/reposition the item.',
      ],
    });
  }

  // 6) Menu engineering quadrant balance
  const points = intel.menuEngineering.points;
  if (points.length) {
    const counts = points.reduce(
      (acc, p) => {
        acc[p.quadrant] = (acc[p.quadrant] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const dogs = counts['Dog'] ?? 0;
    const stars = counts['Star'] ?? 0;
    const ratio = stars / Math.max(1, dogs);

    insights.push({
      id: 'quadrants',
      tone: ratio >= 1 ? 'good' : dogs >= 5 ? 'warn' : 'neutral',
      title: 'Menu engineering balance',
      summary: `Stars: ${stars} • Dogs: ${dogs}. Aim to grow Stars and reduce Dogs over time.`,
      actions:
        dogs >= 5
          ? ['Remove or redesign Dogs (rename, recipe cost control, positioning).', 'Promote Stars in combos and suggestive selling.']
          : ['Keep promoting Stars and test a small price lift on Plowhorses.'],
    });
  }

  // 7) Golden hour (peak revenue hour)
  if (intel.goldenHour?.cells?.length) {
    const best = intel.goldenHour.cells
      .slice()
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .find((x) => (x.value ?? 0) > 0);

    if (best) {
      const hour = String(best.hour).padStart(2, '0');
      const dowName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][best.dow] ?? 'Day';
      insights.push({
        id: 'golden-hour',
        tone: 'neutral',
        title: 'Golden hour staffing opportunity',
        summary: `Your peak window is ${dowName} around ${hour}:00 with ${formatMoney(best.value ?? 0)} sales. Staff and prep should peak 30–60 min before.`,
        actions: ['Align prep and staffing to protect throughput and speed.', 'Ensure top sellers are prepped before the rush.'],
      });
    }
  }

  // Keep it tidy: limit to most valuable insights
  const priority = (t: InsightTone) => (t === 'bad' ? 3 : t === 'warn' ? 2 : t === 'good' ? 1 : 0);
  return insights
    .slice()
    .sort((a, b) => priority(b.tone) - priority(a.tone))
    .slice(0, 10);
}

export function summarizeAutomationState(raw: unknown) {
  const obj = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const autoOpen = Boolean(obj.autoOpenOnAnomaly);
  const weekly = Boolean(obj.weeklyDigest);
  const costChecks = Boolean(obj.costCompletenessChecks);

  const enabledCount = [autoOpen, weekly, costChecks].filter(Boolean).length;
  return { autoOpen, weekly, costChecks, enabledCount };
}

export function defaultAutomationState() {
  return {
    autoOpenOnAnomaly: false,
    weeklyDigest: true,
    costCompletenessChecks: true,
  };
}

export function getAutomationState() {
  try {
    const raw = localStorage.getItem('intelligence.automation.v1');
    const parsed = raw ? JSON.parse(raw) : null;
    return { ...defaultAutomationState(), ...(parsed ?? {}) };
  } catch {
    return defaultAutomationState();
  }
}

export function setAutomationState(next: ReturnType<typeof defaultAutomationState>) {
  localStorage.setItem('intelligence.automation.v1', JSON.stringify(next));
}

export function detectAnomaly(insights: Insight[]) {
  // Heuristic: any 'bad' insight implies anomaly worth attention
  return insights.some((i) => i.tone === 'bad');
}

export function anomalyScore(insights: Insight[]) {
  // 0..100
  let score = 0;
  for (const i of insights) {
    if (i.tone === 'bad') score += 35;
    if (i.tone === 'warn') score += 18;
    if (i.tone === 'good') score += 5;
  }
  return clamp(score, 0, 100);
}
