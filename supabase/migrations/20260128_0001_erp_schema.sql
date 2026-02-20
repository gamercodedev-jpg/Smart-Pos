-- High-end Restaurant ERP core schema (Supabase/Postgres)
-- Multi-unit inventory (UoM + per-item conversions)
-- Recipe explosion (BOM parent->children)
-- Store transfers (issue/receive with traceability)
-- Staff accountability (every transaction linked to user id)

begin;

create extension if not exists pgcrypto;

create schema if not exists erp;

-- ------------------------------
-- Enums
-- ------------------------------
do $$ begin
  create type erp.uom_dimension as enum ('mass','volume','count');
exception when duplicate_object then null; end $$;

do $$ begin
  create type erp.location_type as enum ('store','kitchen','bar','warehouse','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type erp.item_type as enum ('ingredient','menu_item','intermediate','retail','asset','service');
exception when duplicate_object then null; end $$;

do $$ begin
  create type erp.transfer_status as enum ('draft','issued','received','voided');
exception when duplicate_object then null; end $$;

do $$ begin
  create type erp.journal_type as enum (
    'purchase_receipt',
    'sale',
    'recipe_consumption',
    'production',
    'transfer_issue',
    'transfer_receive',
    'adjustment',
    'waste',
    'stock_count'
  );
exception when duplicate_object then null; end $$;

-- ------------------------------
-- Organization + Locations
-- ------------------------------
create table if not exists erp.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint organizations_name_chk check (char_length(name) >= 2)
);

create table if not exists erp.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references erp.organizations(id) on delete cascade,

  code text not null,
  name text not null,
  location_type erp.location_type not null default 'store',
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint locations_code_chk check (code ~ '^[A-Z0-9_-]{2,20}$'),
  constraint locations_name_chk check (char_length(name) >= 2)
);

create unique index if not exists locations_org_code_ux
  on erp.locations (organization_id, code);

-- ------------------------------
-- Units of Measure
-- ------------------------------
create table if not exists erp.uom (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,        -- e.g. G, KG, ML, L, EA, CRATE
  name text not null,              -- e.g. Gram
  dimension erp.uom_dimension not null,

  -- For same-dimension conversion. Pick a single base per dimension (multiplier=1).
  is_dimension_base boolean not null default false,
  to_dimension_base_multiplier numeric(18,6) not null,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint uom_code_chk check (code ~ '^[A-Z0-9_]{1,20}$'),
  constraint uom_multiplier_chk check (to_dimension_base_multiplier > 0),
  constraint uom_base_multiplier_chk check ((is_dimension_base and to_dimension_base_multiplier = 1) or (not is_dimension_base))
);

create unique index if not exists uom_one_base_per_dimension_ux
  on erp.uom (dimension)
  where is_dimension_base;

-- ------------------------------
-- Items (SKUs)
-- ------------------------------
create table if not exists erp.items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references erp.organizations(id) on delete cascade,

  sku text null,
  name text not null,
  item_type erp.item_type not null,

  base_uom_id uuid not null references erp.uom(id),

  -- Stocked items affect inventory on-hand; menu items can be non-stocked but still have recipes.
  is_stocked boolean not null default true,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint items_name_chk check (char_length(name) >= 2)
);

create unique index if not exists items_org_sku_ux
  on erp.items (organization_id, sku)
  where sku is not null;

create index if not exists items_org_type_ix
  on erp.items (organization_id, item_type);

-- ------------------------------
-- Per-item UoM conversions (supports cross-dimension like CRATE -> GRAM)
-- ------------------------------
create table if not exists erp.item_uom (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references erp.items(id) on delete cascade,
  uom_id uuid not null references erp.uom(id),

  -- How many item base units are in 1 of this uom.
  -- Examples:
  --   item base = G: 1 KG => 1000
  --   item base = G: 1 CRATE => 12000 (item-specific)
  --   item base = ML: 1 BOTTLE => 750
  to_item_base_multiplier numeric(18,6) not null,

  is_default_purchase boolean not null default false,
  is_default_issue boolean not null default false,
  is_default_sale boolean not null default false,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint item_uom_multiplier_chk check (to_item_base_multiplier > 0)
);

create unique index if not exists item_uom_item_uom_ux
  on erp.item_uom (item_id, uom_id);

create index if not exists item_uom_item_ix
  on erp.item_uom (item_id);

-- ------------------------------
-- Recipe (BOM): parent item -> child ingredients
-- ------------------------------
create table if not exists erp.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references erp.organizations(id) on delete cascade,

  parent_item_id uuid not null references erp.items(id) on delete restrict,

  yield_quantity numeric(18,6) not null default 1,
  yield_uom_id uuid not null references erp.uom(id),

  version int not null default 1,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint recipes_yield_chk check (yield_quantity > 0)
);

