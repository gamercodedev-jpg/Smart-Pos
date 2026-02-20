import QRCode from 'qrcode';

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 5,
  });
}

export function safeJsonParse<T>(s: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(s) as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}
