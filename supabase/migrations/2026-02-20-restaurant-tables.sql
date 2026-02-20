-- ==========================================
-- 1. CORE INFRASTRUCTURE (Multi-Tenancy)
-- ==========================================

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('restaurant', 'retail')),
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL,
    address TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'manager', 'waiter', 'cashier')),
    pin_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. SHARED PRODUCT & CATEGORY ENGINE
-- ==========================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('kitchen', 'bar', 'retail'))
);

-- Master table for anything sold (Dish or Retail Item)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(12,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. INVENTORY & STOCK MANAGEMENT
-- ==========================================

CREATE TABLE stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    item_code TEXT,
    unit TEXT NOT NULL, -- 'g', 'ml', 'pcs', 'kg'
    current_stock DECIMAL(12,2) DEFAULT 0.00,
    min_stock_level DECIMAL(12,2) DEFAULT 0.00,
    cost_per_unit DECIMAL(12,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking every stock movement (Sales, Waste, Restock)
CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
    change_amount DECIMAL(12,2) NOT NULL,
    entry_type TEXT NOT NULL, -- 'SALE', 'WASTE', 'RESTOCK'
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. RESTAURANT-SPECIFIC MODULE
-- ==========================================

CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'dirty'))
);

-- Recipe links a Product to its raw Ingredients
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
    quantity_used DECIMAL(12,2) NOT NULL
);

CREATE TABLE kds_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL -- 'Grill', 'Pizza', 'Bar'
);

-- ==========================================
-- 5. RETAIL-SPECIFIC MODULE
-- ==========================================

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL, -- e.g., 'Large / Blue'
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    price_override DECIMAL(12,2),
    stock_quantity DECIMAL(12,2) DEFAULT 0.00
);

-- ==========================================
-- 6. SALES & TRANSACTION ENGINE
-- ==========================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id),
    table_id UUID REFERENCES tables(id), -- Null for retail
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    order_type TEXT DEFAULT 'dine-in', -- 'dine-in', 'takeaway', 'retail'
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id), -- Used for retail
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    cooking_status TEXT DEFAULT 'pending' -- 'pending', 'cooking', 'served'
);