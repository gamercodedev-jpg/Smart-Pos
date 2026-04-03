# Real-Time Brand Deactivation System

## How It Works

You now have **real-time monitoring** of brand activation status. When you change `is_active` in the database, the app will detect the change within seconds and show the deactivation modal automatically.

### Process:

1. **User is logged in** with an active brand
2. **You change `is_active = false`** in the Supabase dashboard
3. **App detects the change** via real-time subscription (usually within 1-3 seconds)
4. **Profile is refreshed automatically** to get the latest brand state
5. **Deactivation modal appears** on the user's screen
6. **User cannot access app features** until you reactivate

---

## Setup Required

To enable real-time monitoring, you need to run the migration that enables PostgreSQL real-time on the brands table:

### **In Supabase Dashboard:**

1. Go to **SQL Editor**
2. Create a new query
3. Copy and paste the contents of **`025_enable_realtime_brands.sql`**
4. Click **Run**

This will:
- Enable realtime publication for the `brands` table
- Set up Row Level Security (RLS) policies
- Ensure secure real-time subscriptions

### **Or run migrations automatically:**
If you have a migration runner set up, this will run automatically with your next deployment.

---

## What Changed

### New Hook: `useBrandActivationMonitor`
This hook does two things:

1. **Real-time Listener** - Subscribes to changes on the brands table
   - Listens for updates to the user's brand
   - Automatically refreshes profile when brand changes

2. **Fallback Polling** - Every 30 seconds, checks if brand status changed
   - Handles cases where real-time connection is unavailable
   - Ensures deactivation is detected even with connectivity issues

### Updated Guard: `BrandActivationGuard`
- Now uses the monitoring hook
- Dynamically shows/hides modal based on real-time changes
- No app restart needed

---

## Testing Deactivation

### Step 1: User Logs In
- Have a user log into the app normally
- They should not see any modal (brand is active)

### Step 2: Deactivate the Brand
1. Open Supabase dashboard → Tables → brands
2. Find the user's brand row
3. Set `is_active = false`
4. Hit Enter/Save

### Step 3: Watch It Update
- **Within 1-3 seconds**, the user's app should show the deactivation modal
- They cannot interact with the app until reactivated
- Modal cannot be dismissed

### Step 4: Reactivate
1. Set `is_active = true` in database
2. Modal disappears within seconds
3. App features become available again

---

## For Monthly Subscription Management

Perfect for non-paying customers:

1. **Month ends** → Customer hasn't paid
2. **You deactivate brand** → Set `is_active = false` in database
3. **User sees modal** → "Your brand is inactive. Contact support at 0970105334"
4. **User pays** → You reactivate → Set `is_active = true`
5. **App unlocks** → User can use features again

---

## SQL Commands

### Deactivate a brand:
```sql
UPDATE brands SET is_active = false WHERE name = 'Customer Name';
```

### Reactivate a brand:
```sql
UPDATE brands SET is_active = true WHERE name = 'Customer Name';
```

### Check all inactive brands:
```sql
SELECT id, name, created_at, is_active FROM brands WHERE is_active = false;
```

### Deactivate all brands not updated in 30 days:
```sql
UPDATE brands 
SET is_active = false 
WHERE is_active = true 
AND updated_at < NOW() - INTERVAL '30 days';
```

---

## Monitoring Frequency

- **Real-time**: Usually 1-3 seconds after database change
- **Fallback poll**: Every 30 seconds if real-time fails
- **No periodic refresh**: The app doesn't waste bandwidth checking constantly

---

## Troubleshooting

### Modal doesn't appear after deactivating:

1. **Check migration ran** - Verify you ran `025_enable_realtime_brands.sql`
2. **Check database value** - Make sure `is_active` is actually `false`
3. **User refresh** - Ask user to reload the page (Ctrl+R / Cmd+R)
4. **Wait a moment** - Real-time can take 1-3 seconds to propagate

### Real-time not working:

1. Make sure Supabase real-time is enabled in your project settings
2. Check browser console for errors
3. Fallback polling will still work (every 30 seconds)

### User still sees modal after reactivating:

1. Verify `is_active = true` in database
2. User should reload page (modal may take up to 30 seconds with polling fallback)
3. Real-time usually updates within 1-3 seconds

---

## Files Changed

- **New:** `src/hooks/useBrandActivationMonitor.ts` - Real-time monitoring hook
- **Updated:** `src/components/common/BrandActivationGuard.tsx` - Now uses monitoring hook
- **New:** `supabase/migrations/025_enable_realtime_brands.sql` - Enables real-time

---

## Summary

✅ Change `is_active` in database  
✅ App detects change within seconds  
✅ Deactivation modal appears automatically  
✅ Works instantly for subscription management  
✅ No code deployment needed  

Done! You now have real-time brand deactivation. 🚀
