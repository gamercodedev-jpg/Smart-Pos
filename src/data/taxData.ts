import { TaxRule } from '@/types';

/**
 * A mock database of tax rules for different countries.
 * This would typically be fetched from a database or a configuration service.
 */
export const taxRules: TaxRule[] = [
  // Zambia (ZM)
  {
    countryCode: 'ZM',
    taxName: 'Tourism Levy',
    rate: 0.015, // 1.5%
    applyOrder: 1, // Applied first
    isCompound: false,
  },
  {
    countryCode: 'ZM',
    taxName: 'VAT',
    rate: 0.16, // 16%
    applyOrder: 2, // Applied after Tourism Levy
    isCompound: false, // Calculated on (subtotal + tourism levy)
  },

  // South Africa (ZA)
  {
    countryCode: 'ZA',
    taxName: 'VAT',
    rate: 0.15, // 15%
    applyOrder: 1,
    isCompound: false,
  },

  // United States (US) - Example for a state sales tax
  {
    countryCode: 'US',
    taxName: 'CA Sales Tax',
    rate: 0.0725, // 7.25% for California (example)
    applyOrder: 1,
    isCompound: false,
  },
];
