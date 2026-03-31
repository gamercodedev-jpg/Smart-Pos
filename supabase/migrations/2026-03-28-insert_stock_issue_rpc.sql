-- Updated RPC to accept single-item stock_issues shape per cd.md
-- Usage: call with brand_id (uuid), p_date (date), p_created_by (text), and p_lines (jsonb array)
-- Each line should include: id, stock_item_id, issue_type, qty_issued, unit_cost_at_time, total_value_lost, notes

create or replace function public.insert_stock_issue(
  p_brand_id uuid,
  p_date date,
  p_created_by text,
  p_lines jsonb
) returns void as $$
declare
  ln jsonb;
begin
  if p_lines is null then
    return;
  end if;

  for ln in select * from jsonb_array_elements(p_lines) loop
    -- insert the stock_issues row; the AFTER INSERT trigger will decrement stock_items.current_stock
    insert into public.stock_issues(
      id, brand_id, stock_item_id, issue_type, qty_issued, unit_cost_at_time, total_value_lost, notes, created_by, created_at
    ) values (
      (ln ->> 'id')::uuid,
      p_brand_id,
      (ln ->> 'stock_item_id')::uuid,
      ln ->> 'issue_type',
      (ln ->> 'qty_issued')::numeric,
      (ln ->> 'unit_cost_at_time')::numeric,
      (ln ->> 'total_value_lost')::numeric,
      ln ->> 'notes',
      p_created_by,
      now()
    ) on conflict do nothing;
  end loop;
end;
$$ language plpgsql security definer;

grant execute on function public.insert_stock_issue(uuid, date, text, jsonb) to authenticated;