create unique index if not exists recipes_parent_version_ux
  on erp.recipes (organization_id, parent_item_id, version);

create index if not exists recipes_parent_active_ix
  on erp.recipes (parent_item_id, is_active);

create table if not exists erp.recipe_components (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references erp.recipes(id) on delete cascade,
  child_item_id uuid not null references erp.items(id) on delete restrict,

  quantity numeric(18,6) not null,
  uom_id uuid not null references erp.uom(id),

  waste_pct numeric(5,2) not null default 0, -- 0..100
  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint recipe_components_qty_chk check (quantity > 0),
  constraint recipe_components_waste_chk check (waste_pct >= 0 and waste_pct <= 100)
);

create unique index if not exists recipe_components_recipe_child_ux
  on erp.recipe_components (recipe_id, child_item_id);

-- ------------------------------
-- Inventory Journals (append-only, GAAP-style reversing entries)
-- ------------------------------
create table if not exists erp.inventory_journals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references erp.organizations(id) on delete cascade,

  journal_type erp.journal_type not null,

  -- Optional link to upstream document (POS sale id, transfer id, etc)
  source_table text null,
  source_id uuid null,

  reference text null,
  note text null,

  posted_at timestamptz not null default now(),
  posted_by uuid not null default auth.uid(),

  -- If this journal reverses another journal, set this to original id.
  reverses_journal_id uuid null references erp.inventory_journals(id) on delete restrict,
  reversal_reason text null,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint inv_journals_source_chk check ((source_table is null) = (source_id is null) or (source_table is not null and source_id is not null)),
  constraint inv_journals_reversal_reason_chk check ((reverses_journal_id is null) or (reversal_reason is not null and char_length(reversal_reason) >= 2))
);

create unique index if not exists inv_journals_single_reversal_ux
  on erp.inventory_journals (reverses_journal_id)
  where reverses_journal_id is not null;

create index if not exists inv_journals_org_type_posted_ix
  on erp.inventory_journals (organization_id, journal_type, posted_at desc);

create table if not exists erp.inventory_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references erp.inventory_journals(id) on delete cascade,
  location_id uuid not null references erp.locations(id) on delete restrict,
  item_id uuid not null references erp.items(id) on delete restrict,

  -- Signed quantity in the item's BASE UoM.
  -- Positive = adds stock at that location; Negative = deducts.
  quantity_base numeric(18,6) not null,

  unit_cost numeric(18,6) null,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint inv_lines_qty_nonzero_chk check (quantity_base <> 0)
);

create index if not exists inv_lines_location_item_ix
  on erp.inventory_journal_lines (location_id, item_id);

create index if not exists inv_lines_item_ix
  on erp.inventory_journal_lines (item_id);

-- ------------------------------
-- Transfers (Was-Issued-Now logic)
-- ------------------------------
create table if not exists erp.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references erp.organizations(id) on delete cascade,

  from_location_id uuid not null references erp.locations(id) on delete restrict,
  to_location_id uuid not null references erp.locations(id) on delete restrict,

  status erp.transfer_status not null default 'draft',

  reference text null,
  note text null,

  issued_at timestamptz null,
  issued_by uuid null references auth.users(id) on delete set null,

  received_at timestamptz null,
  received_by uuid null references auth.users(id) on delete set null,

  voided_at timestamptz null,
  voided_by uuid null references auth.users(id) on delete set null,
  void_reason text null,

  issue_journal_id uuid null references erp.inventory_journals(id) on delete set null,
  receive_journal_id uuid null references erp.inventory_journals(id) on delete set null,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint transfers_locations_chk check (from_location_id <> to_location_id),
  constraint transfers_void_reason_chk check ((voided_at is null) or (void_reason is not null and char_length(void_reason) >= 2))
);

create index if not exists stock_transfers_org_status_ix
  on erp.stock_transfers (organization_id, status, created_at desc);

create table if not exists erp.stock_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references erp.stock_transfers(id) on delete cascade,
  item_id uuid not null references erp.items(id) on delete restrict,

  -- what was issued (from from_location)
  issued_quantity numeric(18,6) null,
  issued_uom_id uuid null references erp.uom(id),
  issued_qty_base numeric(18,6) null,

  -- what is received (to to_location). may differ due to shrinkage/spoilage.
  received_quantity numeric(18,6) null,
  received_uom_id uuid null references erp.uom(id),
  received_qty_base numeric(18,6) null,

  note text null,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  constraint transfer_lines_issued_chk check (issued_quantity is null or issued_quantity > 0),
  constraint transfer_lines_received_chk check (received_quantity is null or received_quantity > 0),
  constraint transfer_lines_issued_pair_chk check ((issued_quantity is null and issued_uom_id is null) or (issued_quantity is not null and issued_uom_id is not null)),
  constraint transfer_lines_received_pair_chk check ((received_quantity is null and received_uom_id is null) or (received_quantity is not null and received_uom_id is not null))
);

