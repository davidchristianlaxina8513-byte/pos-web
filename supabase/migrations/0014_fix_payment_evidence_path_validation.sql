-- 0014_fix_payment_evidence_path_validation.sql
-- Fix the online-evidence object-path regex introduced in 0013. With
-- standard_conforming_strings enabled, the earlier pattern expected a literal
-- backslash before the file extension and rejected valid private object keys.

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
       or p_evidence_path !~ ('^' || v_user_id::text || '/[0-9a-f-]{36}/evidence\.(jpg|png|webp)$') then
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
