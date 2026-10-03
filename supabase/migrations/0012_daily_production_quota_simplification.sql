-- 0012_daily_production_quota_simplification.sql
-- Remove restock and raw-ingredient inventory. Product production quotas are
-- the only runtime availability limit. A NULL quota means unlimited.

-- Hosted evidence objects must be exported and removed through the Storage
-- API before this migration runs. The guarded DEV export also removes the
-- bucket. On a fresh replay, migration 0010 creates an empty bucket; Supabase
-- forbids SQL bucket deletion, so 0012 removes its policies and references.
do $$
begin
  if exists (
    select 1 from storage.objects where bucket_id = 'stock-in-evidence'
  ) then
    raise exception
      'stock-in-evidence must be exported and emptied before migration 0012';
  end if;
end
$$;

drop policy if exists "stock_evidence_admin_read" on storage.objects;
drop policy if exists "stock_evidence_admin_insert" on storage.objects;
drop policy if exists "stock_evidence_admin_delete" on storage.objects;

-- Remove evidence, ingredient, recipe, and stock-in runtime objects.
drop trigger if exists stock_in_evidence_audit on public.stock_in_receipts;
drop function if exists public.audit_stock_in_evidence();
drop function if exists public.record_ingredient_stock_in(
  text, text, timestamptz, text, text, text, text, jsonb
);

drop table if exists public.ingredient_movements;
drop table if exists public.stock_in_items;
drop table if exists public.stock_in_receipts;
drop table if exists public.product_recipe;
drop table if exists public.ingredient_inventory;
drop table if exists public.ingredient;

-- The legacy finished-product stock mutation is also retired. Historical
-- inventory rows remain readable in the database but are not a runtime input.
drop function if exists public.adjust_stock(bigint, integer, text);

-- Remove the legacy reorder workflow while retaining unrelated historical
-- finished-product inventory tables for migration compatibility.
drop trigger if exists trg_check_reorder_level on public.inventory;
drop function if exists public.check_reorder_level();
drop trigger if exists trg_touch_reorder_updated_at on public.reorder_requests;
drop function if exists public.touch_reorder_updated_at();
drop table if exists public.reorder_requests;
alter table public.inventory drop column if exists par_level;

-- The product value is the Admin-managed default. Daily rows snapshot that
-- value and may be changed for one Manila business date by Admin or Cashier.
alter table public.product
  rename column default_daily_quota to daily_quota_limit;
alter table public.product
  alter column daily_quota_limit drop not null,
  alter column daily_quota_limit drop default;
alter table public.product
  drop constraint if exists product_default_daily_quota_nonnegative;
alter table public.product
  add constraint product_daily_quota_limit_nonnegative
  check (daily_quota_limit is null or daily_quota_limit >= 0);

alter table public.daily_product_quotas
  rename column daily_quota to daily_quota_limit;
alter table public.daily_product_quotas
  alter column initial_quota drop not null,
  alter column daily_quota_limit drop not null;
alter table public.daily_product_quotas
  drop constraint if exists daily_product_quotas_initial_quota_check,
  drop constraint if exists daily_product_quotas_daily_quota_check;
alter table public.daily_product_quotas
  add constraint daily_product_quotas_initial_quota_nonnegative
    check (initial_quota is null or initial_quota >= 0),
  add constraint daily_product_quotas_limit_nonnegative
    check (daily_quota_limit is null or daily_quota_limit >= 0);

alter table public.quota_changes
  alter column previous_quota drop not null,
  alter column new_quota drop not null;

create index if not exists transactions_completed_date_idx
  on public.transactions(date, id) where status = 'completed';
create index if not exists transaction_items_product_transaction_idx
  on public.transaction_items(product_id, transaction_id);

