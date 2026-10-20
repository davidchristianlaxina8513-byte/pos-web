-- 0015_order_fulfillment_and_cart_autosave.sql
-- 1. Void at transaction level restricted to managers/admins
-- 2. Order status transitions (pending -> preparing -> ready -> completed / cancelled / voided)
-- 3. Cart autosave persistence table
-- 4. Shift recovery and terminal persistence

-- 1. Ensure transactions status constraint supports fulfillment statuses
alter table public.transactions
  drop constraint if exists transactions_status_check;

alter table public.transactions
  add constraint transactions_status_check
    check (status in ('pending', 'preparing', 'ready', 'completed', 'cancelled', 'voided'));

-- Ensure void columns exist
alter table public.transactions
  add column if not exists void_reason text,
  add column if not exists voided_by uuid references public."user"(user_id),
  add column if not exists voided_at timestamptz;

-- 2. Cart drafts table for resilient autosave
create table if not exists public.cart_drafts (
  id uuid primary key,
  user_id uuid not null references public."user"(user_id) on delete cascade,
  lines jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.cart_drafts enable row level security;

drop policy if exists "cart_drafts_manage_own" on public.cart_drafts;
create policy "cart_drafts_manage_own" on public.cart_drafts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. Cashier shifts terminal column
alter table public.cashier_shifts
  add column if not exists terminal_id text not null default 'default';

-- Ensure unique index preventing two open shifts for the same cashier
create unique index if not exists cashier_one_open_shift
  on public.cashier_shifts(user_id) where status = 'open';

-- 4. Update process_sale: newly created orders enter as 'pending'
create or replace function public.process_sale(
  p_transaction_id uuid,
  p_payment_mode text,
  p_amount_received numeric,
  p_change_given numeric,
  p_items jsonb,
  p_date timestamptz,
  p_payment_reference text default null,
  p_evidence_path text default null,
  p_evidence_mime text default null,
  p_evidence_size integer default null
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
  v_transaction_number text;
  v_line record;
  v_price numeric;
  v_quota integer;
  v_sold integer;
  v_reference text := nullif(trim(p_payment_reference), '');
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

  -- Idempotency check: if transaction already exists, return cleanly
  if exists (select 1 from transactions where id = p_transaction_id) then
    return p_transaction_id;
  end if;

  if p_payment_mode = 'cash' then
    if v_reference is not null or p_evidence_path is not null then
      raise exception 'Cash payment cannot include online payment evidence';
    end if;
  else
    if v_reference is null or v_reference !~ '^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$' then
      raise exception 'A valid online transaction reference is required';
    end if;
    if p_evidence_path is not null then
      if p_evidence_path !~ ('^' || v_user_id::text || '/[0-9a-f-]{36}/evidence\.(jpg|png|webp)$') then
        raise exception 'Valid payment evidence is required';
      end if;
      if p_evidence_mime not in ('image/jpeg', 'image/png', 'image/webp')
         or p_evidence_size is null or p_evidence_size <= 0 or p_evidence_size > 5242880 then
        raise exception 'Payment evidence type or size is invalid';
      end if;
      if not exists (
        select 1 from storage.objects
        where bucket_id = 'payment-evidence'
          and name = p_evidence_path
          and owner_id = v_user_id::text
      ) then
        raise exception 'Payment evidence upload was not found';
      end if;
    end if;
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
    -- Count all non-voided, non-cancelled orders for today
    select coalesce(sum(ti.quantity), 0)::integer
      into v_sold
      from transaction_items ti
      join transactions t on t.id = ti.transaction_id
      where ti.product_id = v_line.product_id
        and t.status not in ('voided', 'cancelled')
        and t.date >= v_start and t.date < v_end;
    if v_quota is not null and v_sold + v_line.quantity > v_quota then
      raise exception 'Daily quota reached for product %', v_line.product_id;
    end if;
  end loop;

  insert into order_number_counter(day, last) values (v_day, 0)
    on conflict (day) do nothing;
  update order_number_counter set last = last + 1
    where day = v_day returning last into v_order_no;
  v_transaction_number := 'TXN-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_order_no::text, 5, '0');

  -- Initial status is 'preparing' (auto-started upon payment completion)
  insert into transactions(
    id, user_id, total_amount, payment_mode, date, status,
    amount_received, change_given, order_number, transaction_number,
    payment_reference, payment_status
  ) values (
    p_transaction_id, v_user_id, 0, p_payment_mode, p_date, 'preparing',
    p_amount_received, p_change_given, v_order_no, v_transaction_number,
    case when p_payment_mode = 'cash' then null else v_reference end,
    case when p_payment_mode = 'cash' then 'paid' else 'pending_verification' end
  );

  for v_line in
    select
      (item->>'product_id')::bigint as product_id,
      sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item
    group by (item->>'product_id')::bigint
    order by (item->>'product_id')::bigint
  loop
    select price into v_price from product where product_id = v_line.product_id;
    insert into transaction_items(id, transaction_id, product_id, quantity, subtotal)
    values (gen_random_uuid(), p_transaction_id, v_line.product_id,
            v_line.quantity, v_price * v_line.quantity);
    v_total := v_total + v_price * v_line.quantity;
  end loop;

  if p_payment_mode = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Amount received is less than the sale total';
    end if;
    update transactions
      set total_amount = v_total,
          change_given = p_amount_received - v_total
      where id = p_transaction_id;
  else
    update transactions
      set total_amount = v_total, amount_received = null, change_given = null
      where id = p_transaction_id;
    if p_evidence_path is not null then
      insert into payment_evidence(
        transaction_id, transaction_number, object_path, uploaded_by,
        payment_method, reference_number, mime_type, file_size
      ) values (
        p_transaction_id, v_transaction_number, p_evidence_path, v_user_id,
        p_payment_mode, v_reference, p_evidence_mime, p_evidence_size
      );
    end if;
  end if;

  insert into audit_log(
    event_type, entity_type, entity_id, actor_id, actor_role, details
  ) values (
    'product_sold', 'transaction', p_transaction_id::text,
    v_user_id, v_role,
    jsonb_build_object(
      'business_date', v_day,
      'transaction_number', v_transaction_number,
      'total', v_total,
      'order_status', 'preparing',
      'payment_status', case when p_payment_mode = 'cash' then 'paid' else 'pending_verification' end
    )
  );
  return p_transaction_id;
end;
$$;

revoke all on function public.process_sale(uuid, text, numeric, numeric, jsonb, timestamptz, text, text, text, integer) from public;
grant execute on function public.process_sale(uuid, text, numeric, numeric, jsonb, timestamptz, text, text, text, integer) to authenticated;

-- 5. Order fulfillment state transitions RPC
create or replace function public.update_order_status(
  p_transaction_id uuid,
  p_new_status text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := get_app_role();
  v_user_id uuid := auth.uid();
  v_tx transactions%rowtype;
begin
  if v_role not in ('admin', 'cashier') then
    raise exception 'Not authorized to update order status';
  end if;

  if p_new_status not in ('pending', 'preparing', 'ready', 'completed', 'cancelled') then
    raise exception 'Invalid order status transition';
  end if;

  select * into v_tx
    from transactions
    where id = p_transaction_id
    for update;

  if v_tx.id is null then
    raise exception 'Order not found';
  end if;

  if v_tx.status = 'voided' then
    raise exception 'Cannot update status of a voided transaction';
  end if;

  if v_tx.status = 'cancelled' then
    raise exception 'Cannot update status of a cancelled order';
  end if;

  -- Validate allowed transitions
  if v_tx.status = 'completed' and p_new_status <> 'completed' then
    raise exception 'Completed orders cannot be transitioned backward';
  end if;

  update transactions
    set status = p_new_status
    where id = p_transaction_id;

  insert into audit_log(
    event_type, entity_type, entity_id, actor_id, actor_role, details
  ) values (
    'order_status_updated', 'transaction', p_transaction_id::text,
    v_user_id, v_role,
    jsonb_build_object(
      'previous_status', v_tx.status,
      'new_status', p_new_status,
      'notes', p_notes
    )
  );
end;
$$;

revoke all on function public.update_order_status(uuid, text, text) from public;
grant execute on function public.update_order_status(uuid, text, text) to authenticated;

-- 6. Restrict void_sale to manager/admin role only
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
  -- Only admin / manager role can void transactions
  if v_role <> 'admin' then
    raise exception 'Only managers or supervisors are authorized to void transactions';
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

-- 7. Update get_today_product_quotas to count active orders (not voided or cancelled)
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
      where t.status not in ('voided', 'cancelled')
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

-- 8. Update submit_cash_turnover to include all non-voided, non-cancelled cash sales
create or replace function public.submit_cash_turnover(
  p_shift_id uuid, p_counted_cash numeric, p_notes text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_shift cashier_shifts%rowtype;
  v_cash_sales numeric := 0;
  v_expected numeric;
  v_id uuid := gen_random_uuid();
begin
  if get_app_role() <> 'cashier' then raise exception 'Cashier only'; end if;
  if p_counted_cash < 0 then raise exception 'Counted cash cannot be negative'; end if;
  select * into v_shift from cashier_shifts where shift_id = p_shift_id for update;
  if v_shift.user_id <> auth.uid() or v_shift.status <> 'open' then raise exception 'Open shift not found'; end if;
  select coalesce(sum(total_amount), 0) into v_cash_sales from transactions
    where user_id = auth.uid() and payment_mode = 'cash' and status not in ('voided', 'cancelled')
      and date >= v_shift.started_at and date <= now();
  v_expected := v_shift.starting_cash + v_cash_sales;
  insert into cash_turnovers(turnover_id, shift_id, submitted_by, starting_cash,
    cash_sales, expected_cash, counted_cash, variance, notes)
  values (v_id, p_shift_id, auth.uid(), v_shift.starting_cash, v_cash_sales,
    v_expected, p_counted_cash, p_counted_cash - v_expected, nullif(trim(p_notes), ''));
  update cashier_shifts set status = 'closed', ended_at = now() where shift_id = p_shift_id;
  insert into audit_log(event_type, entity_type, entity_id, actor_id, actor_role, details)
    values ('cash_turnover_submitted', 'cash_turnover', v_id::text, auth.uid(), 'cashier',
      jsonb_build_object('shift_id', p_shift_id, 'expected_cash', v_expected,
        'counted_cash', p_counted_cash, 'variance', p_counted_cash - v_expected));
  return v_id;
end;
$$;

revoke all on function public.submit_cash_turnover(uuid, numeric, text) from public;
grant execute on function public.submit_cash_turnover(uuid, numeric, text) to authenticated;

