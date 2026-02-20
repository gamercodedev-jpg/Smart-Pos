import type { UseIntelligenceReturn } from '@/hooks/useIntelligence';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';

function money(n: number) {
  return `R ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function MoneyFlowSankeyWidget(props: { intel: UseIntelligenceReturn }) {
  const data = props.intel.sankey;

  if (!data.links.length) {
    return <div className="text-sm text-muted-foreground">Not enough data for this range.</div>;
  }

  return (
    <div className="h-full min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey data={data as any} nodePadding={22} nodeWidth={14} linkCurvature={0.55}>
          <Tooltip formatter={(value) => money(Number(value) || 0)} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
