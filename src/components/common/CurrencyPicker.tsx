import { Globe } from 'lucide-react';

import type { CurrencyCode } from '@/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COMMON: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'ZMW', label: 'ZMW (K)' },
  { code: 'ZAR', label: 'ZAR (R)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
];

export function CurrencyPicker(props: { className?: string }) {
  const { currencyCode, setCurrencyCode } = useCurrency();

  return (
    <div className={props.className}>
      <Select value={currencyCode} onValueChange={(v) => setCurrencyCode(v as CurrencyCode)}>
        <SelectTrigger className="h-9 w-[140px] bg-background/40 border border-white/10">
          <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          {COMMON.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
