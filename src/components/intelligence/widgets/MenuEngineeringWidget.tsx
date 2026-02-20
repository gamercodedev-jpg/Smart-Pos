import type { UseIntelligenceReturn } from '@/hooks/useIntelligence';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip, Scatter, ReferenceLine, Legend } from 'recharts';
import { useCurrency } from '@/contexts/CurrencyContext';

const quadrantColor: Record<string, string> = {
  Star: '#22c55e',
  Plowhorse: '#38bdf8',
  Puzzle: '#a78bfa',
  Dog: '#f97316',
};

export function MenuEngineeringWidget(props: { intel: UseIntelligenceReturn }) {
  const { formatMoney } = useCurrency();
  const { points, avgQty, avgProfitPerItem } = props.intel.menuEngineering;

  const series = {
    Star: points.filter((p) => p.quadrant === 'Star'),
    Plowhorse: points.filter((p) => p.quadrant === 'Plowhorse'),
    Puzzle: points.filter((p) => p.quadrant === 'Puzzle'),
    Dog: points.filter((p) => p.quadrant === 'Dog'),
  };

  if (!points.length) {
    return <div className="text-sm text-muted-foreground">No paid sales in this range.</div>;
  }

  return (
    <div className="h-full min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
          <XAxis type="number" dataKey="qty" name="Qty" tick={{ fontSize: 12 }} />
          <YAxis type="number" dataKey="profitPerItem" name="Profit/item" tick={{ fontSize: 12 }} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: any, name: any, ctx: any) => {
              if (name === 'profitPerItem') return [formatMoney(Number(value) || 0), 'Profit/item'];
              if (name === 'qty') return [Number(value) || 0, 'Qty'];
              return [value, name];
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as any;
              if (!p) return '';
              const upside = p.priceUpsidePct ? ` • +${p.priceUpsidePct}% upside` : '';
              return `${p.name} (${p.quadrant})${upside}`;
            }}
          />
          <Legend />

          <ReferenceLine x={avgQty} stroke="#94a3b8" strokeDasharray="4 4" />
          <ReferenceLine y={avgProfitPerItem} stroke="#94a3b8" strokeDasharray="4 4" />

          {(Object.keys(series) as Array<keyof typeof series>).map((k) => (
            <Scatter key={k} name={k} data={series[k]} fill={quadrantColor[k]} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
