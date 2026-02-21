create table public.manufacturing_recipes (
  id uuid not null default gen_random_uuid (),
  product_id uuid null,
  product_code text null,
  name text null,
  code text null,
  output_qty numeric null default 1,
  unit_type text null default 'EACH'::text,
  finished_department_id uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint manufacturing_recipes_pkey primary key (id),
  constraint manufacturing_recipes_product_id_fkey foreign KEY (product_id) references products (id) on delete set null
) TABLESPACE pg_default;

create unique INDEX IF not exists uniq_manufacturing_recipes_product_code on public.manufacturing_recipes using btree (product_code) TABLESPACE pg_default
where
  (product_code is not null);

create unique INDEX IF not exists uniq_manufacturing_recipes_product_id on public.manufacturing_recipes using btree (product_id) TABLESPACE pg_default
where
  (product_id is not null);


  create table public.manufacturing_recipe_ingredients (
  id uuid not null default gen_random_uuid (),
  manufacturing_recipe_id uuid not null,
  stock_item_id uuid not null,
  quantity_used numeric null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint manufacturing_recipe_ingredients_pkey primary key (id),
  constraint manufacturing_recipe_ingredients_manufacturing_recipe_id_fkey foreign KEY (manufacturing_recipe_id) references manufacturing_recipes (id) on delete CASCADE,
  constraint manufacturing_recipe_ingredients_stock_item_id_fkey foreign KEY (stock_item_id) references stock_items (id) on delete RESTRICT
) TABLESPACE pg_default;


create table public.recipes (
  id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  stock_item_id uuid not null,
  quantity_used numeric null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint recipes_pkey primary key (id),
  constraint recipes_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint recipes_stock_item_id_fkey foreign KEY (stock_item_id) references stock_items (id) on delete RESTRICT
) TABLESPACE pg_default;