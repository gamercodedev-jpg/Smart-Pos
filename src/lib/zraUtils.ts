// src/lib/zraUtils.ts
import QRCode from 'qrcode';
import { ZRAInvoiceData } from '@/types/zra';

export const generateZRAQRCode = async (invoiceData: ZRAInvoiceData): Promise<string> => {
  const qrCodeContent = JSON.stringify({
    invoiceId: invoiceData.invoiceId,
    fvc: invoiceData.fiscalVerificationCode,
    date: invoiceData.date,
    total: invoiceData.total.toFixed(2),
    vat: invoiceData.taxDetails.vatAmount.toFixed(2),
    tpin: invoiceData.zraTpin,
  });

  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrCodeContent, {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 4,
    });
    return qrCodeDataURL;
  } catch (err) {
    console.error('Failed to generate QR Code', err);
    throw err;
  }
};
