import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import BrandActivationModal from '@/components/common/BrandActivationModal';

export default function CreateBrand() {
  const { user, brand } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [createdBrandName, setCreatedBrandName] = useState('');

  useEffect(() => {
    if (!user) return;
    if (brand) {
      // already linked, redirect to dashboard/pos
      navigate('/admin-dashboard', { replace: true });
    }
  }, [brand, user, navigate]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Brand name is required');
      return;
    }
    setBusy(true);
    try {
      // insert brand (is_active defaults to false)
      const { data: b, error: err } = await supabase
        .from('brands')
        .insert({ 
          name: name.trim(),
          is_active: false, // Set to inactive by default
        })
        .select()
        .maybeSingle();
      if (err || !b) throw err || new Error('Failed to create brand');
      
      // link staff row
      const { error: updErr } = await supabase
        .from('staff')
        .update({ brand_id: b.id })
        .eq('id', user?.id);
      if (updErr) throw updErr;
      
      // Store brand name and show activation modal instead of navigating
      setCreatedBrandName(b.name);
      setShowActivationModal(true);
      setName('');
    } catch (e: any) {
      setError(e.message || 'Error creating brand');
      setBusy(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <form onSubmit={submit} className="w-full max-w-md bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-semibold mb-4">Create your brand</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Brand Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 cursor-disabled"
          >
            {busy ? 'Creating...' : 'Create Brand'}
          </button>
        </form>
      </div>
      
      {/* Activation Modal - shown after successful brand creation */}
      <BrandActivationModal
        open={showActivationModal}
        brandName={createdBrandName}
        onDismissRequest={() => {
          setShowActivationModal(false);
          // Allow user to stay on create page or navigate after dismissing
          // They can try to access the app but will see activation warning
        }}
      />
    </>
  );
}
