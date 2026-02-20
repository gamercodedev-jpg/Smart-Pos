import { useEffect, useMemo, useState } from 'react';
import { Bot, ChevronRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { UseIntelligenceReturn } from '@/hooks/useIntelligence';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  anomalyScore,
  detectAnomaly,
  generateInsights,
  getAutomationState,
  setAutomationState,
  type Insight,
} from '@/lib/intelligenceInsights';

export function AutopilotWidget(props: {
  intel: UseIntelligenceReturn;
  formatMoney: (n: number) => string;
  onOpenInsights: (insights: Insight[]) => void;
  onOpenOpsCenter: (horizonDays: number) => void;
}) {
  const navigate = useNavigate();
  const insights = useMemo(() => generateInsights(props.intel, props.formatMoney), [props.intel, props.formatMoney]);
  const score = useMemo(() => anomalyScore(insights), [insights]);
  const hasAnomaly = useMemo(() => detectAnomaly(insights), [insights]);
  const mapping = props.intel.supplierMapping;

  const [automation, setAutomation] = useState(() => getAutomationState());
  const [horizonDays, setHorizonDays] = useState('7');
  const [weeklyDue, setWeeklyDue] = useState(false);

  useEffect(() => {
    setAutomation(getAutomationState());
  }, []);

  useEffect(() => {
    setAutomationState(automation);
  }, [automation]);

  useEffect(() => {
    if (!automation.weeklyDigest) {
      setWeeklyDue(false);
      return;
    }

    // Best-effort local scheduler: prompts when browser is open.
    const key = 'intelligence.weeklyDigest.lastAt';
    const lastRaw = localStorage.getItem(key);
    const last = lastRaw ? new Date(lastRaw).getTime() : 0;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    setWeeklyDue(now - last > sevenDays);
  }, [automation.weeklyDigest]);

  useEffect(() => {
    if (!automation.autoOpenOnAnomaly) return;
    if (!hasAnomaly) return;

    // Avoid spamming: only open once per date-range key
    const key = `intelligence.autoOpen.${props.intel.range.startDate}.${props.intel.range.endDate}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    props.onOpenInsights(insights);
  }, [automation.autoOpenOnAnomaly, hasAnomaly, insights, props]);

  const top = insights.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-purple-200/80" />
          <div className="text-xs font-semibold text-purple-100">AutoPilot</div>
        </div>

        <Badge
          variant="outline"
          className={
            score >= 70
              ? 'bg-red-500/15 text-red-300 border-red-500/30'
              : score >= 40
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-white/5 text-purple-200 border-white/10'
          }
        >
          Risk score {score}/100
        </Badge>
      </div>

      {hasAnomaly ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 text-red-300 mt-0.5" />
          <div className="text-sm text-white/90 leading-relaxed">
            Anomalies detected for this range. Open Insight Mode to see drivers and recommended actions.
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-purple-100/80">
          System stable. No major anomalies detected.
        </div>
      )}

      {weeklyDue ? (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-sm text-white/90">
          Weekly owner digest is ready. Generate the PDF report and share it.
        </div>
      ) : null}

      {mapping?.unassigned ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-white/90 leading-relaxed">
              Supplier mapping incomplete: <span className="font-bold">{mapping.unassigned}</span> unassigned stock items.
              <div className="text-xs text-purple-200/70 mt-1">
                Supplier-split purchase orders work best when every stock item has a supplier.
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30">
              {mapping.assignedPct.toFixed(0)}%
            </Badge>
          </div>
          <div className="mt-3">
            <Button
              variant="outline"
              className="w-full bg-white/5 border-white/10 hover:bg-white/10"
              onClick={() => navigate('/inventory/items?supplier=none')}
            >
              Fix Unassigned Suppliers
            </Button>
          </div>
        </div>
      ) : mapping ? (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 flex items-center justify-between gap-3">
          <div className="text-sm text-white/90">Supplier mapping healthy</div>
          <Badge variant="outline" className="bg-green-500/15 text-green-300 border-green-500/30">
            {mapping.assignedPct.toFixed(0)}%
          </Badge>
        </div>
      ) : null}

      <div className="space-y-2">
        {top.map((i) => (
          <div key={i.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-white/90">{i.title}</div>
              <Badge
                variant="outline"
                className={
                  i.tone === 'bad'
                    ? 'bg-red-500/15 text-red-300 border-red-500/30'
                    : i.tone === 'warn'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : i.tone === 'good'
                        ? 'bg-green-500/15 text-green-300 border-green-500/30'
                        : 'bg-white/5 text-purple-200 border-white/10'
                }
              >
                {i.tone.toUpperCase()}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-purple-200/70">{i.summary}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-purple-100">Auto actions</div>
            <div className="text-[11px] text-purple-200/60">Runs locally (no server yet)</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/90">Weekly digest</div>
            <div className="text-xs text-purple-200/60">Keeps the owner updated</div>
          </div>
          <Switch checked={automation.weeklyDigest} onCheckedChange={(v) => setAutomation((s) => ({ ...s, weeklyDigest: v }))} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/90">Cost completeness checks</div>
            <div className="text-xs text-purple-200/60">Flags missing costs / suspicious GP%</div>
          </div>
          <Switch
            checked={automation.costCompletenessChecks}
            onCheckedChange={(v) => setAutomation((s) => ({ ...s, costCompletenessChecks: v }))}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/90">Auto-open on anomaly</div>
            <div className="text-xs text-purple-200/60">Opens Insight Mode once per range</div>
          </div>
          <Switch
            checked={automation.autoOpenOnAnomaly}
            onCheckedChange={(v) => setAutomation((s) => ({ ...s, autoOpenOnAnomaly: v }))}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
        <div className="text-xs uppercase tracking-wider text-purple-200/60 font-bold">Ops actions</div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/90">Purchase horizon</div>
            <div className="text-xs text-purple-200/60">Forecast usage + reorder buffer</div>
          </div>

          <Select value={horizonDays} onValueChange={setHorizonDays}>
            <SelectTrigger className="h-9 w-[120px] bg-background/40 border border-white/10">
              <SelectValue placeholder="Days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => props.onOpenOpsCenter(Number(horizonDays) || 7)}
          className="w-full bg-white text-purple-950 hover:bg-purple-50 font-bold border-0 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          Open Ops Center
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>

        <Button
          variant="outline"
          onClick={() => props.onOpenInsights(insights)}
          className="w-full bg-white/5 border-white/10 hover:bg-white/10"
        >
          Open Insight Mode
        </Button>
      </div>
    </div>
  );
}
