import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CompanySettings } from '@/types/company';
import { defaultCompanySettings, getCompanySettings, saveCompanySettings } from '@/lib/companySettingsStore';
import { hexToHslVar } from '@/lib/color';

type BrandingContextValue = {
  settings: CompanySettings;
  updateSettings: (next: Partial<CompanySettings>) => void;
  reset: () => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

const applyBrandingToDocument = (settings: CompanySettings) => {
  if (!settings) {
    throw new Error("BrandingProvider: settings is null or undefined.");
  }
  document.title = settings.appName || defaultCompanySettings.appName;

  const hsl = hexToHslVar(settings.primaryColorHex);
  if (hsl) {
    const root = document.documentElement;
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--accent-foreground', hsl);
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', settings.primaryColorHex);
  }
};

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(() => getCompanySettings());

  useEffect(() => {
    applyBrandingToDocument(settings);
    saveCompanySettings(settings);
  }, [settings]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      settings,
      updateSettings: (next) => setSettings((prev) => ({ ...prev, ...next })),
      reset: () => setSettings(defaultCompanySettings),
    }),
    [settings]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
};
