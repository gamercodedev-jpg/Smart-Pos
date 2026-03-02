inpage.js:166 
 The above error occurred in the <MainLayout> component:

    at MainLayout (http://localhost:5173/src/components/layout/MainLayout.tsx?t=1772466957360:38:22)
    at ProtectedRoute (http://localhost:5173/src/components/common/ProtectedRoute.tsx?t=1772465867177:25:34)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=81cce5c4:4130:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=81cce5c4:4600:5)
    at Suspense
    at Provider (http://localhost:5173/node_modules/.vite/deps/chunk-VAJLCKSY.js?v=81cce5c4:38:15)
    at TooltipProvider (http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=81cce5c4:64:5)
    at CurrencyProvider (http://localhost:5173/src/contexts/CurrencyContext.tsx:47:29)
    at BrandingProvider (http://localhost:5173/src/contexts/BrandingContext.tsx?t=1772466957360:45:36)
    at QueryClientProvider (http://localhost:5173/node_modules/.vite/deps/@tanstack_react-query.js?v=81cce5c4:2934:3)
    at App (http://localhost:5173/src/App.tsx?t=1772468138855:97:25)
    at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=81cce5c4:4543:15)
    at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=81cce5c4:5289:5)
    at TenantProvider (http://localhost:5173/src/contexts/TenantContext.tsx?t=1772465867177:27:34)
    at AuthProvider (http://localhost:5173/src/contexts/AuthContext.tsx?t=1772465867177:25:32)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
react-dom.development.js:26962 
 Uncaught TypeError: Cannot read properties of undefined (reading 'charAt')
    at MainLayout.tsx:96:35
    at Array.map (<anonymous>)
    at MainLayout (MainLayout.tsx:88:29)
inpage.js:166 
 
 GET https://rbxvjmsqpnoncncwglms.supabase.co/rest/v1/categories?select=id%2Cname&order=name.asc 404 (Not Found)
posMenuStore.ts:66 
 [posMenuStore] refresh using public tables failed, retrying legacy erp schema 
{code: 'PGRST205', details: null, hint: "Perhaps you meant the table 'public.stores'", message: "Could not find the table 'public.categories' in the schema cache"}
fetch.ts:7 
 
 GET https://rbxvjmsqpnoncncwglms.supabase.co/rest/v1/pos_categories?select=id%2Cname%2Ccolor%2Csort_order&order=sort_order.asc 406 (Not Acceptable)
posMenuStore.ts:104 
 [posMenuStore] Failed to load from Supabase 
{code: 'PGRST106', details: null, hint: 'Only the following schemas are exposed: public, graphql_public', message: 'Invalid schema: erp'}
﻿
