-- 0013_final_feature_completion.sql
-- Complete the quota-only POS with private online-payment evidence,
-- database-generated transaction numbers, payment review, and turnover
-- discrepancy enforcement. This is forward-only; prior migrations remain
-- unchanged for reproducible history.

alter table public.transactions
  add column if not exists transaction_number text,
  add column if not exists payment_reference text,
  add column if not exists payment_status text,
  add column if not exists payment_reviewed_by uuid references public."user"(user_id),
  add column if not exists payment_reviewed_at timestamptz,
  add column if not exists payment_review_note text;

-- Existing online rows predate the evidence workflow. Treat their historical
-- completed state as verified and cash as paid; all new online sales enter the
-- pending-verification state through process_sale below.
update public.transactions
set payment_status = case
  when payment_mode = 'cash' then 'paid'
  else 'verified'
end
where payment_status is null;

with numbered as (
  select id,
    to_char(date at time zone 'Asia/Manila', 'YYYYMMDD') as day_text,
    row_number() over (
      partition by (date at time zone 'Asia/Manila')::date
      order by date, id
    ) as day_number
  from public.transactions
  where transaction_number is null
)
update public.transactions t
set transaction_number = 'TXN-' || n.day_text || '-' || lpad(n.day_number::text, 5, '0')
from numbered n
where n.id = t.id;

alter table public.transactions
  alter column transaction_number set not null,
  alter column payment_status set not null,
  alter column payment_status set default 'paid';

alter table public.transactions
  drop constraint if exists transactions_payment_status_check,
  add constraint transactions_payment_status_check
    check (payment_status in ('paid', 'pending_verification', 'verified', 'rejected')),
  drop constraint if exists transactions_payment_reference_check,
  add constraint transactions_payment_reference_check
    check (
      payment_reference is null
      or payment_reference ~ '^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$'
    ),
  drop constraint if exists transactions_payment_consistency_check,
  add constraint transactions_payment_consistency_check
    check (
      (payment_mode = 'cash' and payment_status = 'paid' and payment_reference is null)
      or
      (payment_mode in ('gcash', 'maya') and payment_status in ('pending_verification', 'verified', 'rejected'))
    );

create unique index if not exists transactions_transaction_number_key
  on public.transactions(transaction_number);
create index if not exists transactions_payment_status_date_idx
  on public.transactions(payment_status, date desc);

create table if not exists public.payment_evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique
    references public.transactions(id) on delete restrict,
  transaction_number text not null,
  object_path text not null unique,
  uploaded_by uuid not null references public."user"(user_id),
  uploaded_at timestamptz not null default now(),
  payment_method text not null check (payment_method in ('gcash', 'maya')),
  reference_number text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 5242880),
  evidence_status text not null default 'submitted'
    check (evidence_status in ('submitted', 'verified', 'rejected'))
);

alter table public.payment_evidence enable row level security;

drop policy if exists "payment_evidence_admin_read" on public.payment_evidence;
create policy "payment_evidence_admin_read" on public.payment_evidence
  for select to authenticated
  using (public.get_app_role() = 'admin');

drop policy if exists "payment_evidence_own_read" on public.payment_evidence;
create policy "payment_evidence_own_read" on public.payment_evidence
  for select to authenticated
  using (
    public.get_app_role() = 'cashier'
    and uploaded_by = auth.uid()
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-evidence', 'payment-evidence', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_evidence_object_read" on storage.objects;
create policy "payment_evidence_object_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-evidence'
    and (
      public.get_app_role() = 'admin'
      or (
        public.get_app_role() = 'cashier'
        and owner_id = auth.uid()::text
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    )
  );

drop policy if exists "payment_evidence_object_insert" on storage.objects;
create policy "payment_evidence_object_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-evidence'
    and public.get_app_role() in ('admin', 'cashier')
    and owner_id = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "payment_evidence_object_delete" on storage.objects;
create policy "payment_evidence_object_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-evidence'
    and (
      public.get_app_role() = 'admin'
      or (
        owner_id = auth.uid()::text
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    )
  );

-- Remove the former six-argument entry point. Keeping it executable would let
-- an online sale omit its reference and evidence.
drop function if exists public.process_sale(uuid, text, numeric, numeric, jsonb, timestamptz);

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
    if p_evidence_path is null
       or p_evidence_path !~ ('^' || v_user_id::text || '/[0-9a-f-]{36}/evidence\\.(jpg|png|webp)$') then
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

  insert into transactions(
    id, user_id, total_amount, payment_mode, date, status,
    amount_received, change_given, order_number, transaction_number,
    payment_reference, payment_status
  ) values (
    p_transaction_id, v_user_id, 0, p_payment_mode, p_date, 'completed',
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
    insert into payment_evidence(
      transaction_id, transaction_number, object_path, uploaded_by,
      payment_method, reference_number, mime_type, file_size
    ) values (
      p_transaction_id, v_transaction_number, p_evidence_path, v_user_id,
      p_payment_mode, v_reference, p_evidence_mime, p_evidence_size
    );
    insert into audit_log(
      event_type, entity_type, entity_id, actor_id, actor_role, details
    ) values (
      'online_payment_evidence_submitted', 'transaction', p_transaction_id::text,
      v_user_id, v_role,
      jsonb_build_object(
        'transaction_number', v_transaction_number,
        'payment_method', p_payment_mode,
        'evidence', 'private'
      )
    );
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
      'payment_status', case when p_payment_mode = 'cash' then 'paid' else 'pending_verification' end
    )
  );
  return p_transaction_id;
