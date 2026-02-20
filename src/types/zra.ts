// src/types/zra.ts

export type ItemCategory = 'Food' | 'Alcohol' | 'Other';

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  category: ItemCategory;
}

export interface TaxDetails {
  vatAmount: number;
  tourismLevyAmount: number;
  totalTaxes: number;
}

export interface ZRAInvoiceData {
  invoiceId: string;
  zraTpin: string;
  customerTpin?: string;
  fiscalVerificationCode: string;
  date: string; // ISO string
  items: InvoiceItem[];
  subtotal: number;
  taxDetails: TaxDetails;
  total: number;
  cashierName: string;
}
