import type { CurrencyCode } from '@/types';

type RatesResponse = {
  result: 'success' | 'error';
  base_code: string;
  rates: Record<string, number>;
  time_last_update_unix?: number;
};

const CACHE_KEY_PREFIX = 'pmx4_fx_usd_rate_';
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function getUsdRateForCurrency(currencyCode: CurrencyCode): Promise<number | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${currencyCode}`;

  try {
    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as { rate: number; ts: number };
      if (typeof cached.rate === 'number' && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.rate;
      }
    }
  } catch {
    // ignore cache read errors
  }

  try {
    // Free endpoint that does not require an API key.
    // Example: https://open.er-api.com/v6/latest/ZMW
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(currencyCode)}`);
    if (!res.ok) return null;

    const data = (await res.json()) as RatesResponse;
    if (data.result !== 'success') return null;

    const usdRate = data.rates?.USD;
    if (typeof usdRate !== 'number') return null;

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ rate: usdRate, ts: Date.now() }));
    } catch {
      // ignore cache write errors
    }

    return usdRate;
  } catch {
    return null;
  }
}

export function convertToUsd(amount: number, usdRate: number | null): number | null {
  if (usdRate == null || !Number.isFinite(amount)) return null;
  return amount * usdRate;
}
