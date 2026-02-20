import type { UseIntelligenceReturn } from '@/hooks/useIntelligence';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function GoldenHourHeatmapWidget(props: { intel: UseIntelligenceReturn }) {
  const { formatMoney } = useCurrency();
  const { cells, max } = props.intel.goldenHour;

  if (!cells.length) {
    return <div className="text-sm text-muted-foreground">No paid sales in this range.</div>;
  }

  const byKey = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c] as const));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <div>Turnover intensity by day/hour</div>
        <div>Max {formatMoney(max)}</div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: `48px repeat(24, minmax(0, 1fr))`, gap: 4 }}>
        <div />
        {Array.from({ length: 24 }).map((_, hour) => (
          <div key={hour} className="text-[10px] text-muted-foreground text-center">
            {hour}
          </div>
        ))}

        {Array.from({ length: 7 }).map((_, dow) => (
          <div key={dow} className="contents">
            <div className="text-xs text-muted-foreground flex items-center justify-end pr-2">{DOW[dow]}</div>
            {Array.from({ length: 24 }).map((__, hour) => {
              const c = byKey.get(`${dow}-${hour}`) ?? { value: 0, tickets: 0 };
              const intensity = max > 0 ? c.value / max : 0;
              const bg = `rgba(34, 197, 94, ${Math.min(0.85, 0.08 + intensity * 0.8)})`;
              const border = intensity > 0.25 ? 'rgba(34, 197, 94, 0.55)' : 'rgba(148, 163, 184, 0.25)';
              return (
                <div
                  key={hour}
                  title={`${DOW[dow]} ${hour}:00 — ${formatMoney(c.value)} • ${c.tickets} tickets`}
                  className={cn('h-5 rounded-sm border', c.value > 0 ? 'shadow-sm' : '')}
                  style={{ backgroundColor: c.value > 0 ? bg : 'rgba(148,163,184,0.08)', borderColor: border }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">Tip: watch for a "green runway" and schedule staff to that band.</div>
    </div>
  );
}
