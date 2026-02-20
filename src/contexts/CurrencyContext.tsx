import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { CurrencyCode, ReceiptSettings } from '@/types';
import {
  getReceiptSettingsSnapshot,
  saveReceiptSettings,
  subscribeReceiptSettings,
} from '@/lib/receiptSettingsService';

type CurrencyModel = {
  currencyCode: CurrencyCode;
  setCurrencyCode: (code: CurrencyCode) => void;
  formatMoney: (amount: number) => string;
  formatNumber: (amount: number, opts?: Intl.NumberFormatOptions) => string;
};

const CurrencyContext = createContext<CurrencyModel | null>(null);

function formatZmwK(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  return `K ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencyIntl(amount: number, currency: string) {
  const n = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function CurrencyProvider(props: { children: React.ReactNode }) {
  const receiptSettings = useSyncExternalStore(
    subscribeReceiptSettings,
    getReceiptSettingsSnapshot,
    getReceiptSettingsSnapshot
  );

  if (!receiptSettings) {
    throw new Error("CurrencyProvider: receiptSettings is null or undefined.");
  }

  const model = useMemo<CurrencyModel>(() => {
    const currencyCode = (receiptSettings as ReceiptSettings).currencyCode;

    return {
      currencyCode,
      setCurrencyCode: (code) => {
        const cur = getReceiptSettingsSnapshot();
        saveReceiptSettings({ ...cur, currencyCode: code });
      },
      formatNumber: (amount, opts) => {
        const n = Number.isFinite(amount) ? amount : 0;
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, ...(opts ?? {}) }).format(n);
      },
      formatMoney: (amount) => {
        if (currencyCode === 'ZMW') return formatZmwK(amount);
        return formatCurrencyIntl(amount, currencyCode);
      },
    };
  }, [receiptSettings]);

  return <CurrencyContext.Provider value={model}>{props.children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
