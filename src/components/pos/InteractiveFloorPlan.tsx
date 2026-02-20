import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export type FloorPlanTable = {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'dirty';
  x: number;
  y: number;
  w: number;
  h: number;
  lastActivityTime?: string; // ISO
  currentBillTotal?: number;
  paymentRequested?: boolean;
};

function minutesSince(iso?: string) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 60000);
}

export function InteractiveFloorPlan(props: {
  tables: FloorPlanTable[];
  idleMinutesThreshold?: number;
  onTableClick?: (table: FloorPlanTable) => void;
}) {
  const idleThreshold = props.idleMinutesThreshold ?? 20;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const bounds = useMemo(() => {
    const maxX = Math.max(...props.tables.map(t => t.x + t.w), 600);
    const maxY = Math.max(...props.tables.map(t => t.y + t.h), 320);
    return { width: maxX + 40, height: maxY + 40 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.tables]);

  // tick used only to re-render timer
  void tick;

  const colorFor = (t: FloorPlanTable) => {
    const idleMin = minutesSince(t.lastActivityTime);
    const idleHot = idleMin !== null && idleMin >= idleThreshold;

    if (t.paymentRequested) return 'fill-rose-500/20 stroke-rose-500/80';

    if (t.status === 'available') return 'fill-emerald-500/15 stroke-emerald-500/60';
    if (t.status === 'reserved') return 'fill-violet-500/15 stroke-violet-500/60';
    if (t.status === 'dirty') return 'fill-orange-500/15 stroke-orange-500/60';

    // occupied
    return idleHot
      ? 'fill-red-500/20 stroke-red-500/70'
      : 'fill-sky-500/15 stroke-sky-500/60';
  };

  return (
    <div className="w-full overflow-auto">
      <svg
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        className="w-full min-h-[260px] rounded-lg border bg-card"
        role="img"
        aria-label="Restaurant floor plan"
      >
        {/* room boundary */}
        <rect x={10} y={10} width={bounds.width - 20} height={bounds.height - 20} className="fill-transparent stroke-border" rx={12} />

        {props.tables.map(t => {
          const idleMin = minutesSince(t.lastActivityTime);
          const idleHot = idleMin !== null && idleMin >= idleThreshold;

          return (
            <g
              key={t.id}
              className={cn('cursor-pointer select-none', props.onTableClick && 'hover:opacity-90')}
              onClick={() => props.onTableClick?.(t)}
            >
              <rect
                x={t.x}
                y={t.y}
                width={t.w}
                height={t.h}
                rx={14}
                className={cn('stroke-2', colorFor(t), t.paymentRequested && 'animate-pulse')}
              />
              <text x={t.x + t.w / 2} y={t.y + t.h / 2 - 2} textAnchor="middle" className="fill-foreground font-bold" fontSize={16}>
                {t.number}
              </text>
              <text x={t.x + t.w / 2} y={t.y + t.h / 2 + 16} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                {t.seats} seats
              </text>
              {t.paymentRequested && (
                <text x={t.x + t.w - 8} y={t.y + 14} textAnchor="end" className="fill-rose-600 dark:fill-rose-400 font-bold" fontSize={10}>
                  PAY
                </text>
              )}
              {t.status === 'occupied' && (
                <text x={t.x + t.w / 2} y={t.y + t.h + 14} textAnchor="middle" className={cn('fill-muted-foreground', idleHot && 'fill-red-500')} fontSize={10}>
                  {idleMin === null ? '' : `${idleMin}m`}{t.currentBillTotal ? ` · K ${t.currentBillTotal.toFixed(0)}` : ''}
                </text>
              )}
            </g>
          );
        })}

        {/* labels */}
        <text x={22} y={28} className="fill-muted-foreground" fontSize={10}>
          Idle highlight: {idleThreshold} minutes
        </text>
      </svg>
    </div>
  );
}