create unique index if not exists transfer_lines_transfer_item_ux
  on erp.stock_transfer_lines (transfer_id, item_id);

-- ------------------------------
-- UoM conversion helpers
-- ------------------------------
create or replace function erp.uom_convert_same_dimension(
  p_qty numeric,
  p_from_uom uuid,
  p_to_uom uuid
) returns numeric
language plpgsql
stable
as $$
declare
  v_from record;
  v_to record;
begin
  if p_from_uom = p_to_uom then
    return p_qty;
  end if;

  select dimension, to_dimension_base_multiplier into v_from
  from erp.uom where id = p_from_uom;

  select dimension, to_dimension_base_multiplier into v_to
  from erp.uom where id = p_to_uom;

  if v_from.dimension is null or v_to.dimension is null then
    raise exception 'Unknown UoM';
  end if;

  if v_from.dimension <> v_to.dimension then
    raise exception 'Cannot convert between different dimensions without item-specific mapping';
  end if;

  -- Convert: from -> dimension base -> to
  return (p_qty * v_from.to_dimension_base_multiplier) / v_to.to_dimension_base_multiplier;
end;
$$;

create or replace function erp.item_qty_to_base(
  p_item_id uuid,
  p_qty numeric,
  p_uom_id uuid
) returns numeric
language plpgsql
stable
as $$
declare
  v_item record;
  v_from record;
  v_base record;
  v_map numeric;
begin
  select base_uom_id into v_item
  from erp.items where id = p_item_id;

  if v_item.base_uom_id is null then
    raise exception 'Unknown item %', p_item_id;
  end if;

  if p_uom_id = v_item.base_uom_id then
    return p_qty;
  end if;

  select dimension into v_from from erp.uom where id = p_uom_id;
  select dimension into v_base from erp.uom where id = v_item.base_uom_id;

  if v_from.dimension = v_base.dimension then
    return erp.uom_convert_same_dimension(p_qty, p_uom_id, v_item.base_uom_id);
  end if;

  select to_item_base_multiplier into v_map
  from erp.item_uom
  where item_id = p_item_id and uom_id = p_uom_id;

  if v_map is null then
    raise exception 'Missing item_uom mapping for item % from uom % to item base', p_item_id, p_uom_id;
  end if;

  return p_qty * v_map;
end;
$$;

-- ------------------------------
-- Append-only (anti-tamper) triggers
-- ------------------------------
create or replace function erp.prevent_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'This table is append-only. Use reversing entries instead.';
end;
$$;

-- Inventory journals + lines should be immutable for audit.
-- (You can still insert new journals/lines, including reversals.)
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_journals_no_update') then
    create trigger inv_journals_no_update
      before update or delete on erp.inventory_journals
      for each row execute function erp.prevent_update_delete();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'inv_lines_no_update') then
    create trigger inv_lines_no_update
      before update or delete on erp.inventory_journal_lines
      for each row execute function erp.prevent_update_delete();
  end if;
end $$;

-- ------------------------------
-- Reversal / Void function (GAAP-style reversing journal)
-- ------------------------------
create or replace function erp.reverse_inventory_journal(
  p_journal_id uuid,
  p_user_id uuid,
  p_reason text
) returns uuid
language plpgsql
as $$
declare
  v_j erp.inventory_journals%rowtype;
  v_new_id uuid;
begin
  if p_reason is null or char_length(p_reason) < 2 then
    raise exception 'Reversal reason required';
  end if;

  select * into v_j
  from erp.inventory_journals
  where id = p_journal_id;

  if not found then
    raise exception 'Journal not found %', p_journal_id;
  end if;

  if exists (select 1 from erp.inventory_journals where reverses_journal_id = p_journal_id) then
    raise exception 'Journal % already reversed', p_journal_id;
  end if;

  insert into erp.inventory_journals (
    organization_id,
    journal_type,
    source_table,
    source_id,
    reference,
    note,
    posted_at,
    posted_by,
    reverses_journal_id,
    reversal_reason,
    created_at,
    created_by
  ) values (
    v_j.organization_id,
    v_j.journal_type,
    v_j.source_table,
    v_j.source_id,
    coalesce(v_j.reference, '') || ' (REVERSAL)',
    v_j.note,
    now(),
    p_user_id,
    v_j.id,
    p_reason,
    now(),
    p_user_id
  ) returning id into v_new_id;

  insert into erp.inventory_journal_lines (
    journal_id,
    location_id,
    item_id,
    quantity_base,
    unit_cost,
    meta,
    created_at,
    created_by
  )
  select
    v_new_id,
    l.location_id,
    l.item_id,
    (l.quantity_base * -1),
    l.unit_cost,
    jsonb_set(l.meta, '{reversal_of_line}', to_jsonb(l.id), true),
    now(),
    p_user_id
  from erp.inventory_journal_lines l
  where l.journal_id = v_j.id;

  return v_new_id;
