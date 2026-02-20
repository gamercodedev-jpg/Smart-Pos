import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1'];

export function DonutChartWidget({
  data,
  title,
  dataKey = 'value',
  nameKey = 'name',
  onSliceClick,
  valueFormatter,
}: {
  data: any[];
  title?: string;
  dataKey?: string;
  nameKey?: string;
  onRemove?: () => void;
  dragHandleClassName?: string;
  onSliceClick?: (slice: { name: string; value: number }) => void;
  valueFormatter?: (value: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey={dataKey}
          nameKey={nameKey}
          stroke="none"
          onClick={(payload: any) => {
            const p = payload?.payload;
            if (!onSliceClick || !p) return;
            const name = String(p?.[nameKey] ?? p?.name ?? '');
            const value = Number(p?.[dataKey] ?? p?.value ?? 0);
            onSliceClick({ name, value });
          }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
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
          formatter={(value: any, name: any) => {
            const n = Number(value);
            if (!valueFormatter || !Number.isFinite(n)) return [value, name];
            return [valueFormatter(n), name];
          }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          iconType="circle"
          formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
