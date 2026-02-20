import type { POSMenuItem } from '@/types/pos';

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSmartQuantityQuery(input: string): { qty: number | null; query: string } {
  const raw = input.trim();
  if (!raw) return { qty: null, query: '' };

  // Formats: "2x coke", "2 x coke", "coke x2", "coke 2x"
  const m1 = raw.match(/^\s*(\d{1,3})\s*[xX*]\s*(.+)$/);
  if (m1) {
    const qty = Math.max(1, Number(m1[1]) || 1);
    return { qty, query: m1[2].trim() };
  }

  const m2 = raw.match(/^\s*(.+?)\s*[xX*]\s*(\d{1,3})\s*$/);
  if (m2) {
    const qty = Math.max(1, Number(m2[2]) || 1);
    return { qty, query: m2[1].trim() };
  }

  return { qty: null, query: raw };
}

function isSubsequence(needle: string, hay: string) {
  if (!needle) return false;
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) {
    if (hay[j] === needle[i]) i++;
  }
  return i === needle.length;
}

export function scoreMenuItem(queryRaw: string, item: POSMenuItem): number {
  const q = norm(queryRaw);
  if (!q) return 0;

  const name = norm(item.name ?? '');
  const code = norm(item.code ?? '');

  if (!name && !code) return 0;

  // Strong signals
  if (code && q === code) return 1200;
  if (name && q === name) return 900;

  let score = 0;

  // Prefix matches
  if (code && code.startsWith(q)) score += 800;
  if (name && name.startsWith(q)) score += 420;

  // Contains
  if (code && code.includes(q)) score += 280;
  if (name && name.includes(q)) score += 180;

  // Token overlap
  const qTokens = q.split(' ').filter(Boolean);
  const nTokens = new Set(name.split(' ').filter(Boolean));
  const cTokens = new Set(code.split(' ').filter(Boolean));
  for (const t of qTokens) {
    if (nTokens.has(t)) score += 50;
    if (cTokens.has(t)) score += 70;
  }

  // Fuzzy subsequence
  if (score === 0) {
    const compactQ = q.replace(/\s+/g, '');
    const compactName = name.replace(/\s+/g, '');
    const compactCode = code.replace(/\s+/g, '');
    if (compactCode && isSubsequence(compactQ, compactCode)) score += 120;
    if (compactName && isSubsequence(compactQ, compactName)) score += 90;
  }

  // Availability bonus
  if (item.isAvailable) score += 10;

  return score;
}

export function smartSearchMenuItems(params: {
  query: string;
  items: POSMenuItem[];
  limit?: number;
}): Array<POSMenuItem & { _score: number }> {
  const limit = params.limit ?? 50;
  const q = params.query.trim();
  if (!q) return [];

  return params.items
    .map((it) => ({ ...it, _score: scoreMenuItem(q, it) }))
    .filter((it) => it._score > 0)
    .sort((a, b) => b._score - a._score || a.name.localeCompare(b.name))
    .slice(0, limit);
}
