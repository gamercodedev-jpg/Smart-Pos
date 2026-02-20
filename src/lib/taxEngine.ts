import { TaxRule, TaxCalculationResult } from '@/types';
import { taxRules as allTaxRules } from '@/data/taxData';

/**
 * Calculates the total amount including all applicable taxes for a given country.
 *
 * @param amount - The initial subtotal before taxes.
 * @param countryCode - The country code (e.g., 'ZM', 'ZA', 'US') to fetch tax rules for.
 * @returns A TaxCalculationResult object with subtotal, tax breakdown, and final total.
 */
export function calculateTotalWithTaxes(
  amount: number,
  countryCode: TaxRule['countryCode']
): TaxCalculationResult {
  
  // 1. Filter rules for the specified country and sort them by application order.
  const applicableRules = allTaxRules
    .filter((rule) => rule.countryCode === countryCode)
    .sort((a, b) => a.applyOrder - b.applyOrder);

  if (applicableRules.length === 0) {
    return {
      subtotal: amount,
      taxBreakdown: [],
      total: amount,
    };
  }

  const result: TaxCalculationResult = {
    subtotal: amount,
    taxBreakdown: [],
    total: amount,
  };

  let runningTotal = amount;

  // 2. Iterate through the sorted rules and calculate taxes.
  for (const rule of applicableRules) {
    let taxAmount: number;

    if (rule.isCompound) {
      // For compound taxes, calculate on the running total (subtotal + previously calculated taxes).
      taxAmount = runningTotal * rule.rate;
    } else {
      // For simple taxes, calculate on the original subtotal.
      // This is standard for VAT and sales tax.
      taxAmount = amount * rule.rate;
    }
    
    // Special handling for Zambia's VAT which is on subtotal + Tourism Levy
    if (rule.countryCode === 'ZM' && rule.taxName === 'VAT') {
        const tourismLevyAmount = result.taxBreakdown.find(t => t.name === 'Tourism Levy')?.amount || 0;
        taxAmount = (amount + tourismLevyAmount) * rule.rate;
    }


    result.taxBreakdown.push({
      name: rule.taxName,
      amount: taxAmount,
    });

    runningTotal += taxAmount;
  }

  result.total = runningTotal;

  return result;
}
