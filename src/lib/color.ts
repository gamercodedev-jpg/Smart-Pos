const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const hexToHslVar = (hex: string): string | null => {
  const cleaned = hex.trim().replace('#', '');
  if (![3, 6].includes(cleaned.length)) return null;

  const full = cleaned.length === 3
    ? cleaned.split('').map(c => `${c}${c}`).join('')
    : cleaned;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  const sPct = clamp(Math.round(s * 100), 0, 100);
  const lPct = clamp(Math.round(l * 100), 0, 100);

  // Shadcn expects HSL as: "H S% L%" (no commas)
  return `${h} ${sPct}% ${lPct}%`;
};
