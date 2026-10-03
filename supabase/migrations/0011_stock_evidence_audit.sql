-- 0011_stock_evidence_audit.sql
-- Record a distinct audit event whenever a stock-in receipt carries private evidence.

create or replace function public.audit_stock_in_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if new.evidence_path is null then return new; end if;
  select role into v_role from public."user" where user_id = new.recorded_by;
  insert into public.audit_log(event_type, entity_type, entity_id, actor_id, actor_role, details)
  values ('stock_in_evidence_uploaded', 'stock_in_receipt', new.stock_in_id::text,
    new.recorded_by, v_role, jsonb_build_object('storage', 'private'));
  return new;
end;
$$;

drop trigger if exists stock_in_evidence_audit on public.stock_in_receipts;
create trigger stock_in_evidence_audit
  after insert on public.stock_in_receipts
  for each row execute function public.audit_stock_in_evidence();
