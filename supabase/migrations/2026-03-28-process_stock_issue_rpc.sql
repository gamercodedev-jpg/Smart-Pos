-- RPC: process_stock_issue
-- Atomically inserts stock_issues rows and decrements stock_items.current_stock.
-- Fails with 'Low Stock' if any line would result in negative current_stock.

create or replace function public.process_stock_issue(
  p_brand_id uuid,
  p_date date,
  p_created_by text,
  p_lines jsonb
) returns void as $$
declare
  ln jsonb;
  v_item_id uuid;
  v_qty numeric;
  v_cur numeric;
begin
  if p_lines is null then
    return;
  end if;

  for ln in select * from jsonb_array_elements(p_lines) loop
    v_item_id := (ln ->> 'stock_item_id')::uuid;
    v_qty := (ln ->> 'qty_issued')::numeric;

    -- Lock the stock_items row for update to avoid races
    select current_stock into v_cur from public.stock_items where id = v_item_id and brand_id = p_brand_id for update;
    if v_cur is null then
      raise exception 'Item not found';
    end if;

    if v_cur - v_qty < 0 then
      raise exception 'Low Stock';
    end if;

    update public.stock_items
    set current_stock = v_cur - v_qty,
        updated_at = now()
    where id = v_item_id and brand_id = p_brand_id;

    insert into public.stock_issues(
      id, brand_id, stock_item_id, issue_type, qty_issued, unit_cost_at_time, total_value_lost, notes, created_by, created_at
    ) values (
      (ln ->> 'id')::uuid,
      p_brand_id,
      v_item_id,
      ln ->> 'issue_type',
      v_qty,
      (ln ->> 'unit_cost_at_time')::numeric,
      (ln ->> 'total_value_lost')::numeric,
      ln ->> 'notes',
      p_created_by,
      now()
    ) on conflict do nothing;
  end loop;
end;
$$ language plpgsql security definer;

grant execute on function public.process_stock_issue(uuid, date, text, jsonb) to authenticated;
