import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

export function BarChartWidget({
  data,
  title,
  dataKey = 'value',
  xAxisKey = 'name',
  color = '#8b5cf6',
  layout = 'horizontal',
  onBarClick,
  valueFormatter,
}: {
  data: any[];
  title?: string;
  dataKey?: string;
  xAxisKey?: string;
  color?: string;
  layout?: 'horizontal' | 'vertical';
  onRemove?: () => void;
  dragHandleClassName?: string;
  onBarClick?: (bar: { name: string; value: number }) => void;
  valueFormatter?: (value: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout={layout}
        data={data}
        margin={layout === 'vertical' ? { top: 0, right: 30, left: 30, bottom: 5 } : { top: 5, right: 5, left: -20, bottom: 0 }}
      >
          <CartesianGrid strokeDasharray="3 3" vertical={layout === 'horizontal' ? false : true} horizontal={layout === 'horizontal' ? true : false} stroke="rgba(255,255,255,0.05)" />
          
          {layout === 'vertical' ? (
              <>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey={xAxisKey} 
                  type="category" 
                  width={90} 
                  tick={{fill: 'rgba(255,255,255,0.6)', fontSize: 10}} 
                  axisLine={false} 
                  tickLine={false} 
                />
              </>
          ) : (
              <>
                <XAxis dataKey={xAxisKey} stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
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
              </>
          )}

        <Tooltip
          cursor={{fill: 'rgba(255,255,255,0.05)'}}
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
        <Bar
          dataKey={dataKey}
          fill={color}
          radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          barSize={layout === 'vertical' ? 16 : undefined}
          onClick={(payload: any) => {
            const p = payload?.payload;
            if (!onBarClick || !p) return;
            const name = String(p?.[xAxisKey] ?? p?.name ?? '');
            const value = Number(p?.[dataKey] ?? p?.value ?? 0);
            onBarClick({ name, value });
          }}
        >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || color} />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