end;
$$;

revoke all on function public.process_sale(uuid, text, numeric, numeric, jsonb, timestamptz, text, text, text, integer) from public;
grant execute on function public.process_sale(uuid, text, numeric, numeric, jsonb, timestamptz, text, text, text, integer) to authenticated;

create or replace function public.review_online_payment(
  p_transaction_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
begin
  if get_app_role() <> 'admin' then raise exception 'Admin only'; end if;
  if p_status not in ('verified', 'rejected') then
    raise exception 'Invalid payment review status';
  end if;
  select * into v_tx from public.transactions
    where id = p_transaction_id for update;
  if v_tx.id is null then raise exception 'Transaction not found'; end if;
  if v_tx.payment_mode = 'cash' then raise exception 'Cash payments do not require review'; end if;
  if v_tx.status = 'voided' then raise exception 'Voided transactions cannot be reviewed'; end if;
  if v_tx.payment_status <> 'pending_verification' then
    raise exception 'Online payment has already been reviewed';
  end if;
  if p_status = 'rejected' and nullif(trim(p_note), '') is null then
    raise exception 'A rejection reason is required';
  end if;

  update public.transactions
    set payment_status = p_status,
        payment_reviewed_by = auth.uid(),
        payment_reviewed_at = now(),
        payment_review_note = nullif(trim(p_note), '')
    where id = p_transaction_id;
  update public.payment_evidence set evidence_status = p_status
    where transaction_id = p_transaction_id;
  insert into public.audit_log(
    event_type, entity_type, entity_id, actor_id, actor_role, details
  ) values (
    case when p_status = 'verified' then 'online_payment_verified' else 'online_payment_rejected' end,
    'transaction', p_transaction_id::text, auth.uid(), 'admin',
    jsonb_build_object(
      'transaction_number', v_tx.transaction_number,
      'note', nullif(trim(p_note), '')
    )
  );
end;
$$;

revoke all on function public.review_online_payment(uuid, text, text) from public;
grant execute on function public.review_online_payment(uuid, text, text) to authenticated;

-- Cash turnover is always based on completed cash transactions. Require an
-- explanation whenever the counted cash differs from the server total.
create or replace function public.submit_cash_turnover(
  p_shift_id uuid, p_counted_cash numeric, p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift cashier_shifts%rowtype;
  v_cash_sales numeric := 0;
  v_expected numeric;
  v_variance numeric;
  v_id uuid := gen_random_uuid();
begin
  if get_app_role() <> 'cashier' then raise exception 'Cashier only'; end if;
  if p_counted_cash < 0 then raise exception 'Counted cash cannot be negative'; end if;
  select * into v_shift from cashier_shifts where shift_id = p_shift_id for update;
  if v_shift.user_id <> auth.uid() or v_shift.status <> 'open' then
    raise exception 'Open shift not found';
  end if;
  select coalesce(sum(total_amount), 0) into v_cash_sales from transactions
    where user_id = auth.uid() and payment_mode = 'cash' and status = 'completed'
      and date >= v_shift.started_at and date <= now();
  v_expected := v_shift.starting_cash + v_cash_sales;
  v_variance := p_counted_cash - v_expected;
  if v_variance <> 0 and nullif(trim(p_notes), '') is null then
    raise exception 'A discrepancy reason is required';
  end if;
  insert into cash_turnovers(
    turnover_id, shift_id, submitted_by, starting_cash, cash_sales,
    expected_cash, counted_cash, variance, notes
  ) values (
    v_id, p_shift_id, auth.uid(), v_shift.starting_cash, v_cash_sales,
    v_expected, p_counted_cash, v_variance, nullif(trim(p_notes), '')
  );
  update cashier_shifts set status = 'closed', ended_at = now()
    where shift_id = p_shift_id;
  insert into audit_log(event_type, entity_type, entity_id, actor_id, actor_role, details)
    values (
      'cash_turnover_submitted', 'cash_turnover', v_id::text, auth.uid(), 'cashier',
      jsonb_build_object(
        'shift_id', p_shift_id, 'expected_cash', v_expected,
        'counted_cash', p_counted_cash, 'variance', v_variance,
        'discrepancy_reason', nullif(trim(p_notes), '')
      )
    );
  return v_id;
end;
$$;

revoke all on function public.submit_cash_turnover(uuid, numeric, text) from public;
grant execute on function public.submit_cash_turnover(uuid, numeric, text) to authenticated;
