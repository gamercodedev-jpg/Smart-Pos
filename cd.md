-- 1. The Brand (The Business Owner)
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('restaurant', 'retail')),
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Stores (Physical Locations)
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL, -- e.g., "Downtown Branch"
    address TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Staff/Users
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL, -- Null if they are Brand Admin
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'manager', 'waiter', 'cashier')),
    pin_code TEXT -- For quick POS login
);

Gemini said
To build a truly flexible system, we’ll organize the database into four layers: the Core (Brand & Store), Shared Inventory, Restaurant-Specific, and Retail-Specific.

1. The Core Infrastructure (Tenancy)
This layer ensures that when a user signs up, the system knows exactly which features to toggle.

SQL
-- The root "Brand" table
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('restaurant', 'retail')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Physical locations under a brand
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
2. Restaurant-Specific Tables
These tables only populate data if the user is running a kitchen/dining environment.

SQL
-- Table Layout
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    status TEXT DEFAULT 'available' -- 'available', 'occupied', 'dirty'
);

-- Recipe Logic (Linking Menu Items to Raw Ingredients)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
    quantity_used DECIMAL(12,2) NOT NULL
);

-- Kitchen Routing
CREATE TABLE kds_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL -- e.g., 'Grill', 'Salad', 'Bar'
);
3. Retail-Specific Tables
These tables focus on Variants (size/color) and Barcodes for rapid scanning.

SQL
-- Product Variants (e.g., T-Shirt -> Blue, Large)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL, -- 'Large, Blue'
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    price_override DECIMAL(12,2),
    stock_quantity DECIMAL(12,2) DEFAULT 0.00
);

-- Loyalty & Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT,
    loyalty_points INTEGER DEFAULT 0
);