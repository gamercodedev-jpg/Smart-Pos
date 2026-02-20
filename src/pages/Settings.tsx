import { PageHeader } from '@/components/common/PageComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { departments as seededDepartments } from '@/data/mockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { ReceiptSettings } from '@/types';
import { getReceiptSettings, saveReceiptSettings } from '@/lib/receiptSettingsService';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from 'react-router-dom';
import { useBranding } from '@/contexts/BrandingContext';
import { getFeatureFlagsSnapshot, setFeatureEnabled, subscribeFeatureFlags } from '@/lib/featureFlagsStore';

export default function Settings() {
  const { hasPermission } = useAuth();
  const { settings, reset } = useBranding();
  const flags = useSyncExternalStore(subscribeFeatureFlags, getFeatureFlagsSnapshot, getFeatureFlagsSnapshot);
  const intelligenceEnabled = Boolean(flags.flags.intelligenceWorkspace);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(() => getReceiptSettings());
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setReceiptSettings(getReceiptSettings());
  }, []);

  const isZambia = useMemo(() => receiptSettings.countryCode === 'ZM', [receiptSettings.countryCode]);

  const save = () => {
    saveReceiptSettings(receiptSettings);
    setSavedAt(new Date().toLocaleTimeString());
  };

  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string }[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [suppliersList, setSuppliersList] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCode, setNewSupplierCode] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase.from('departments').select('id,name').order('name', { ascending: true });
          if (error) throw error;
          if (!mounted) return;
          if (Array.isArray(data)) {
            setDepartmentsList(data as any);
            return;
          }
        } catch (err) {
          console.warn('Failed to load departments from Supabase', err);
        }
      }
      // fallback
      setDepartmentsList(seededDepartments);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase.from('suppliers').select('id,name,code').order('name', { ascending: true });
          if (error) throw error;
          if (!mounted) return;
          if (Array.isArray(data)) {
            setSuppliersList(data as any);
            return;
          }
        } catch (err) {
          console.warn('Failed to load suppliers from Supabase', err);
        }
      }
      // fallback to empty
      setSuppliersList([]);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const addDepartment = async () => {
    const name = newDeptName.trim();
    if (!name) return;
    setNewDeptName('');
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('departments').insert({ name }).select('id,name').single();
        if (error) throw error;
        setDepartmentsList((s) => [data as any, ...s]);
        return;
      } catch (err) {
        console.warn('Failed to insert department', err);
        // fallback to local
      }
    }
    // local fallback
    setDepartmentsList((s) => [{ id: `local-${Date.now()}`, name }, ...s]);
  };

  const addSupplier = async () => {
    const name = newSupplierName.trim();
    const code = newSupplierCode.trim() || undefined;
    if (!name) return;
    setNewSupplierName('');
    setNewSupplierCode('');
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('suppliers').insert({ name, code }).select('id,name,code').single();
        if (error) throw error;
        setSuppliersList((s) => [data as any, ...s]);
        return;
      } catch (err) {
        console.warn('Failed to insert supplier', err);
      }
    }
    setSuppliersList((s) => [{ id: `local-${Date.now()}`, name, code }, ...s]);
  };

  return (
    <div>
      <PageHeader title="Settings" description="System configuration and preferences" />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium">App name</div>
            <div className="text-xs text-muted-foreground">Current: {settings.appName}</div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                reset();
                setSavedAt(new Date().toLocaleTimeString());
              }}
            >
              Reset Branding
            </Button>

            {hasPermission('manageSettings') && (
              <Button asChild variant="outline">
                <NavLink to="/company-settings">Open</NavLink>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Advanced</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-medium">Mthunzi Intelligence Workspace</div>
            <div className="text-xs text-muted-foreground">Power BI-style live dashboard with draggable widgets and clean data.</div>
          </div>

          <div className="flex items-center gap-3">
            {hasPermission('manageSettings') && (
              <Button asChild variant="outline">
                <NavLink to="/intelligence">Open</NavLink>
              </Button>
            )}

            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">Off</div>
              <Switch
                checked={intelligenceEnabled}
                disabled={!hasPermission('manageSettings')}
                onCheckedChange={(v) => {
                  if (!hasPermission('manageSettings')) return;
                  setFeatureEnabled('intelligenceWorkspace', Boolean(v));
                }}
              />
              <div className="text-xs text-muted-foreground">On</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Receipt Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Country</div>
              <Input
                value={receiptSettings.countryCode}
                onChange={(e) => setReceiptSettings((s) => ({ ...s, countryCode: e.target.value as ReceiptSettings['countryCode'] }))}
                placeholder="ZM"
              />
              <div className="text-xs text-muted-foreground">
                Zambia uses smart QR for verification; others use review/digital links.
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Currency</div>
              <Input
                value={receiptSettings.currencyCode}
                onChange={(e) => setReceiptSettings((s) => ({ ...s, currencyCode: e.target.value as ReceiptSettings['currencyCode'] }))}
                placeholder="ZMW"
              />
              <div className="text-xs text-muted-foreground">Used for totals and USD conversion.</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Legal Footer</div>
            <Textarea
              value={receiptSettings.legalFooter}
              onChange={(e) => setReceiptSettings((s) => ({ ...s, legalFooter: e.target.value }))}
              placeholder="Paste your required legal text here..."
              rows={4}
            />
          </div>

          {!isZambia && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Google Review URL (QR)</div>
                <Input
                  value={receiptSettings.googleReviewUrl ?? ''}
                  onChange={(e) => setReceiptSettings((s) => ({ ...s, googleReviewUrl: e.target.value || undefined }))}
                  placeholder="https://g.page/r/.../review"
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Digital Receipt Base URL (QR)</div>
                <Input
                  value={receiptSettings.digitalReceiptBaseUrl ?? ''}
                  onChange={(e) => setReceiptSettings((s) => ({ ...s, digitalReceiptBaseUrl: e.target.value || undefined }))}
                  placeholder="https://yourdomain.com/r/"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={save}>Save Receipt Settings</Button>
            {savedAt && <div className="text-xs text-muted-foreground">Saved at {savedAt}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Departments</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="New department name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
            />
            <Button onClick={addDepartment} disabled={!newDeptName.trim() || !hasPermission('manageSettings')}>Add</Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {departmentsList.length === 0 ? (
              <div className="text-sm text-muted-foreground">No departments defined.</div>
            ) : (
              departmentsList.map((dept) => (
                <div key={dept.id} className="p-3 bg-muted rounded-md text-sm">{dept.name}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Suppliers</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Supplier name"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
            />
            <Input
              placeholder="Code (optional)"
              value={newSupplierCode}
              onChange={(e) => setNewSupplierCode(e.target.value)}
            />
            <Button onClick={addSupplier} disabled={!newSupplierName.trim() || !hasPermission('manageSettings')}>Add</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {suppliersList.length === 0 ? (
              <div className="text-sm text-muted-foreground">No suppliers defined.</div>
            ) : (
              suppliersList.map((s) => (
                <div key={s.id} className="p-3 bg-muted rounded-md text-sm">{s.name}{s.code ? ` • ${s.code}` : ''}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
