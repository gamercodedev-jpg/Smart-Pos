import type { ReceiptSettings } from '@/types';

const KEY = 'pmx4_receipt_settings_v1';
const EVENT = 'pmx4_receipt_settings_change';

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  countryCode: 'ZM',
  currencyCode: 'ZMW',
  legalFooter: 'Thank you for your support. Keep this receipt for your records.',
  googleReviewUrl: 'https://www.google.com/search?q=your+restaurant+google+reviews',
  digitalReceiptBaseUrl: 'https://yourdomain.com/r/',
};

let cachedRaw: string | null = null;
let cachedSettings: ReceiptSettings = { ...DEFAULT_RECEIPT_SETTINGS };

export function getReceiptSettings(): ReceiptSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_RECEIPT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReceiptSettings>;
    return { ...DEFAULT_RECEIPT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_RECEIPT_SETTINGS;
  }
}

export function subscribeReceiptSettings(listener: () => void) {
  const onCustom = () => listener();
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    listener();
  };

  window.addEventListener(EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

export function getReceiptSettingsSnapshot() {
  // IMPORTANT: `useSyncExternalStore` requires that `getSnapshot()` returns a
  // cached value when nothing has changed. Returning a new object every call can
  // cause render loops.
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }

  if (raw === cachedRaw) return cachedSettings;
  cachedRaw = raw;

  if (!raw) {
    cachedSettings = { ...DEFAULT_RECEIPT_SETTINGS };
    return cachedSettings;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ReceiptSettings>;
    cachedSettings = { ...DEFAULT_RECEIPT_SETTINGS, ...parsed };
    return cachedSettings;
  } catch {
    cachedSettings = { ...DEFAULT_RECEIPT_SETTINGS };
    return cachedSettings;
  }
}

export function saveReceiptSettings(next: ReceiptSettings) {
  const normalized: ReceiptSettings = { ...DEFAULT_RECEIPT_SETTINGS, ...(next as Partial<ReceiptSettings>) };
  const serialized = JSON.stringify(normalized);

  // Avoid redundant events for identical payloads.
  if (serialized === cachedRaw) return;

  localStorage.setItem(KEY, serialized);
  cachedRaw = serialized;
  cachedSettings = normalized;
  window.dispatchEvent(new Event(EVENT));
}
