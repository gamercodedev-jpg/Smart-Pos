import { Banknote, CreditCard, TrendingUp, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { UseIntelligenceReturn } from '@/hooks/useIntelligence';
import { useCurrency } from '@/contexts/CurrencyContext';

export function KpiStripWidget(props: { intel: UseIntelligenceReturn }) {
  const { kpis, paymentTotals } = props.intel;
  const { formatMoney } = useCurrency();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      <StatBox 
        label="Turnover" 
        value={formatMoney(kpis.turnover)} 
        sub={`${kpis.tickets} tickets`}
        icon={<TrendingUp className="h-4 w-4 text-purple-300" />}
        trend="+12%"
      />
      
      <StatBox 
        label="Gross Profit" 
        value={formatMoney(kpis.grossProfit)} 
        sub={`${kpis.gpPercent.toFixed(1)}% Margin`}
        icon={<Receipt className="h-4 w-4 text-pink-300" />}
        trend={kpis.gpPercent < 30 ? "-2%" : "+5%"}
        trendDown={kpis.gpPercent < 30}
      />

      <StatBox 
        label="Cash" 
        value={formatMoney(paymentTotals.cash)} 
        sub="Drawer Count"
        icon={<Banknote className="h-4 w-4 text-green-300" />}
      />

      <StatBox 
        label="Card" 
        value={formatMoney(paymentTotals.card)} 
        sub="Settlements"
        icon={<CreditCard className="h-4 w-4 text-blue-300" />}
      />
    </div>
  );
}

function StatBox({ label, value, sub, icon, trend, trendDown }: any) {
  return (
    <div className="flex flex-col justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex items-start justify-between">
        <div className="text-xs text-purple-200/70 font-medium uppercase tracking-wider">{label}</div>
        <div className="p-1.5 rounded-md bg-white/5">{icon}</div>
      </div>
      
      <div className="mt-2">
        <div className="text-xl lg:text-2xl font-bold text-white tracking-tight">{value}</div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-purple-300/50">{sub}</div>
          {trend && (
             <div className={`flex items-center text-xs font-bold ${trendDown ? 'text-red-400' : 'text-green-400'}`}>
                {trendDown ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> : <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                {trend}
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