create or replace function public.ensure_daily_product_quotas(
  p_business_date date default public.business_date()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := get_app_role();
begin
  if v_role not in ('admin', 'cashier') then
    raise exception 'Not authorized';
  end if;

  with inserted as (
    insert into daily_product_quotas
      (product_id, business_date, initial_quota, daily_quota_limit,
       created_by, updated_by)
    select product_id, p_business_date, daily_quota_limit, daily_quota_limit,
           auth.uid(), auth.uid()
    from product
    where is_available
    on conflict (product_id, business_date) do nothing
    returning product_id, daily_quota_limit
  )
  insert into audit_log(
    event_type, entity_type, entity_id, actor_id, actor_role, details
  )
  select 'daily_quota_created', 'product', product_id::text,
         auth.uid(), v_role,
         jsonb_build_object(
           'business_date', p_business_date,
           'quota_limit', daily_quota_limit
         )
  from inserted;
end;
$$;

revoke all on function public.ensure_daily_product_quotas(date) from public;
grant execute on function public.ensure_daily_product_quotas(date) to authenticated;

drop function if exists public.get_today_product_quotas();
create or replace function public.get_today_product_quotas()
returns table (
  product_id bigint,
  product_name text,
  default_quota_limit integer,
  today_quota_limit integer,
  sold_quantity integer,
  remaining_quantity integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := business_date();
  v_start timestamptz := v_day::timestamp at time zone 'Asia/Manila';
  v_end timestamptz := (v_day + 1)::timestamp at time zone 'Asia/Manila';
begin
  if get_app_role() not in ('admin', 'cashier') then
    raise exception 'Not authorized';
  end if;

  perform ensure_daily_product_quotas(v_day);

  return query
    select
      p.product_id,
      p.name,
      p.daily_quota_limit,
      q.daily_quota_limit,
      coalesce(s.sold, 0)::integer,
      case
        when q.daily_quota_limit is null then null
        else greatest(q.daily_quota_limit - coalesce(s.sold, 0), 0)::integer
      end
    from product p
    join daily_product_quotas q
      on q.product_id = p.product_id and q.business_date = v_day
    left join (
      select ti.product_id, sum(ti.quantity)::integer as sold
      from transaction_items ti
      join transactions t on t.id = ti.transaction_id
      where t.status = 'completed'
        and t.date >= v_start
        and t.date < v_end
      group by ti.product_id
    ) s on s.product_id = p.product_id
    where p.is_available
    order by p.name;
end;
$$;

revoke all on function public.get_today_product_quotas() from public;
grant execute on function public.get_today_product_quotas() to authenticated;

create or replace function public.set_today_product_quota(
  p_product_id bigint,
  p_new_quota integer,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := get_app_role();
  v_day date := business_date();
  v_start timestamptz := v_day::timestamp at time zone 'Asia/Manila';
  v_end timestamptz := (v_day + 1)::timestamp at time zone 'Asia/Manila';
  v_old integer;
  v_sold integer;
begin
  if v_role not in ('admin', 'cashier') then
    raise exception 'Not authorized';
  end if;
  if p_new_quota is not null and p_new_quota < 0 then
    raise exception 'Daily quota cannot be negative';
  end if;

  perform ensure_daily_product_quotas(v_day);
  select daily_quota_limit
    into v_old
    from daily_product_quotas
    where product_id = p_product_id and business_date = v_day
    for update;
  if not found then
    raise exception 'Product quota not found';
  end if;

  select coalesce(sum(ti.quantity), 0)::integer
    into v_sold
    from transaction_items ti
    join transactions t on t.id = ti.transaction_id
    where ti.product_id = p_product_id
      and t.status = 'completed'
      and t.date >= v_start
      and t.date < v_end;

  if p_new_quota is not null and p_new_quota < v_sold then
    raise exception
      'Daily quota cannot be lower than the quantity already sold. Minimum valid quota: %',
      v_sold;
  end if;
  if v_old is not distinct from p_new_quota then
    return;
  end if;

  update daily_product_quotas
    set daily_quota_limit = p_new_quota,
        updated_by = auth.uid(),
        updated_at = now()
    where product_id = p_product_id and business_date = v_day;

  insert into quota_changes(
    product_id, business_date, previous_quota, new_quota,
    changed_by, changed_by_role, reason
  )
  values (
    p_product_id, v_day, v_old, p_new_quota,
    auth.uid(), v_role, nullif(trim(p_reason), '')
  );

  insert into audit_log(
    event_type, entity_type, entity_id, actor_id, actor_role, details
  )
  values (
    'today_quota_changed', 'daily_product_quota', p_product_id::text,
    auth.uid(), v_role,
    jsonb_build_object(
      'business_date', v_day,
      'old_quota_limit', v_old,
      'new_quota_limit', p_new_quota,
      'reason', nullif(trim(p_reason), '')
    )
  );
end;
$$;

revoke all on function public.set_today_product_quota(bigint, integer, text) from public;
grant execute on function public.set_today_product_quota(bigint, integer, text) to authenticated;

create or replace function public.set_default_product_quota(
  p_product_id bigint,
  p_new_quota integer,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old integer;
begin
  if get_app_role() <> 'admin' then
    raise exception 'Admin only';
  end if;
  if p_new_quota is not null and p_new_quota < 0 then
    raise exception 'Default quota cannot be negative';
  end if;

  select daily_quota_limit
    into v_old
    from product
    where product_id = p_product_id
    for update;
  if not found then
    raise exception 'Product not found';
  end if;
  if v_old is not distinct from p_new_quota then
    return;
  end if;

  update product
    set daily_quota_limit = p_new_quota
    where product_id = p_product_id;

  insert into audit_log(
    event_type, entity_type, entity_id, actor_id, actor_role, details
  )
  values (
    'default_quota_changed', 'product', p_product_id::text,
    auth.uid(), 'admin',
    jsonb_build_object(
      'old_quota_limit', v_old,
      'new_quota_limit', p_new_quota,
      'reason', nullif(trim(p_reason), '')
    )
  );
end;
$$;

revoke all on function public.set_default_product_quota(bigint, integer, text) from public;
grant execute on function public.set_default_product_quota(bigint, integer, text) to authenticated;

-- Lock each product and today's quota row in product-id order before checking
-- completed sales. Concurrent attempts for the final unit therefore serialize.
create or replace function public.process_sale(
  p_transaction_id uuid,
  p_payment_mode text,
  p_amount_received numeric,
  p_change_given numeric,
  p_items jsonb,
  p_date timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := get_app_role();
  v_total numeric := 0;
  v_day date := business_date(p_date);
  v_start timestamptz := v_day::timestamp at time zone 'Asia/Manila';
  v_end timestamptz := (v_day + 1)::timestamp at time zone 'Asia/Manila';
  v_order_no integer;
  v_line record;
  v_price numeric;
  v_quota integer;
  v_sold integer;
begin
  if v_role not in ('admin', 'cashier') then
    raise exception 'Not authenticated';
  end if;
  if p_payment_mode not in ('cash', 'gcash', 'maya') then
    raise exception 'Unknown payment method';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;
  if exists (select 1 from transactions where id = p_transaction_id) then
    return p_transaction_id;
  end if;

  perform ensure_daily_product_quotas(v_day);

  for v_line in
    select
      (item->>'product_id')::bigint as product_id,
      sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item
    group by (item->>'product_id')::bigint
    order by (item->>'product_id')::bigint
  loop
    if v_line.quantity <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;

    select p.price, q.daily_quota_limit
      into v_price, v_quota
      from product p
      join daily_product_quotas q
        on q.product_id = p.product_id and q.business_date = v_day
      where p.product_id = v_line.product_id and p.is_available
      for update of p, q;
    if not found then
      raise exception 'Product % not found or unavailable', v_line.product_id;
    end if;

    select coalesce(sum(ti.quantity), 0)::integer
      into v_sold
      from transaction_items ti
      join transactions t on t.id = ti.transaction_id
      where ti.product_id = v_line.product_id
        and t.status = 'completed'
        and t.date >= v_start
        and t.date < v_end;

    if v_quota is not null and v_sold + v_line.quantity > v_quota then
      raise exception 'Daily quota reached for product %', v_line.product_id;
    end if;
  end loop;

  insert into order_number_counter(day, last)
    values (v_day, 0)
    on conflict (day) do nothing;
  update order_number_counter
    set last = last + 1
    where day = v_day
    returning last into v_order_no;

  insert into transactions(
    id, user_id, total_amount, payment_mode, date, status,
    amount_received, change_given, order_number
  )
  values (
    p_transaction_id, v_user_id, 0, p_payment_mode, p_date, 'completed',
    p_amount_received, p_change_given, v_order_no
  );

  for v_line in
    select
      (item->>'product_id')::bigint as product_id,
      sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item
    group by (item->>'product_id')::bigint
    order by (item->>'product_id')::bigint
  loop
    select price into v_price
      from product where product_id = v_line.product_id;
    insert into transaction_items(
      id, transaction_id, product_id, quantity, subtotal
    )
    values (
      gen_random_uuid(), p_transaction_id, v_line.product_id,
      v_line.quantity, v_price * v_line.quantity
    );
    v_total := v_total + v_price * v_line.quantity;
  end loop;

  update transactions
    set total_amount = v_total
    where id = p_transaction_id;

  insert into audit_log(
    event_type, entity_type, entity_id, actor_id, actor_role, details
  )
  values (
    'product_sold', 'transaction', p_transaction_id::text,
    v_user_id, v_role,
    jsonb_build_object('business_date', v_day, 'total', v_total)
  );
  return p_transaction_id;
end;
$$;

revoke all on function public.process_sale(uuid, text, numeric, numeric, jsonb, timestamptz) from public;
grant execute on function public.process_sale(uuid, text, numeric, numeric, jsonb, timestamptz) to authenticated;

-- Availability is derived from completed sales, so changing the transaction
-- status is enough to restore quota after a void.
create or replace function public.void_sale(
  p_transaction_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := get_app_role();
  v_tx transactions%rowtype;
begin
  if v_role not in ('admin', 'cashier') then
    raise exception 'Not authorized';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'Void reason is required';
  end if;

  select * into v_tx
    from transactions
    where id = p_transaction_id
    for update;
  if v_tx.id is null then
    raise exception 'Transaction not found';
  end if;
  if v_tx.status = 'voided' then
    raise exception 'Transaction already voided';
  end if;
  if v_role <> 'admin' and v_tx.user_id <> auth.uid() then
    raise exception 'Not authorized to void this transaction';
  end if;

  update transactions
    set status = 'voided',
        void_reason = trim(p_reason),
        voided_by = auth.uid(),
        voided_at = now()
    where id = p_transaction_id;

  insert into audit_log(
    event_type, entity_type, entity_id, actor_id, actor_role, details
  )
  values (
    'product_sale_voided', 'transaction', p_transaction_id::text,
    auth.uid(), v_role,
    jsonb_build_object('reason', trim(p_reason), 'amount', v_tx.total_amount)
  );
end;
$$;

revoke all on function public.void_sale(uuid, text) from public;
grant execute on function public.void_sale(uuid, text) to authenticated;
