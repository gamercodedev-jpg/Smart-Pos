// src/lib/taxService.ts
import { InvoiceItem, TaxDetails } from "@/types/zra";

const VAT_RATE = 0.16; // 16%
const TOURISM_LEVY_RATE = 0.015; // 1.5%

export const taxService = {
  calculateTaxes(items: InvoiceItem[]): TaxDetails {
    let vatAmount = 0;
    let tourismLevyAmount = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;

      // VAT is applicable on all items
      vatAmount += itemTotal * VAT_RATE;

      // Tourism Levy is only applicable on Alcohol
      if (item.category === 'Alcohol') {
        tourismLevyAmount += itemTotal * TOURISM_LEVY_RATE;
      }
    });

    return {
      vatAmount,
      tourismLevyAmount,
      totalTaxes: vatAmount + tourismLevyAmount,
    };
  }
};
