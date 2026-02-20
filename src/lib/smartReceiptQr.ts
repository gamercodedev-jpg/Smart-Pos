import QRCode from 'qrcode';
import type { ReceiptData, ReceiptSettings } from '@/types';

export async function generateSmartReceiptQr(
  receipt: ReceiptData,
  settings: ReceiptSettings
): Promise<string | null> {
  const payloadUrl = (() => {
    if (receipt.countryCode === 'ZM') {
      // Preferred: explicit ZRA verification URL if provided
      if (receipt.zraVerificationUrl) return receipt.zraVerificationUrl;

      // Fallback: if you have a digital receipt, use that (still useful in Zambia)
      if (receipt.qrUrl) return receipt.qrUrl;

      return null;
    }

    // Non-Zambia: prefer Google review link if configured
    if (settings.googleReviewUrl) return settings.googleReviewUrl;

    // Otherwise, use a digital receipt link if available
    if (receipt.qrUrl) return receipt.qrUrl;

    // Or synthesize from base + id
    if (settings.digitalReceiptBaseUrl) return `${settings.digitalReceiptBaseUrl}${encodeURIComponent(receipt.receiptId)}`;

    return null;
  })();

  if (!payloadUrl) return null;

  try {
    return await QRCode.toDataURL(payloadUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 5,
    });
  } catch {
    return null;
  }
}