end;
$$;

-- ------------------------------
-- Inventory On-hand view (fast, trustworthy: sums immutable ledger)
-- ------------------------------
create or replace view erp.inventory_on_hand as
select
  l.organization_id,
  ln.location_id,
  ln.item_id,
  sum(ln.quantity_base) as on_hand_base
from erp.inventory_journals l
join erp.inventory_journal_lines ln on ln.journal_id = l.id
group by l.organization_id, ln.location_id, ln.item_id;

-- ------------------------------
-- POS (Menu + Orders)
-- Stored in the `erp` schema so it can be used alongside inventory/recipes.
-- Note: This is a demo-friendly RLS setup (allows anon/authenticated).
-- In production, restrict by organization_id and user roles.
-- ------------------------------

create table if not exists erp.pos_categories (
  id text primary key,
  name text not null,
  color text null,
  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pos_categories_sort_ix
  on erp.pos_categories (sort_order);

create table if not exists erp.pos_menu_items (
  id text primary key,
  code text not null,
  name text not null,
  category_id text not null references erp.pos_categories(id) on delete restrict,
  price numeric(18,2) not null default 0,
  cost numeric(18,2) not null default 0,
  image text null,
  is_available boolean not null default true,
  modifier_groups text[] null,
  track_inventory boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pos_menu_items_code_chk check (char_length(code) >= 1),
  constraint pos_menu_items_name_chk check (char_length(name) >= 1)
);

create index if not exists pos_menu_items_category_ix
  on erp.pos_menu_items (category_id);

create index if not exists pos_menu_items_available_ix
  on erp.pos_menu_items (is_available);

create table if not exists erp.pos_orders (
  id text primary key,
  order_no bigint not null,
  table_no int null,
  order_type text not null,
  status text not null,

  staff_id text not null,
  staff_name text not null,

  subtotal numeric(18,2) not null,
  discount_amount numeric(18,2) not null default 0,
  discount_percent numeric(6,2) not null default 0,
  tax numeric(18,2) not null,
  total numeric(18,2) not null,
  total_cost numeric(18,2) not null,
  gross_profit numeric(18,2) not null,
  gp_percent numeric(6,2) not null,

  payment_method text null,
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  paid_at timestamptz null
);

create index if not exists pos_orders_created_ix
  on erp.pos_orders (created_at desc);

create index if not exists pos_orders_status_ix
  on erp.pos_orders (status);

create table if not exists erp.pos_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references erp.pos_orders(id) on delete cascade,

  menu_item_id text not null,
  menu_item_code text not null,
  menu_item_name text not null,
  quantity int not null,
  unit_price numeric(18,2) not null,
  unit_cost numeric(18,2) not null,
  discount_percent numeric(6,2) null,
  total numeric(18,2) not null,
  notes text null,
  modifiers text[] null,
  is_voided boolean not null default false,
  void_reason text null,
  sent_to_kitchen boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists pos_order_items_order_ix
  on erp.pos_order_items (order_id);

-- Security incidents from the entry gateway (and later: void/discount events)
create table if not exists erp.security_violations (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  role text not null,
  reason text not null,
  path text null,
  user_agent text null,
  photo_base64 text null
);

create index if not exists security_violations_occurred_ix
  on erp.security_violations (occurred_at desc);

-- Enable RLS (Supabase best-practice) + demo-permissive policies
alter table erp.pos_categories enable row level security;
alter table erp.pos_menu_items enable row level security;
alter table erp.pos_orders enable row level security;
alter table erp.pos_order_items enable row level security;
alter table erp.security_violations enable row level security;

do $$ begin
  create policy "pos_categories_read" on erp.pos_categories
    for select to anon, authenticated
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pos_categories_write" on erp.pos_categories
    for all to anon, authenticated
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pos_menu_items_read" on erp.pos_menu_items
    for select to anon, authenticated
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pos_menu_items_write" on erp.pos_menu_items
    for all to anon, authenticated
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pos_orders_read" on erp.pos_orders
    for select to anon, authenticated
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pos_orders_write" on erp.pos_orders
    for all to anon, authenticated
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pos_order_items_read" on erp.pos_order_items
    for select to anon, authenticated
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pos_order_items_write" on erp.pos_order_items
    for all to anon, authenticated
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "security_violations_write" on erp.security_violations
    for insert to anon, authenticated
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "security_violations_read" on erp.security_violations
    for select to anon, authenticated
    using (true);
exception when duplicate_object then null; end $$;

commit;
