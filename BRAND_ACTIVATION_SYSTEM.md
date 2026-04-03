# Brand Activation System - Implementation Guide

## Overview
A new brand activation management system has been implemented to control user access based on brand activation status. This allows you to:

- Automatically set new brands as **inactive** upon creation
- Show a persistent **activation modal** with contact information
- Prevent app feature access until brand is activated
- Track activation status and timestamps in the database

## What Was Changed

### 1. Database Migration (023_add_brand_activation_fields.sql)
Added three new columns to the `brands` table:
- **`is_active`** (boolean) - Default: `false` - Controls if brand is activated
- **`activation_phone`** (text) - Contact phone for activation requests (default: "0970105334")
- **`activation_email`** (text) - Contact email for activation requests (default: "kulturesik30@gmail.com")
- **`activated_at`** (timestamptz) - Timestamp when brand was activated

### 2. Database RPC Function (024_add_brand_activation_rpc.sql)
A PostgreSQL function to activate/deactivate brands:
```sql
SELECT activate_brand(brand_id, true); -- Activate a brand
SELECT activate_brand(brand_id, false); -- Deactivate a brand
```

### 3. Frontend Changes

#### BrandActivationModal Component
New modal component that displays:
- Brand name
- Warning that brand is inactive
- Phone number with copy-to-clipboard functionality
- Email address with copy-to-clipboard functionality
- Instructions for activation
- A "Not Yet" button (cannot dismiss permanently - shows warning)
- "Waiting for Activation" disabled button

**File:** `src/components/common/BrandActivationModal.tsx`

#### BrandActivationGuard Component
A wrapper component that:
- Monitors brand activation status
- Shows activation modal persistently if brand is inactive
- Prevents dismissal without proper acknowledgment
- Displays for all authenticated users with inactive brands

**File:** `src/components/common/BrandActivationGuard.tsx`

#### Updated CreateBrand Page
- When a new brand is created, `is_active` is set to `false`
- Immediately shows the activation modal instead of navigating to dashboard
- User can dismiss modal but will see it persistently on all routes

**File:** `src/pages/onboarding/CreateBrand.tsx`

#### AuthContext Updates
- Added `brandIsActive` state to track activation status
- Checks brand activation on login and profile load
- Exposes `brandIsActive` in the auth context for app-wide access

**File:** `src/contexts/AuthContext.tsx`

#### App.tsx
- Added `BrandActivationGuard` component to main app layout
- Guard displays alert alongside other prominent modals

## User Flow

### For New Brand Creators:
1. User creates brand via CreateBrand page
2. Brand is created with `is_active = false`
3. **Activation modal appears immediately**
4. Shows contact options:
   - Call: **0970105334**
   - Email: **kulturesik30@gmail.com**
5. User can dismiss but modal reappears on every app interaction
6. Admin manually activates brand via dashboard/RPC call

### For All App Users:
- On login, if brand is `is_active = false`, the guard shows activation modal
- Modal is persistent and cannot be permanently dismissed
- Modal reappears on page refresh or navigation
- User is blocked from using most features (or can implement optional feature gating)

## How to Activate Brands (Admin)

### Option 1: Using Supabase Dashboard
1. Go to Supabase console
2. Open SQL editor
3. Run:
```sql
SELECT activate_brand('BRAND_ID_HERE'::uuid, true);
```

### Option 2: Create an Admin Page (Future Implementation)
You could add a brand management page where super_admins can:
- View list of all brands
- See activation status
- Click "Activate" button to activate pending brands

## Customization

### Change Contact Information
Edit the modal contact info by modifying the activation phone/email in:
1. `BrandActivationModal.tsx` props defaults
2. Database values for individual brands
3. Migration defaults (023_add_brand_activation_fields.sql)

### Auto-Activate Brands
To auto-activate new brands (remove the activation gate), modify `CreateBrand.tsx`:
```typescript
const { data: b, error: err } = await supabase
  .from('brands')
  .insert({ 
    name: name.trim(),
    is_active: true, // Change from false to true
  })
```

### Feature Gating (Optional Enhancement)
To prevent certain features from working without brand activation, you could:
1. Add route guards that check `auth.brandIsActive`
2. Disable specific buttons/features conditionally
3. Show feature unavailable modals

Example in component:
```typescript
const { brandIsActive } = useAuth();

if (!brandIsActive) {
  return <div>Feature unavailable - activate brand first</div>;
}
```

## Files Modified/Created

### New Files:
- `src/components/common/BrandActivationModal.tsx`
- `src/components/common/BrandActivationGuard.tsx`
- `supabase/migrations/023_add_brand_activation_fields.sql`
- `supabase/migrations/024_add_brand_activation_rpc.sql`

### Modified Files:
- `src/pages/onboarding/CreateBrand.tsx`
- `src/contexts/AuthContext.tsx`
- `src/App.tsx`

## Testing the Feature

### Test New Brand Creation:
1. Navigate to brand creation page
2. Create a new brand
3. Activation modal should appear
4. Try to dismiss - warning appears
5. Reload page - modal reappears
6. Try different routes - modal persists

### Test Brand Activation:
1. Use Supabase RPC to activate: `SELECT activate_brand('BRAND_ID'::uuid, true);`
2. Reload app or logout/login
3. Activation modal should no longer appear
4. App features should be accessible

## Database Queries for Management

### Check all inactive brands:
```sql
SELECT id, name, created_at, activation_phone, activation_email 
FROM brands WHERE is_active = false
ORDER BY created_at DESC;
```

### Check recently activated brands:
```sql
SELECT id, name, activated_at 
FROM brands WHERE is_active = true
ORDER BY activated_at DESC
LIMIT 20;
```

### Activate multiple brands:
```sql
UPDATE brands 
SET is_active = true, activated_at = now()
WHERE id IN ('id1', 'id2', 'id3');
```

## Future Enhancements

1. **Admin Dashboard** - Create page to view/manage all brands
2. **Automated Notifications** - Send email when brand is activated
3. **Activation Codes** - Generate unique codes for brand activation
4. **Approval Workflow** - Require manual approval before activation
5. **Multi-brand Support** - Allow users to manage multiple brands
6. **Plan Tiers** - Link activation to subscription plans

## Support Contact Information

Current contact details in modal:
- **Phone:** 0970105334
- **Email:** kulturesik30@gmail.com

Update these in the migration (024_add_brand_activation_rpc.sql) or per-brand in the database.
