import type { CompanySettings } from '@/types/company';

const STORAGE_KEY = 'pmx.companySettings.v1';

export const defaultCompanySettings: CompanySettings = {
  appName: 'Mthunzi-Smart',
  tagline: 'Back Office + POS',
  primaryColorHex: '#2563eb',
};

export const getCompanySettings = (): CompanySettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCompanySettings;
    const parsed = JSON.parse(raw) as Partial<CompanySettings>;

    return {
      ...defaultCompanySettings,
      ...parsed,
    };
  } catch {
    return defaultCompanySettings;
  }
};

export const saveCompanySettings = (settings: CompanySettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
