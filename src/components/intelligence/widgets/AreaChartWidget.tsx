import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function AreaChartWidget({
  data,
  title, // kept for compatibility but ignored for frame
  dataKey = 'value',
  xAxisKey = 'name',
  color = '#8b5cf6',
  onPointClick,
  valueFormatter,
}: {
  data: any[];
  title?: string;
  dataKey?: string;
  xAxisKey?: string;
  color?: string;
  onRemove?: () => void; // Ignored
  dragHandleClassName?: string; // Ignored
  onPointClick?: (point: { label: string; value: number; payload?: any }) => void;
  valueFormatter?: (value: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        onClick={(e: any) => {
          if (!onPointClick) return;
          const label = e?.activeLabel;
          const payload = e?.activePayload?.[0]?.payload;
          if (label == null || !payload) return;
          const value = Number(payload?.[dataKey] ?? payload?.value ?? 0);
          onPointClick({ label: String(label), value, payload });
        }}
      >
        <defs>
          <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.5} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis 
          dataKey={xAxisKey} 
          stroke="rgba(255,255,255,0.4)" 
          fontSize={11} 
          tickLine={false} 
          axisLine={false} 
          minTickGap={30}
        />
        <YAxis 
          stroke="rgba(255,255,255,0.4)" 
          fontSize={11} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(val: any) => {
            const n = Number(val);
            if (valueFormatter && Number.isFinite(n)) return valueFormatter(n);
            return `${n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n}`;
          }}
        />
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'rgba(23, 10, 48, 0.9)', 
            borderColor: 'rgba(168, 85, 247, 0.3)', 
            color: '#fff',
            borderRadius: '8px',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
          itemStyle={{ color: '#fff' }}
          labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
          formatter={(value: any, name: any) => {
            const n = Number(value);
            if (!valueFormatter || !Number.isFinite(n)) return [value, name];
            return [valueFormatter(n), name];
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#gradient-${title})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
